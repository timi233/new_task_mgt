import { Router, Response, NextFunction } from 'express';
import { authenticate, requireEither, AuthRequest } from '../middlewares';
import { prisma, success } from '../utils';
import {
  isAdmin,
  isSales,
  isTechnician,
  FunctionalRole,
  UserStatus,
  ResponsibilityRole,
} from '../types';

const router = Router();

router.use(authenticate);
router.use(
  requireEither(
    [FunctionalRole.TECHNICIAN, FunctionalRole.SALES],
    [ResponsibilityRole.SYSTEM_ADMIN, ResponsibilityRole.ADMIN]
  )
);

type ScopeType = 'my' | 'overview';

const resolveScope = (req: AuthRequest): ScopeType => {
  const user = req.user!;
  const requested = (req.query.scope as string) || 'my';

  // 管理员/审计可以选择任意 scope
  if (isAdmin(user)) {
    return requested === 'overview' ? 'overview' : 'my';
  }

  // 技术员只能看 'my' (我的数据)
  if (isTechnician(user)) {
    return 'my';
  }

  // 销售只能看 'overview' (总览数据，但只包含销售相关的)
  if (isSales(user)) {
    return 'overview';
  }

  return 'my';
};

const buildOrderFilter = (req: AuthRequest, scope: ScopeType) => {
  const user = req.user!;

  // 管理员/审计在 overview 模式可以看所有
  if (scope === 'overview' && isAdmin(user)) {
    return {};
  }

  // 技术员看自己的
  if (isTechnician(req.user)) {
    return {
      technicians: {
        some: { technicianId: req.user!.id },
      },
    };
  }

  // 销售看自己提交或关联的（无论 my 还是 overview 模式）
  if (isSales(req.user)) {
    return {
      OR: [
        { submitterId: req.user!.id },
        { relatedSalesId: req.user!.id },
      ],
    };
  }

  return {};
};

// 概览统计
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const dateCondition = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const orderFilter = buildOrderFilter(req, scope);
    const where = { ...orderFilter, ...dateCondition };
    const completedWhere = { ...orderFilter, ...dateCondition, status: 'DONE' as const };

    const [totalOrders, completedOrders] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.count({ where: completedWhere }),
    ]);

    let totalTechnicians: number;
    let totalSales: number;

    if (scope === 'overview') {
      [totalTechnicians, totalSales] = await Promise.all([
        prisma.user.count({
          where: { functionalRole: FunctionalRole.TECHNICIAN, status: UserStatus.ACTIVE },
        }),
        prisma.user.count({
          where: { functionalRole: FunctionalRole.SALES, status: UserStatus.ACTIVE },
        }),
      ]);
    } else {
      const scopedOrders = await prisma.workOrder.findMany({
        where,
        select: {
          submitterId: true,
          relatedSalesId: true,
          technicians: {
            select: { technicianId: true },
          },
        },
      });

      const technicianIds = new Set<string>();
      const salesIds = new Set<string>();

      scopedOrders.forEach(order => {
        order.technicians.forEach(t => technicianIds.add(t.technicianId));
        if (order.relatedSalesId) salesIds.add(order.relatedSalesId);
        if (order.submitterId) salesIds.add(order.submitterId);
      });

      totalTechnicians = technicianIds.size;
      totalSales = salesIds.size;
    }

    // 平均响应时间（接单时间 - 创建时间）
    const ordersWithAcceptTime = await prisma.workOrder.findMany({
      where: { ...orderFilter, ...dateCondition, acceptedAt: { not: null } },
      select: { createdAt: true, acceptedAt: true },
    });

    let avgResponseMinutes = 0;
    if (ordersWithAcceptTime.length > 0) {
      const totalMinutes = ordersWithAcceptTime.reduce((sum, order) => {
        const diff = order.acceptedAt!.getTime() - order.createdAt.getTime();
        return sum + diff / (1000 * 60);
      }, 0);
      avgResponseMinutes = Math.round(totalMinutes / ordersWithAcceptTime.length);
    }

    // 平均完成时间（完成时间 - 创建时间）
    const ordersWithCompleteTime = await prisma.workOrder.findMany({
      where: { ...orderFilter, ...dateCondition, status: 'DONE', completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    });

    let avgCompletionHours = 0;
    if (ordersWithCompleteTime.length > 0) {
      const totalHours = ordersWithCompleteTime.reduce((sum, order) => {
        const diff = order.completedAt!.getTime() - order.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgCompletionHours = Math.round(totalHours / ordersWithCompleteTime.length * 10) / 10;
    }

    success(res, {
      totalOrders,
      completedOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0,
      totalTechnicians,
      totalSales,
      avgResponseMinutes,
      avgCompletionHours,
    });
  } catch (error) {
    next(error);
  }
});

// 工单状态分布
router.get('/order-status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const where = buildOrderFilter(req, scope);
    const statusCounts = await prisma.workOrder.groupBy({
      by: ['status'],
      _count: true,
      where,
    });

    const statusMap: Record<string, string> = {
      PENDING: '待接单',
      ACCEPTED: '已接单',
      IN_SERVICE: '服务中',
      DONE: '已完成',
      CANCELLED: '已取消',
      REJECTED: '已拒绝',
    };

    const data = statusCounts.map(item => ({
      status: item.status,
      label: statusMap[item.status] || item.status,
      count: item._count,
    }));

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 工单类型分布
router.get('/order-type', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const where = buildOrderFilter(req, scope);
    const typeCounts = await prisma.workOrder.groupBy({
      by: ['orderType'],
      _count: true,
      where,
    });

    const typeMap: Record<string, string> = {
      CF: '公司外勤',
      CO: '公司内勤',
      MF: '厂家外勤',
      MO: '厂家内勤',
    };

    const data = typeCounts.map(item => ({
      type: item.orderType,
      label: typeMap[item.orderType] || item.orderType,
      count: item._count,
    }));

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 技术人员工作量统计
router.get('/technician-workload', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const completedDateCondition = Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {};

    if (scope === 'my' && isTechnician(req.user)) {
      const orderCount = await prisma.workOrderTechnician.count({
        where: {
          technicianId: req.user!.id,
          workOrder: {
            status: 'DONE',
            ...completedDateCondition,
          },
        },
      });

      success(res, [
        {
          id: req.user!.id,
          name: req.user!.name,
          orderCount,
          totalHours: null,
        },
      ]);
      return;
    }

    if (scope === 'my' && isSales(req.user)) {
      const orders = await prisma.workOrder.findMany({
        where: {
          status: 'DONE',
          ...completedDateCondition,
          OR: [
            { submitterId: req.user!.id },
            { relatedSalesId: req.user!.id },
          ],
        },
        include: {
          technicians: {
            include: {
              technician: { select: { id: true, name: true } },
            },
          },
        },
      });

      const map = new Map<string, { id: string; name: string; orderCount: number }>();
      orders.forEach(order => {
        order.technicians.forEach(assign => {
          const id = assign.technicianId;
          const name = assign.technician?.name || '未知工程师';
          const current = map.get(id) || { id, name, orderCount: 0 };
          current.orderCount += 1;
          map.set(id, current);
        });
      });

      const data = Array.from(map.values())
        .map(item => ({ ...item, totalHours: null }))
        .sort((a, b) => b.orderCount - a.orderCount);
      success(res, data);
      return;
    }

    const orderFilter = buildOrderFilter(req, scope);
    const completedWhere = {
      workOrder: {
        status: 'DONE' as const,
        ...completedDateCondition,
        ...orderFilter,
      },
    };

    const technicians = await prisma.user.findMany({
      where: {
        functionalRole: FunctionalRole.TECHNICIAN,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            technicianAssignments: { where: completedWhere },
          },
        },
      },
    });

    const data = technicians
      .map(tech => ({
        id: tech.id,
        name: tech.name,
        orderCount: tech._count.technicianAssignments,
        totalHours: null,
      }))
      .filter(item => scope === 'overview' || item.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount);

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 优先级分布
router.get('/priority', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const where = buildOrderFilter(req, scope);
    const priorityCounts = await prisma.workOrder.groupBy({
      by: ['priority'],
      _count: true,
      where,
    });

    const priorityMap: Record<string, string> = {
      NORMAL: '普通',
      URGENT: '紧急',
      VERY_URGENT: '非常紧急',
    };

    const data = priorityCounts.map(item => ({
      priority: item.priority,
      label: priorityMap[item.priority] || item.priority,
      count: item._count,
    }));

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 评价统计
router.get('/evaluation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const orderFilter = buildOrderFilter(req, scope);

    const evaluationWhere = scope === 'overview' ? {} : { workOrder: orderFilter };

    const stats = await prisma.evaluation.aggregate({
      where: evaluationWhere,
      _avg: {
        qualityRating: true,
        responseRating: true,
      },
      _count: true,
    });

    // 推荐率
    const recommendCount = await prisma.evaluation.count({
      where: { recommend: true, ...evaluationWhere },
    });

    // 评分分布
    const ratingDistribution = await prisma.evaluation.groupBy({
      by: ['qualityRating'],
      _count: true,
      where: evaluationWhere,
    });

    success(res, {
      totalEvaluations: stats._count,
      avgQualityRating: stats._avg.qualityRating?.toFixed(1) || 0,
      avgResponseRating: stats._avg.responseRating?.toFixed(1) || 0,
      recommendRate: stats._count > 0 ? (recommendCount / stats._count * 100).toFixed(1) : 0,
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item.qualityRating,
        count: item._count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// 趋势数据（最近30天每日工单数）
router.get('/trend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scope = resolveScope(req);
    const requestedDays = parseInt(req.query.days as string) || 30;
    const days = Math.max(requestedDays, 1);

    const startOfDay = (input: Date) => {
      const normalized = new Date(input);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const startDate = startOfDay(new Date());
    startDate.setDate(startDate.getDate() - (days - 1));

    const orders = await prisma.workOrder.findMany({
      where: {
        createdAt: { gte: startDate },
        ...buildOrderFilter(req, scope),
      },
      select: { createdAt: true, status: true },
    });

    const dailyData: Record<string, { created: number; completed: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { created: 0, completed: 0 };
    }

    orders.forEach(order => {
      const normalizedDate = startOfDay(order.createdAt);
      const key = normalizedDate.toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].created += 1;
        if (order.status === 'DONE') {
          dailyData[key].completed += 1;
        }
      }
    });

    const data = Object.entries(dailyData).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 销售工单统计
router.get('/sales-orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sales = await prisma.user.findMany({
      where: {
        functionalRole: FunctionalRole.SALES,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            submittedOrders: true,
          },
        },
      },
    });

    const data = sales.map(s => ({
      id: s.id,
      name: s.name,
      orderCount: s._count.submittedOrders,
    }));

    // 按工单数排序
    data.sort((a, b) => b.orderCount - a.orderCount);

    success(res, data);
  } catch (error) {
    next(error);
  }
});

export default router;
