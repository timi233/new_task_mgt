import { Router, Response, NextFunction } from 'express';
import { authenticate, requireEither, AuthRequest } from '../middlewares';
import { prisma, success } from '../utils';
import { ResponsibilityRole, FunctionalRole, hasNoPermission, hasManagementRole, isTechnician, isSales } from '../types';

const router = Router();

router.use(authenticate);
// 所有有业务权限的用户都可以访问派工总览
router.use(
  requireEither(
    [FunctionalRole.TECHNICIAN, FunctionalRole.SALES],
    [ResponsibilityRole.SYSTEM_ADMIN, ResponsibilityRole.ADMIN, ResponsibilityRole.AUDITOR]
  )
);

const getWeekBounds = (anchor: Date) => {
  const monday = new Date(anchor);
  monday.setUTCHours(0, 0, 0, 0);
  const weekday = monday.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  monday.setUTCDate(monday.getUTCDate() + diff);

  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);

  return { monday, friday };
};

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // 无权限用户返回空数据
    if (hasNoPermission(user)) {
      return success(res, {
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
    const where: any = {
      estimatedStartDate: {
        gte: monday,
        lt: exclusiveEnd,
      },
    };

    // 权限过滤：管理员/审计看所有，技术/销售只看自己相关的
    if (!hasManagementRole(user)) {
      if (isTechnician(user)) {
        where.technicians = {
          some: { technicianId: user.id },
        };
      } else if (isSales(user)) {
        where.OR = [
          { submitterId: user.id },
          { relatedSalesId: user.id },
        ];
      }
    }

    const orders = await prisma.workOrder.findMany({
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

    const techniciansMap = new Map<
      string,
      {
        id: string;
        name: string;
        assignments: {
          day: string;
          orderId: string;
          orderNo: string;
          customerName: string;
          orderType: string;
          description: string | null;
          isOwn?: boolean; // 标记是否是自己的任务
        }[];
      }
    >();

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
      if (!order.estimatedStartDate) return;
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
        const isOwn = hasManagementRole(user) || // 管理员能看所有详情
          (isTechnician(user) && techId === user.id) || // 技术员看自己的
          (isSales(user) && ( // 销售看自己提交/关联的
            order.technicians.some(t => t.technicianId === user.id)
          ));

        techniciansMap.get(techId)!.assignments.push({
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

    success(res, {
      weekStart: monday.toISOString(),
      days,
      technicians: Array.from(techniciansMap.values()),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
