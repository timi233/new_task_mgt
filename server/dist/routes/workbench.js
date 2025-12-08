"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
// 工作台数据
router.get('/', async (req, res, next) => {
    try {
        const user = req.user;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let data = {};
        if ((0, types_1.isTechnician)(user)) {
            // 技术人员工作台
            const [pendingOrders, acceptedOrders, inServiceOrders, todayCompleted, monthCompleted, totalCompleted] = await Promise.all([
                // 待接单
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'PENDING',
                    },
                }),
                // 待服务（已接单）
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'ACCEPTED',
                    },
                }),
                // 服务中
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'IN_SERVICE',
                    },
                }),
                // 今日完成
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'DONE',
                        completedAt: { gte: today },
                    },
                }),
                // 本月完成
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'DONE',
                        completedAt: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        },
                    },
                }),
                // 总共完成
                utils_1.prisma.workOrder.count({
                    where: {
                        technicians: { some: { technicianId: user.id } },
                        status: 'DONE',
                    },
                }),
            ]);
            // 待处理工单列表
            const pendingList = await utils_1.prisma.workOrder.findMany({
                where: {
                    technicians: { some: { technicianId: user.id } },
                    status: { in: ['PENDING', 'ACCEPTED', 'IN_SERVICE'] },
                },
                include: {
                    submitter: { select: { id: true, name: true } },
                    relatedSales: { select: { id: true, name: true } },
                    technicians: {
                        include: {
                            technician: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
                take: 10,
            });
            data = {
                statistics: {
                    pendingOrders,
                    acceptedOrders,
                    inServiceOrders,
                    todayCompleted,
                    monthCompleted,
                    totalCompleted,
                },
                pendingList: pendingList.map(order => ({
                    ...order,
                    technicianList: order.technicians.map(t => t.technician),
                })),
            };
        }
        else if ((0, types_1.isSales)(user)) {
            // 销售工作台
            const [myOrders, pendingEvaluation, todayCreated, monthCreated] = await Promise.all([
                // 我的工单数
                utils_1.prisma.workOrder.count({
                    where: {
                        OR: [
                            { submitterId: user.id },
                            { relatedSalesId: user.id },
                        ],
                    },
                }),
                // 待评价
                utils_1.prisma.workOrder.count({
                    where: {
                        OR: [
                            { submitterId: user.id },
                            { relatedSalesId: user.id },
                        ],
                        status: 'DONE',
                        evaluation: null,
                    },
                }),
                // 今日创建
                utils_1.prisma.workOrder.count({
                    where: {
                        submitterId: user.id,
                        createdAt: { gte: today },
                    },
                }),
                // 本月创建
                utils_1.prisma.workOrder.count({
                    where: {
                        submitterId: user.id,
                        createdAt: {
                            gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        },
                    },
                }),
            ]);
            // 待评价工单
            const pendingEvaluationList = await utils_1.prisma.workOrder.findMany({
                where: {
                    OR: [
                        { submitterId: user.id },
                        { relatedSalesId: user.id },
                    ],
                    status: 'DONE',
                    evaluation: null,
                },
                include: {
                    technicians: {
                        include: {
                            technician: { select: { name: true } },
                        },
                    },
                },
                orderBy: { completedAt: 'desc' },
                take: 10,
            });
            // 我的工单状态分布
            const ordersByStatus = await utils_1.prisma.workOrder.groupBy({
                by: ['status'],
                where: {
                    OR: [
                        { submitterId: user.id },
                        { relatedSalesId: user.id },
                    ],
                },
                _count: true,
            });
            data = {
                statistics: {
                    myOrders,
                    pendingEvaluation,
                    todayCreated,
                    monthCreated,
                },
                pendingEvaluationList,
                ordersByStatus,
            };
        }
        else {
            // 管理员工作台
            const [totalOrders, pendingOrders, inServiceOrders, completedOrders] = await Promise.all([
                utils_1.prisma.workOrder.count(),
                utils_1.prisma.workOrder.count({ where: { status: 'PENDING' } }),
                utils_1.prisma.workOrder.count({ where: { status: { in: ['ACCEPTED', 'IN_SERVICE'] } } }),
                utils_1.prisma.workOrder.count({ where: { status: 'DONE' } }),
            ]);
            // 今日数据
            const [todayCreated, todayCompleted] = await Promise.all([
                utils_1.prisma.workOrder.count({ where: { createdAt: { gte: today } } }),
                utils_1.prisma.workOrder.count({ where: { completedAt: { gte: today } } }),
            ]);
            // 技术人员工单统计
            const technicianStats = await utils_1.prisma.user.findMany({
                where: {
                    functionalRole: types_1.FunctionalRole.TECHNICIAN,
                    status: types_1.UserStatus.ACTIVE,
                },
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            technicianAssignments: {
                                where: {
                                    workOrder: { status: { in: ['PENDING', 'ACCEPTED', 'IN_SERVICE'] } },
                                },
                            },
                        },
                    },
                },
            });
            // 待处理工单
            const urgentOrders = await utils_1.prisma.workOrder.findMany({
                where: { status: 'PENDING', priority: { in: ['URGENT', 'VERY_URGENT'] } },
                include: {
                    technicians: {
                        include: {
                            technician: { select: { name: true } },
                        },
                    },
                },
                take: 5,
            });
            data = {
                statistics: {
                    totalOrders,
                    pendingOrders,
                    inServiceOrders,
                    completedOrders,
                    todayCreated,
                    todayCompleted,
                },
                technicianStats: technicianStats.map(t => ({
                    id: t.id,
                    name: t.name,
                    orderCount: t._count.technicianAssignments,
                })),
                urgentOrders,
            };
        }
        (0, utils_1.success)(res, data);
    }
    catch (error) {
        next(error);
    }
});
// 快捷操作：获取可派单的技术人员
router.get('/available-technicians', async (req, res, next) => {
    try {
        const technicians = await utils_1.prisma.user.findMany({
            where: {
                functionalRole: types_1.FunctionalRole.TECHNICIAN,
                status: types_1.UserStatus.ACTIVE,
            },
            select: {
                id: true,
                name: true,
                phone: true,
                department: true,
                _count: {
                    select: {
                        technicianAssignments: {
                            where: {
                                workOrder: { status: { in: ['PENDING', 'ACCEPTED', 'IN_SERVICE'] } },
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        // 按当前工单数排序，工单少的排前面
        const sorted = technicians.sort((a, b) => a._count.technicianAssignments - b._count.technicianAssignments);
        (0, utils_1.success)(res, sorted);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=workbench.js.map