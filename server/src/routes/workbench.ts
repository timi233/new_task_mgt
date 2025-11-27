import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middlewares';
import { prisma, success } from '../utils';
import { Role, isTechnician, isSales } from '../types';

const router = Router();

router.use(authenticate);

// 工作台数据
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let data: any = {};

    if (isTechnician(user)) {
      // 技术人员工作台
      const [pendingOrders, inServiceOrders, todayCompleted, monthCompleted] = await Promise.all([
        // 待接单
        prisma.workOrder.count({
          where: {
            technicians: { some: { technicianId: user.id } },
            status: 'PENDING',
          },
        }),
        // 服务中
        prisma.workOrder.count({
          where: {
            technicians: { some: { technicianId: user.id } },
            status: { in: ['ACCEPTED', 'IN_SERVICE'] },
          },
        }),
        // 今日完成
        prisma.workOrder.count({
          where: {
            technicians: { some: { technicianId: user.id } },
            status: 'DONE',
            completedAt: { gte: today },
          },
        }),
        // 本月完成
        prisma.workOrder.count({
          where: {
            technicians: { some: { technicianId: user.id } },
            status: 'DONE',
            completedAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1),
            },
          },
        }),
      ]);

      // 待处理工单列表
      const pendingList = await prisma.workOrder.findMany({
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
          inServiceOrders,
          todayCompleted,
          monthCompleted,
        },
        pendingList: pendingList.map(order => ({
          ...order,
          technicianList: order.technicians.map(t => t.technician),
        })),
      };
    } else if (isSales(user)) {
      // 销售工作台
      const [myOrders, pendingEvaluation, todayCreated, monthCreated] = await Promise.all([
        // 我的工单数
        prisma.workOrder.count({
          where: {
            OR: [
              { submitterId: user.id },
              { relatedSalesId: user.id },
            ],
          },
        }),
        // 待评价
        prisma.workOrder.count({
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
        prisma.workOrder.count({
          where: {
            submitterId: user.id,
            createdAt: { gte: today },
          },
        }),
        // 本月创建
        prisma.workOrder.count({
          where: {
            submitterId: user.id,
            createdAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1),
            },
          },
        }),
      ]);

      // 待评价工单
      const pendingEvaluationList = await prisma.workOrder.findMany({
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
      const ordersByStatus = await prisma.workOrder.groupBy({
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
    } else {
      // 管理员工作台
      const [totalOrders, pendingOrders, inServiceOrders, completedOrders] = await Promise.all([
        prisma.workOrder.count(),
        prisma.workOrder.count({ where: { status: 'PENDING' } }),
        prisma.workOrder.count({ where: { status: { in: ['ACCEPTED', 'IN_SERVICE'] } } }),
        prisma.workOrder.count({ where: { status: 'DONE' } }),
      ]);

      // 今日数据
      const [todayCreated, todayCompleted] = await Promise.all([
        prisma.workOrder.count({ where: { createdAt: { gte: today } } }),
        prisma.workOrder.count({ where: { completedAt: { gte: today } } }),
      ]);

      // 技术人员工单统计
      const technicianStats = await prisma.user.findMany({
        where: { role: Role.TECHNICIAN, status: 'ACTIVE' },
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
      const urgentOrders = await prisma.workOrder.findMany({
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

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 快捷操作：获取可派单的技术人员
router.get('/available-technicians', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: Role.TECHNICIAN, status: 'ACTIVE' },
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
    const sorted = technicians.sort((a, b) =>
      a._count.technicianAssignments - b._count.technicianAssignments
    );

    success(res, sorted);
  } catch (error) {
    next(error);
  }
});

export default router;
