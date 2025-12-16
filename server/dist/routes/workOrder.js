"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const messageService_1 = require("../feishu/messageService");
const approvalService_1 = require("../feishu/approvalService");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const log = (0, utils_1.createModuleLogger)(utils_1.LogModule.WORK_ORDER);
router.use(middlewares_1.authenticate);
// 定义可查看工单的角色（不包括 OTHER）
const canViewOrders = [types_1.Role.SYSTEM_ADMIN, types_1.Role.ADMIN, types_1.Role.SALES, types_1.Role.TECHNICIAN, types_1.Role.AUDITOR];
// 定义可管理工单的角色（不包括 AUDITOR 和 OTHER）
const canManageOrders = [types_1.Role.SYSTEM_ADMIN, types_1.Role.ADMIN, types_1.Role.SALES, types_1.Role.TECHNICIAN];
/**
 * 检查用户是否有权操作指定工单
 * - 管理员角色可操作所有工单
 * - 非管理员只能操作：自己提交的、自己是关联销售的、自己是被分配技术员的工单
 * @throws ApiError 如果用户无权限或工单不存在
 */
function ensureCanOperate(order, user) {
    if (!user) {
        throw middlewares_1.ApiError.unauthorized('请先登录');
    }
    if (!order) {
        throw middlewares_1.ApiError.notFound('工单不存在');
    }
    // 管理员可操作所有工单
    if ((0, types_1.hasManagementRole)(user)) {
        return;
    }
    const isSubmitter = order.submitterId === user.id;
    const isRelatedSales = order.relatedSalesId === user.id;
    const isTechnicianAssigned = order.technicians?.some(t => t.technicianId === user.id);
    if (!isSubmitter && !isRelatedSales && !isTechnicianAssigned) {
        throw middlewares_1.ApiError.forbidden('无权操作该工单');
    }
}
// 工单列表
router.get('/', (0, middlewares_1.authorize)(...canViewOrders), async (req, res, next) => {
    try {
        const { page = '1', pageSize = '20', status, orderType, priority, keyword, customer, technicianId } = req.query;
        const pageNum = parseInt(page, 10);
        const size = parseInt(pageSize, 10);
        const user = req.user;
        // 无权限用户返回空列表
        if ((0, types_1.hasNoPermission)(user)) {
            return (0, utils_1.paginate)(res, [], 0, pageNum, size);
        }
        const where = {};
        const andConditions = [];
        // 权限过滤：管理员/审计可以看所有，技术/销售只能看自己相关的
        if (!(0, types_1.hasManagementRole)(user)) {
            if ((0, types_1.isSales)(user)) {
                // 销售看自己提交的或关联的
                andConditions.push({
                    OR: [
                        { submitterId: user.id },
                        { relatedSalesId: user.id },
                    ],
                });
            }
            else if ((0, types_1.isTechnician)(user)) {
                // 技术员看分配给自己的
                andConditions.push({
                    technicians: {
                        some: { technicianId: user.id },
                    },
                });
            }
        }
        if (status)
            where.status = status;
        if (orderType)
            where.orderType = orderType;
        if (priority)
            where.priority = priority;
        const keywordValue = typeof keyword === 'string' ? keyword.trim() : '';
        if (keywordValue) {
            andConditions.push({
                OR: [
                    { orderNo: { contains: keywordValue, mode: 'insensitive' } },
                    { customerName: { contains: keywordValue, mode: 'insensitive' } },
                    { description: { contains: keywordValue, mode: 'insensitive' } },
                ],
            });
        }
        const customerKeyword = typeof customer === 'string' ? customer.trim() : '';
        if (customerKeyword) {
            andConditions.push({
                customerName: { contains: customerKeyword, mode: 'insensitive' },
            });
        }
        if (technicianId) {
            andConditions.push({
                technicians: {
                    some: { technicianId: technicianId },
                },
            });
        }
        if (andConditions.length > 0) {
            where.AND = andConditions;
        }
        const [orders, total] = await Promise.all([
            utils_1.prisma.workOrder.findMany({
                where,
                include: {
                    submitter: { select: { id: true, name: true } },
                    relatedSales: { select: { id: true, name: true } },
                    technicians: {
                        include: {
                            technician: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * size,
                take: size,
            }),
            utils_1.prisma.workOrder.count({ where }),
        ]);
        // 转换技术员格式
        const ordersWithTechnicians = orders.map(order => ({
            ...order,
            technicianList: order.technicians.map(t => t.technician),
        }));
        (0, utils_1.paginate)(res, ordersWithTechnicians, total, pageNum, size);
    }
    catch (error) {
        next(error);
    }
});
// 待处理工单
router.get('/pending', (0, middlewares_1.authorize)(...canViewOrders), async (req, res, next) => {
    try {
        const user = req.user;
        // 无权限用户返回空列表
        if ((0, types_1.hasNoPermission)(user)) {
            return (0, utils_1.success)(res, []);
        }
        const where = {
            status: { in: [types_1.OrderStatus.PENDING, types_1.OrderStatus.ACCEPTED, types_1.OrderStatus.IN_SERVICE] },
        };
        // 权限过滤：管理员/审计可以看所有，技术/销售只能看自己相关的
        if (!(0, types_1.hasManagementRole)(user)) {
            if ((0, types_1.isTechnician)(user)) {
                where.technicians = {
                    some: { technicianId: user.id },
                };
            }
            else if ((0, types_1.isSales)(user)) {
                where.OR = [
                    { submitterId: user.id },
                    { relatedSalesId: user.id },
                ];
            }
        }
        const orders = await utils_1.prisma.workOrder.findMany({
            where,
            include: {
                technicians: {
                    include: {
                        technician: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: [
                { priority: 'desc' }, // VERY_URGENT > URGENT > NORMAL
                { createdAt: 'asc' },
            ],
            take: 20,
        });
        (0, utils_1.success)(res, orders);
    }
    catch (error) {
        next(error);
    }
});
// 工单详情
router.get('/:id', (0, middlewares_1.authorize)(...canViewOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: {
                submitter: { select: { id: true, name: true, phone: true } },
                relatedSales: { select: { id: true, name: true, phone: true } },
                technicians: {
                    include: {
                        technician: { select: { id: true, name: true, phone: true } },
                    },
                },
                evaluation: true,
            },
        });
        // 检查权限
        ensureCanOperate(order, req.user);
        // 转换技术员格式
        const orderWithTechnicians = {
            ...order,
            technicianList: order.technicians.map(t => t.technician),
        };
        (0, utils_1.success)(res, orderWithTechnicians);
    }
    catch (error) {
        next(error);
    }
});
// 创建工单（AUDITOR 和 OTHER 不能创建）
router.post('/', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { orderType = types_1.OrderType.CF, 
        // 客户信息
        customerName, customerContact, customerPhone, 
        // 渠道信息（公司类型）
        hasChannel = false, channelName, channelContact, channelPhone, 
        // 厂家对接人（厂家类型）
        manufacturerContact, 
        // 关联销售（公司内勤，技术员提交时）
        relatedSalesId, 
        // 工单信息
        workType, priority = types_1.Priority.NORMAL, description, estimatedDate, estimatedPeriod, estimatedStartDate, estimatedStartPeriod, estimatedEndDate, estimatedEndPeriod, 
        // 技术人员（数组）
        technicianIds, } = req.body;
        const user = req.user;
        // 通用必填字段验证
        if (!customerName || !description || !technicianIds || technicianIds.length === 0) {
            throw middlewares_1.ApiError.badRequest('缺少必填字段：客户名称、工单描述、服务工程师');
        }
        // 公司类型需要工作类型
        if ((0, types_1.isCompanyOrder)(orderType) && !workType) {
            throw middlewares_1.ApiError.badRequest('公司工单需要选择工作类型');
        }
        // 厂家类型需要厂家对接人
        if ((0, types_1.isManufacturerOrder)(orderType) && !manufacturerContact) {
            throw middlewares_1.ApiError.badRequest('厂家工单需要填写厂家对接人');
        }
        // 公司内勤，技术员提交时需要关联销售
        if (orderType === types_1.OrderType.CO && user.role === types_1.Role.TECHNICIAN && !relatedSalesId) {
            throw middlewares_1.ApiError.badRequest('技术员提交公司内勤工单需要选择关联销售');
        }
        // 生成工单编号
        const orderNo = await (0, utils_1.generateOrderNo)(orderType);
        // 根据类型确定初始状态
        const isOffice = (0, types_1.isOfficeOrder)(orderType);
        const initialStatus = isOffice ? types_1.OrderStatus.IN_SERVICE : types_1.OrderStatus.PENDING;
        // 创建工单
        const order = await utils_1.prisma.workOrder.create({
            data: {
                orderNo,
                orderType,
                submitterId: user.id,
                relatedSalesId: orderType === types_1.OrderType.CO && user.role === types_1.Role.TECHNICIAN ? relatedSalesId : null,
                customerName,
                customerContact,
                customerPhone,
                hasChannel: (0, types_1.isCompanyOrder)(orderType) ? hasChannel : false,
                channelName: (0, types_1.isCompanyOrder)(orderType) && hasChannel ? channelName : null,
                channelContact: (0, types_1.isCompanyOrder)(orderType) && hasChannel ? channelContact : null,
                channelPhone: (0, types_1.isCompanyOrder)(orderType) && hasChannel ? channelPhone : null,
                manufacturerContact: (0, types_1.isManufacturerOrder)(orderType) ? manufacturerContact : null,
                workType: (0, types_1.isCompanyOrder)(orderType) ? workType : null,
                priority,
                description,
                status: initialStatus,
                estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
                estimatedPeriod,
                estimatedStartDate: estimatedStartDate ? buildDateTime(estimatedStartDate, estimatedStartPeriod, 'start') : null,
                estimatedStartPeriod,
                estimatedEndDate: estimatedEndDate ? buildDateTime(estimatedEndDate, estimatedEndPeriod, 'end') : null,
                estimatedEndPeriod,
                startedAt: isOffice ? new Date() : null,
                technicians: {
                    create: technicianIds.map((techId) => ({
                        technicianId: techId,
                    })),
                },
            },
            include: {
                submitter: { select: { id: true, name: true } },
                technicians: {
                    include: {
                        technician: { select: { id: true, name: true, feishuId: true } },
                    },
                },
            },
        });
        // 保存客户记录（用于联想输入）
        await saveCustomerRecord(customerName, customerContact, customerPhone);
        // 保存渠道记录
        if (hasChannel && channelName) {
            await saveChannelRecord(channelName, channelContact, channelPhone);
        }
        // 保存厂家对接人记录
        if (manufacturerContact) {
            await saveManufacturerContactRecord(manufacturerContact);
        }
        // 外勤类型发送飞书消息通知技术人员（失败不影响工单创建）
        if ((0, types_1.isFieldOrder)(orderType)) {
            const messageService = new messageService_1.MessageService();
            for (const t of order.technicians) {
                if (t.technician.feishuId) {
                    try {
                        await messageService.sendNewOrderNotification({
                            ...order,
                            technician: t.technician,
                        }, {
                            orderId: order.id,
                            orderNo: order.orderNo,
                            msgType: 'MSG-01',
                            cardTitle: '新工单待接收',
                        });
                    }
                    catch (error) {
                        // 飞书通知发送失败，记录错误但不影响工单创建
                        log.error('创建工单飞书通知发送失败', {
                            error,
                            workOrderId: order.id,
                            orderNo: order.orderNo,
                            operatorId: user.id,
                            technicianId: t.technicianId,
                            technicianName: t.technician.name,
                            technicianFeishuId: t.technician.feishuId,
                        });
                    }
                }
            }
        }
        (0, utils_1.success)(res, order, '工单创建成功');
    }
    catch (error) {
        next(error);
    }
});
// 确认接单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/accept', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: {
                submitter: { select: { feishuId: true } },
                technicians: { include: { technician: { select: { id: true, name: true } } } },
            },
        });
        // 检查权限
        ensureCanOperate(order, user);
        if (order.status !== types_1.OrderStatus.PENDING)
            throw middlewares_1.ApiError.badRequest('工单状态不正确');
        const updated = await utils_1.prisma.workOrder.update({
            where: { id },
            data: {
                status: types_1.OrderStatus.ACCEPTED,
                acceptedAt: new Date(),
            },
        });
        // 通知提交人（失败不影响操作）
        if (order.submitter?.feishuId) {
            const messageService = new messageService_1.MessageService();
            try {
                await messageService.sendOrderAcceptedNotification({ ...updated, technicians: order.technicians }, order.submitter.feishuId, {
                    orderId: order.id,
                    orderNo: order.orderNo,
                    msgType: 'MSG-03',
                    cardTitle: '工单已被接收',
                });
            }
            catch (error) {
                log.error('接单飞书通知发送失败', {
                    error,
                    workOrderId: order.id,
                    orderNo: order.orderNo,
                    submitterId: order.submitterId,
                    submitterFeishuId: order.submitter?.feishuId,
                    operatorId: user.id,
                });
            }
        }
        // 外勤工单自动发起飞书外出审批（失败不影响接单）
        if ((0, types_1.isFieldOrder)(order.orderType)) {
            const approvalService = new approvalService_1.ApprovalService();
            try {
                // 获取技术人员的飞书user_id
                const technician = await utils_1.prisma.user.findUnique({
                    where: { id: user.id },
                    select: { feishuUserId: true },
                });
                if (technician?.feishuUserId) {
                    const instanceCode = await approvalService.createApprovalInstance({
                        workOrderId: order.id,
                        orderNo: order.orderNo,
                        orderType: order.orderType,
                        customerName: order.customerName,
                        description: order.description,
                        customerContact: order.customerContact || undefined,
                        customerPhone: order.customerPhone || undefined,
                        estimatedStartDate: order.estimatedStartDate || undefined,
                        estimatedStartPeriod: order.estimatedStartPeriod || undefined,
                        estimatedEndDate: order.estimatedEndDate || undefined,
                        estimatedEndPeriod: order.estimatedEndPeriod || undefined,
                        userId: technician.feishuUserId,
                    });
                    if (instanceCode) {
                        // 保存审批实例ID到工单
                        await utils_1.prisma.workOrder.update({
                            where: { id },
                            data: {
                                approvalInstanceCode: instanceCode,
                                approvalStatus: approvalService_1.ApprovalStatus.PENDING,
                            },
                        });
                        log.info('外出审批已自动发起', {
                            workOrderId: order.id,
                            orderNo: order.orderNo,
                            operatorId: user.id,
                            feishuUserId: technician.feishuUserId,
                            instanceCode,
                        });
                    }
                    else {
                        log.warn('外出审批发起失败，但不影响接单', {
                            workOrderId: order.id,
                            orderNo: order.orderNo,
                            operatorId: user.id,
                            feishuUserId: technician.feishuUserId,
                        });
                    }
                }
                else {
                    log.warn('技术人员未绑定飞书账号，无法发起外出审批', {
                        workOrderId: order.id,
                        orderNo: order.orderNo,
                        operatorId: user.id,
                    });
                }
            }
            catch (error) {
                log.error('发起外出审批异常', {
                    error,
                    workOrderId: order.id,
                    orderNo: order.orderNo,
                    operatorId: user.id,
                });
                // 审批失败不影响接单
            }
        }
        (0, utils_1.success)(res, updated, '接单成功');
    }
    catch (error) {
        next(error);
    }
});
// 拒绝接单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/reject', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: {
                submitter: { select: { feishuId: true } },
                technicians: { include: { technician: { select: { id: true, name: true } } } },
            },
        });
        if (!order)
            throw middlewares_1.ApiError.notFound('工单不存在');
        if (order.status !== types_1.OrderStatus.PENDING)
            throw middlewares_1.ApiError.badRequest('工单状态不正确');
        const updated = await utils_1.prisma.workOrder.update({
            where: { id },
            data: {
                status: types_1.OrderStatus.REJECTED,
                cancelReason: reason || '技术人员拒绝接单',
            },
        });
        // 通知提交人（失败不影响操作）
        if (order.submitter?.feishuId) {
            const messageService = new messageService_1.MessageService();
            try {
                await messageService.sendOrderRejectedNotification({ ...updated, technicians: order.technicians }, order.submitter.feishuId, {
                    orderId: order.id,
                    orderNo: order.orderNo,
                    msgType: 'MSG-04',
                    cardTitle: '工单被退回',
                }, reason);
            }
            catch (error) {
                log.error('拒单飞书通知发送失败', {
                    error,
                    workOrderId: order.id,
                    orderNo: order.orderNo,
                    submitterId: order.submitterId,
                    submitterFeishuId: order.submitter?.feishuId,
                    operatorId: user.id,
                });
            }
        }
        (0, utils_1.success)(res, updated, '已退回工单');
    }
    catch (error) {
        next(error);
    }
});
// 开始服务（AUDITOR 和 OTHER 不能操作）
router.post('/:id/start', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: { technicians: true },
        });
        // 检查权限
        ensureCanOperate(order, req.user);
        if (order.status !== types_1.OrderStatus.ACCEPTED)
            throw middlewares_1.ApiError.badRequest('请先确认接单');
        const updated = await utils_1.prisma.workOrder.update({
            where: { id },
            data: {
                status: types_1.OrderStatus.IN_SERVICE,
                startedAt: new Date(),
            },
        });
        (0, utils_1.success)(res, updated, '开始服务');
    }
    catch (error) {
        next(error);
    }
});
// 完成服务（AUDITOR 和 OTHER 不能操作）
router.post('/:id/complete', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { serviceSummary, actualServiceDays } = req.body;
        const user = req.user;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: {
                submitter: { select: { feishuId: true } },
                technicians: { include: { technician: { select: { id: true, name: true } } } },
            },
        });
        // 检查权限
        ensureCanOperate(order, user);
        if (order.status !== types_1.OrderStatus.IN_SERVICE)
            throw middlewares_1.ApiError.badRequest('工单状态不正确');
        if (!serviceSummary) {
            throw middlewares_1.ApiError.badRequest('请填写服务小结');
        }
        if (actualServiceDays === undefined || actualServiceDays === null || actualServiceDays === '') {
            throw middlewares_1.ApiError.badRequest('请填写实际服务时间');
        }
        const days = parseFloat(actualServiceDays);
        if (isNaN(days) || days < 0) {
            throw middlewares_1.ApiError.badRequest('实际服务时间格式不正确');
        }
        const updated = await utils_1.prisma.workOrder.update({
            where: { id },
            data: {
                status: types_1.OrderStatus.DONE,
                serviceSummary,
                actualServiceDays: Math.round(days * 10) / 10,
                completedAt: new Date(),
            },
        });
        // 通知提交人评价（失败不影响操作）
        if (order.submitter?.feishuId) {
            const messageService = new messageService_1.MessageService();
            try {
                await messageService.sendServiceCompletedNotification({ ...updated, technicians: order.technicians }, order.submitter.feishuId, {
                    orderId: order.id,
                    orderNo: order.orderNo,
                    msgType: 'MSG-05',
                    cardTitle: '服务已完成',
                });
            }
            catch (error) {
                log.error('完成服务飞书通知发送失败', {
                    error,
                    workOrderId: order.id,
                    orderNo: order.orderNo,
                    submitterId: order.submitterId,
                    submitterFeishuId: order.submitter?.feishuId,
                    operatorId: user.id,
                });
            }
        }
        (0, utils_1.success)(res, updated, '服务完成');
    }
    catch (error) {
        next(error);
    }
});
// 取消工单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/cancel', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: { technicians: true },
        });
        // 检查权限
        ensureCanOperate(order, req.user);
        if (order.status === types_1.OrderStatus.DONE)
            throw middlewares_1.ApiError.badRequest('已完成的工单无法取消');
        const updated = await utils_1.prisma.workOrder.update({
            where: { id },
            data: {
                status: types_1.OrderStatus.CANCELLED,
                cancelReason: reason,
            },
        });
        (0, utils_1.success)(res, updated, '工单已取消');
    }
    catch (error) {
        next(error);
    }
});
// 提交评价（AUDITOR 和 OTHER 不能操作）
router.post('/:id/evaluate', (0, middlewares_1.authorize)(...canManageOrders), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { qualityRating, responseRating, customerFeedback, improvementSuggestion, recommend } = req.body;
        const user = req.user;
        const order = await utils_1.prisma.workOrder.findUnique({
            where: { id },
            include: { technicians: true },
        });
        // 检查权限
        ensureCanOperate(order, user);
        if (order.status !== types_1.OrderStatus.DONE)
            throw middlewares_1.ApiError.badRequest('工单未完成，无法评价');
        // 检查是否已评价
        const existing = await utils_1.prisma.evaluation.findUnique({ where: { workOrderId: id } });
        if (existing)
            throw middlewares_1.ApiError.badRequest('该工单已评价');
        const evaluation = await utils_1.prisma.evaluation.create({
            data: {
                workOrderId: id,
                qualityRating,
                responseRating,
                customerFeedback,
                improvementSuggestion,
                recommend: recommend === true || recommend === 'true',
                evaluatorId: user.id,
            },
        });
        (0, utils_1.success)(res, evaluation, '评价提交成功');
    }
    catch (error) {
        next(error);
    }
});
// ============ 联想输入数据接口 ============
// 客户联想
router.get('/suggest/customers', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return (0, utils_1.success)(res, []);
        }
        const records = await utils_1.prisma.customerRecord.findMany({
            where: {
                name: { contains: keyword },
            },
            orderBy: { usageCount: 'desc' },
            take: 10,
        });
        (0, utils_1.success)(res, records);
    }
    catch (error) {
        next(error);
    }
});
// 渠道联想
router.get('/suggest/channels', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return (0, utils_1.success)(res, []);
        }
        const records = await utils_1.prisma.channelRecord.findMany({
            where: {
                name: { contains: keyword },
            },
            orderBy: { usageCount: 'desc' },
            take: 10,
        });
        (0, utils_1.success)(res, records);
    }
    catch (error) {
        next(error);
    }
});
// 厂家对接人联想
router.get('/suggest/manufacturer-contacts', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return (0, utils_1.success)(res, []);
        }
        const records = await utils_1.prisma.manufacturerContactRecord.findMany({
            where: {
                name: { contains: keyword },
            },
            orderBy: { usageCount: 'desc' },
            take: 10,
        });
        (0, utils_1.success)(res, records);
    }
    catch (error) {
        next(error);
    }
});
// ============ 辅助函数 ============
function buildDateTime(dateStr, period, type) {
    const p = period === 'AM' || period === 'PM' ? period : (type === 'start' ? 'AM' : 'PM');
    const [hour, minute] = type === 'start'
        ? (p === 'AM' ? [9, 0] : [13, 30])
        : (p === 'AM' ? [12, 0] : [17, 30]);
    return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`);
}
async function saveCustomerRecord(name, contactPerson, contactPhone) {
    try {
        await utils_1.prisma.customerRecord.upsert({
            where: { name },
            update: {
                contactPerson,
                contactPhone,
                usageCount: { increment: 1 },
            },
            create: {
                name,
                contactPerson,
                contactPhone,
            },
        });
    }
    catch (error) {
        // TODO: 待 logger 中央脱敏完成后，评估是否需要脱敏处理联系人/电话信息
        log.error('保存客户记录失败', {
            error,
            name,
            contactPerson,
            contactPhone,
        });
    }
}
async function saveChannelRecord(name, contactPerson, contactPhone) {
    try {
        await utils_1.prisma.channelRecord.upsert({
            where: { name },
            update: {
                contactPerson,
                contactPhone,
                usageCount: { increment: 1 },
            },
            create: {
                name,
                contactPerson,
                contactPhone,
            },
        });
    }
    catch (error) {
        // TODO: 待 logger 中央脱敏完成后，评估是否需要脱敏处理联系人/电话信息
        log.error('保存渠道记录失败', {
            error,
            name,
            contactPerson,
            contactPhone,
        });
    }
}
async function saveManufacturerContactRecord(name) {
    try {
        await utils_1.prisma.manufacturerContactRecord.upsert({
            where: { name },
            update: {
                usageCount: { increment: 1 },
            },
            create: {
                name,
            },
        });
    }
    catch (error) {
        // TODO: 待 logger 中央脱敏完成后，评估是否需要脱敏处理联系人姓名
        log.error('保存厂家对接人记录失败', {
            error,
            name,
        });
    }
}
exports.default = router;
//# sourceMappingURL=workOrder.js.map