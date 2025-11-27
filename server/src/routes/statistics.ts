import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares';
import { prisma, success } from '../utils';

const router = Router();

router.use(authenticate);
router.use(authorize('SYSTEM_ADMIN', 'ADMIN'));

// 概览统计
router.get('/overview', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalOrders,
      completedOrders,
      totalTechnicians,
      totalSales,
    ] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.count({ where: { ...where, status: 'DONE' } }),
      prisma.user.count({ where: { role: 'TECHNICIAN', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'SALES', status: 'ACTIVE' } }),
    ]);

    // 平均响应时间（接单时间 - 创建时间）
    const ordersWithAcceptTime = await prisma.workOrder.findMany({
      where: { ...where, acceptedAt: { not: null } },
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
      where: { ...where, status: 'DONE', completedAt: { not: null } },
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
    const statusCounts = await prisma.workOrder.groupBy({
      by: ['status'],
      _count: true,
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
    const typeCounts = await prisma.workOrder.groupBy({
      by: ['orderType'],
      _count: true,
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
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const completedWhere = {
      workOrder: {
        status: 'DONE' as const,
        ...(Object.keys(dateFilter).length > 0 ? { completedAt: dateFilter } : {}),
      },
    };

    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
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

    const data = technicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      orderCount: tech._count.technicianAssignments,
    }));

    // 按工单数排序
    data.sort((a, b) => b.orderCount - a.orderCount);

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 优先级分布
router.get('/priority', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const priorityCounts = await prisma.workOrder.groupBy({
      by: ['priority'],
      _count: true,
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
    const stats = await prisma.evaluation.aggregate({
      _avg: {
        qualityRating: true,
        responseRating: true,
      },
      _count: true,
    });

    // 推荐率
    const recommendCount = await prisma.evaluation.count({
      where: { recommend: true },
    });

    // 评分分布
    const ratingDistribution = await prisma.evaluation.groupBy({
      by: ['qualityRating'],
      _count: true,
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
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.workOrder.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    // 按日期分组
    const dailyData: Record<string, { created: number; completed: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      dailyData[key] = { created: 0, completed: 0 };
    }

    orders.forEach(order => {
      const key = order.createdAt.toISOString().split('T')[0];
      if (dailyData[key]) {
        dailyData[key].created++;
        if (order.status === 'DONE') {
          dailyData[key].completed++;
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
      where: { role: 'SALES', status: 'ACTIVE' },
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
