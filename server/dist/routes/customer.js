"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
/**
 * 构建用户相关工单的客户名称过滤条件
 */
const buildUserRelatedCustomerNames = async (user) => {
    // 管理员/审计可以看所有
    if ((0, types_1.hasManagementRole)(user)) {
        return null; // null 表示不过滤
    }
    // 技术员：看分配给自己的工单的客户
    if ((0, types_1.isTechnician)(user)) {
        const orders = await utils_1.prisma.workOrder.findMany({
            where: {
                technicians: {
                    some: { technicianId: user.id },
                },
            },
            select: { customerName: true },
            distinct: ['customerName'],
        });
        return orders.map(o => o.customerName);
    }
    // 销售：看自己提交或关联的工单的客户
    if ((0, types_1.isSales)(user)) {
        const orders = await utils_1.prisma.workOrder.findMany({
            where: {
                OR: [
                    { submitterId: user.id },
                    { relatedSalesId: user.id },
                ],
            },
            select: { customerName: true },
            distinct: ['customerName'],
        });
        return orders.map(o => o.customerName);
    }
    return []; // 无权限返回空数组
};
// 客户列表（分页）
router.get('/', async (req, res, next) => {
    try {
        const { page = '1', pageSize = '20', keyword } = req.query;
        const pageNum = parseInt(page, 10);
        const size = parseInt(pageSize, 10);
        const user = req.user;
        // 无权限用户返回空列表
        if ((0, types_1.hasNoPermission)(user)) {
            return (0, utils_1.paginate)(res, [], 0, pageNum, size);
        }
        const where = {};
        // 获取用户可访问的客户名称列表
        const allowedCustomerNames = await buildUserRelatedCustomerNames(user);
        if (allowedCustomerNames !== null) {
            if (allowedCustomerNames.length === 0) {
                return (0, utils_1.paginate)(res, [], 0, pageNum, size);
            }
            where.name = { in: allowedCustomerNames };
        }
        if (keyword) {
            where.AND = [
                ...(where.name ? [{ name: where.name }] : []),
                {
                    OR: [
                        { name: { contains: keyword } },
                        { contactPerson: { contains: keyword } },
                        { contactPhone: { contains: keyword } },
                    ],
                },
            ];
            delete where.name;
        }
        const [customers, total] = await Promise.all([
            utils_1.prisma.customerRecord.findMany({
                where,
                orderBy: [
                    { usageCount: 'desc' }, // 按使用次数排序
                    { updatedAt: 'desc' }, // 按更新时间排序
                ],
                skip: (pageNum - 1) * size,
                take: size,
            }),
            utils_1.prisma.customerRecord.count({ where }),
        ]);
        // 批量查询每个客户的工单数量
        const customerNames = customers.map(c => c.name);
        const orderCounts = await utils_1.prisma.workOrder.groupBy({
            by: ['customerName'],
            where: {
                customerName: { in: customerNames },
            },
            _count: {
                id: true,
            },
        });
        // 创建客户名称到工单数量的映射
        const orderCountMap = new Map(orderCounts.map(item => [item.customerName, item._count.id]));
        // 为每个客户添加工单数量
        const customersWithOrders = customers.map(customer => ({
            ...customer,
            orderCount: orderCountMap.get(customer.name) || 0,
        }));
        (0, utils_1.paginate)(res, customersWithOrders, total, pageNum, size);
    }
    catch (error) {
        next(error);
    }
});
// 客户联想搜索（用于输入框）- 必须在 /:id 之前
router.get('/search/autocomplete', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return (0, utils_1.success)(res, []);
        }
        const customers = await utils_1.prisma.customerRecord.findMany({
            where: {
                OR: [
                    { name: { contains: keyword } },
                    { contactPerson: { contains: keyword } },
                ],
            },
            orderBy: [
                { usageCount: 'desc' },
                { updatedAt: 'desc' },
            ],
            take: 10, // 最多返回10条
        });
        (0, utils_1.success)(res, customers);
    }
    catch (error) {
        next(error);
    }
});
// 客户详情
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        // 无权限用户返回错误
        if ((0, types_1.hasNoPermission)(user)) {
            throw new middlewares_1.ApiError('权限不足', 403);
        }
        const customer = await utils_1.prisma.customerRecord.findUnique({
            where: { id },
        });
        if (!customer) {
            throw new middlewares_1.ApiError('客户不存在', 404);
        }
        // 检查用户是否有权限查看该客户
        const allowedCustomerNames = await buildUserRelatedCustomerNames(user);
        if (allowedCustomerNames !== null && !allowedCustomerNames.includes(customer.name)) {
            throw new middlewares_1.ApiError('权限不足', 403);
        }
        const [allOrderCount, workOrders] = await Promise.all([
            utils_1.prisma.workOrder.count({
                where: { customerName: customer.name },
            }),
            utils_1.prisma.workOrder.findMany({
                where: { customerName: customer.name },
                include: {
                    technicians: {
                        include: {
                            technician: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 10, // 最多显示10个最近工单
            }),
        ]);
        // 格式化工单数据
        const formattedOrders = workOrders.map(order => ({
            ...order,
            technicianList: order.technicians.map(t => t.technician),
        }));
        // 统计数据
        const statistics = {
            totalOrders: allOrderCount,
            recentOrders: formattedOrders.length,
            hasMoreOrders: allOrderCount > formattedOrders.length,
            totalHours: 0, // TODO: 根据实际需求计算工时
        };
        (0, utils_1.success)(res, {
            ...customer,
            // recentWorkOrders 用于区分最近 N 条
            recentWorkOrders: formattedOrders,
            // workOrders 字段保留，向后兼容现有前端（展示最近工单）
            workOrders: formattedOrders,
            statistics,
        });
    }
    catch (error) {
        next(error);
    }
});
// 创建客户
router.post('/', async (req, res, next) => {
    try {
        const { name, contactPerson, contactPhone } = req.body;
        if (!name) {
            throw new middlewares_1.ApiError('客户名称不能为空', 400);
        }
        // 检查是否已存在
        const existing = await utils_1.prisma.customerRecord.findUnique({
            where: { name },
        });
        if (existing) {
            throw new middlewares_1.ApiError('客户已存在', 400);
        }
        const customer = await utils_1.prisma.customerRecord.create({
            data: {
                name,
                contactPerson,
                contactPhone,
            },
        });
        (0, utils_1.success)(res, customer, '创建成功');
    }
    catch (error) {
        next(error);
    }
});
// 更新客户
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, contactPerson, contactPhone } = req.body;
        const existing = await utils_1.prisma.customerRecord.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new middlewares_1.ApiError('客户不存在', 404);
        }
        // 如果修改了名称，检查新名称是否已存在
        if (name && name !== existing.name) {
            const duplicate = await utils_1.prisma.customerRecord.findUnique({
                where: { name },
            });
            if (duplicate) {
                throw new middlewares_1.ApiError('客户名称已存在', 400);
            }
        }
        const customer = await utils_1.prisma.customerRecord.update({
            where: { id },
            data: {
                name,
                contactPerson,
                contactPhone,
            },
        });
        (0, utils_1.success)(res, customer, '更新成功');
    }
    catch (error) {
        next(error);
    }
});
// 删除客户
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await utils_1.prisma.customerRecord.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new middlewares_1.ApiError('客户不存在', 404);
        }
        await utils_1.prisma.customerRecord.delete({
            where: { id },
        });
        (0, utils_1.success)(res, null, '删除成功');
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=customer.js.map