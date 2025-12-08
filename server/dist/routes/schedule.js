"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
// 所有有业务权限的用户都可以访问派工总览
router.use((0, middlewares_1.requireEither)([types_1.FunctionalRole.TECHNICIAN, types_1.FunctionalRole.SALES], [types_1.ResponsibilityRole.SYSTEM_ADMIN, types_1.ResponsibilityRole.ADMIN, types_1.ResponsibilityRole.AUDITOR]));
const getWeekBounds = (anchor) => {
    const monday = new Date(anchor);
    monday.setUTCHours(0, 0, 0, 0);
    const weekday = monday.getUTCDay();
    const diff = weekday === 0 ? -6 : 1 - weekday;
    monday.setUTCDate(monday.getUTCDate() + diff);
    const friday = new Date(monday);
    friday.setUTCDate(friday.getUTCDate() + 4);
    return { monday, friday };
};
router.get('/', async (req, res, next) => {
    try {
        const user = req.user;
        // 无权限用户返回空数据
        if ((0, types_1.hasNoPermission)(user)) {
            return (0, utils_1.success)(res, {
                weekStart: new Date().toISOString(),
                days: [],
                technicians: [],
            });
        }
        const startParam = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
        const baseDate = startParam ? new Date(`${startParam}T00:00:00.000Z`) : new Date();
        const { monday, friday } = getWeekBounds(baseDate);
        const exclusiveEnd = new Date(friday);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        // 构建查询条件
        const where = {
            estimatedStartDate: {
                gte: monday,
                lt: exclusiveEnd,
            },
        };
        // 权限过滤：管理员/审计看所有，技术/销售只看自己相关的
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
            select: {
                id: true,
                orderNo: true,
                orderType: true,
                customerName: true,
                description: true,
                estimatedStartDate: true,
                technicians: {
                    select: {
                        technicianId: true,
                        technician: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        const techniciansMap = new Map();
        const days = Array.from({ length: 5 }).map((_, index) => {
            const date = new Date(monday);
            date.setUTCDate(date.getUTCDate() + index);
            return {
                key: date.toISOString().split('T')[0],
                label: ['周一', '周二', '周三', '周四', '周五'][index],
                date: date.toISOString(),
            };
        });
        orders.forEach(order => {
            if (!order.estimatedStartDate)
                return;
            const dayKey = new Date(order.estimatedStartDate).toISOString().split('T')[0];
            order.technicians.forEach(assignment => {
                const techId = assignment.technicianId;
                if (!techniciansMap.has(techId)) {
                    techniciansMap.set(techId, {
                        id: techId,
                        name: assignment.technician?.name || '未知工程师',
                        assignments: [],
                    });
                }
                // 判断是否是当前用户相关的任务
                const isOwn = (0, types_1.hasManagementRole)(user) || // 管理员能看所有详情
                    ((0, types_1.isTechnician)(user) && techId === user.id) || // 技术员看自己的
                    ((0, types_1.isSales)(user) && ( // 销售看自己提交/关联的
                    order.technicians.some(t => t.technicianId === user.id)));
                techniciansMap.get(techId).assignments.push({
                    day: dayKey,
                    orderId: order.id,
                    orderNo: order.orderNo,
                    // 隐私处理：非自己相关的任务只显示客户名称，不显示详情
                    customerName: isOwn ? order.customerName : '***',
                    orderType: order.orderType,
                    description: isOwn ? order.description : null,
                    isOwn,
                });
            });
        });
        (0, utils_1.success)(res, {
            weekStart: monday.toISOString(),
            days,
            technicians: Array.from(techniciansMap.values()),
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=schedule.js.map