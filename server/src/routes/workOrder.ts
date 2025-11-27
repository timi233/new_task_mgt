import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest, ApiError } from '../middlewares';
import { prisma, success, paginate, generateOrderNo } from '../utils';
import { MessageService } from '../feishu/messageService';
import { Role, OrderType, OrderStatus, Priority, isCompanyOrder, isManufacturerOrder, isFieldOrder, isOfficeOrder } from '../types';

const router = Router();

router.use(authenticate);

// 定义可查看工单的角色（不包括 OTHER）
const canViewOrders = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.SALES, Role.TECHNICIAN, Role.AUDITOR];
// 定义可管理工单的角色（不包括 AUDITOR 和 OTHER）
const canManageOrders = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.SALES, Role.TECHNICIAN];

// 工单列表
router.get('/', authorize(...canViewOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', status, orderType, priority, keyword } = req.query;
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const user = req.user!;

    const where: any = {};

    // 根据角色过滤（AUDITOR、ADMIN、SYSTEM_ADMIN 可以看所有工单）
    if (user.role === Role.SALES) {
      // 销售看自己提交的或关联的
      where.OR = [
        { submitterId: user.id },
        { relatedSalesId: user.id },
      ];
    } else if (user.role === Role.TECHNICIAN) {
      // 技术员看分配给自己的
      where.technicians = {
        some: { technicianId: user.id },
      };
    }
    // AUDITOR、ADMIN、SYSTEM_ADMIN 不需要过滤，可以看所有工单

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (priority) where.priority = priority;

    if (keyword) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { orderNo: { contains: keyword as string } },
            { customerName: { contains: keyword as string } },
            { description: { contains: keyword as string } },
          ],
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.workOrder.findMany({
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
      prisma.workOrder.count({ where }),
    ]);

    // 转换技术员格式
    const ordersWithTechnicians = orders.map(order => ({
      ...order,
      technicianList: order.technicians.map(t => t.technician),
    }));

    paginate(res, ordersWithTechnicians, total, pageNum, size);
  } catch (error) {
    next(error);
  }
});

// 待处理工单
router.get('/pending', authorize(...canViewOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const where: any = {
      status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.IN_SERVICE] },
    };

    if (user.role === Role.TECHNICIAN) {
      where.technicians = {
        some: { technicianId: user.id },
      };
    } else if (user.role === Role.SALES) {
      where.OR = [
        { submitterId: user.id },
        { relatedSalesId: user.id },
      ];
    }
    // AUDITOR、ADMIN、SYSTEM_ADMIN 可以看所有待处理工单

    const orders = await prisma.workOrder.findMany({
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

    success(res, orders);
  } catch (error) {
    next(error);
  }
});

// 工单详情
router.get('/:id', authorize(...canViewOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.workOrder.findUnique({
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

    if (!order) {
      throw ApiError.notFound('工单不存在');
    }

    // 转换技术员格式
    const orderWithTechnicians = {
      ...order,
      technicianList: order.technicians.map(t => t.technician),
    };

    success(res, orderWithTechnicians);
  } catch (error) {
    next(error);
  }
});

// 创建工单（AUDITOR 和 OTHER 不能创建）
router.post('/', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      orderType = OrderType.CF,
      // 客户信息
      customerName,
      customerContact,
      customerPhone,
      // 渠道信息（公司类型）
      hasChannel = false,
      channelName,
      channelContact,
      channelPhone,
      // 厂家对接人（厂家类型）
      manufacturerContact,
      // 关联销售（公司内勤，技术员提交时）
      relatedSalesId,
      // 工单信息
      workType,
      priority = Priority.NORMAL,
      description,
      estimatedDate,
      estimatedPeriod,
      estimatedStartDate,
      estimatedStartPeriod,
      estimatedEndDate,
      estimatedEndPeriod,
      // 技术人员（数组）
      technicianIds,
    } = req.body;
    const user = req.user!;

    // 通用必填字段验证
    if (!customerName || !description || !technicianIds || technicianIds.length === 0) {
      throw ApiError.badRequest('缺少必填字段：客户名称、工单描述、服务工程师');
    }

    // 公司类型需要工作类型
    if (isCompanyOrder(orderType) && !workType) {
      throw ApiError.badRequest('公司工单需要选择工作类型');
    }

    // 厂家类型需要厂家对接人
    if (isManufacturerOrder(orderType) && !manufacturerContact) {
      throw ApiError.badRequest('厂家工单需要填写厂家对接人');
    }

    // 公司内勤，技术员提交时需要关联销售
    if (orderType === OrderType.CO && user.role === Role.TECHNICIAN && !relatedSalesId) {
      throw ApiError.badRequest('技术员提交公司内勤工单需要选择关联销售');
    }

    // 生成工单编号
    const orderNo = await generateOrderNo(orderType);

    // 根据类型确定初始状态
    const isOffice = isOfficeOrder(orderType);
    const initialStatus = isOffice ? OrderStatus.IN_SERVICE : OrderStatus.PENDING;

    // 创建工单
    const order = await prisma.workOrder.create({
      data: {
        orderNo,
        orderType,
        submitterId: user.id,
        relatedSalesId: orderType === OrderType.CO && user.role === Role.TECHNICIAN ? relatedSalesId : null,
        customerName,
        customerContact,
        customerPhone,
        hasChannel: isCompanyOrder(orderType) ? hasChannel : false,
        channelName: isCompanyOrder(orderType) && hasChannel ? channelName : null,
        channelContact: isCompanyOrder(orderType) && hasChannel ? channelContact : null,
        channelPhone: isCompanyOrder(orderType) && hasChannel ? channelPhone : null,
        manufacturerContact: isManufacturerOrder(orderType) ? manufacturerContact : null,
        workType: isCompanyOrder(orderType) ? workType : null,
        priority,
        description,
        status: initialStatus,
        estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
        estimatedPeriod,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
        estimatedStartPeriod,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        estimatedEndPeriod,
        startedAt: isOffice ? new Date() : null,
        technicians: {
          create: technicianIds.map((techId: string) => ({
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
    if (isFieldOrder(orderType)) {
      const messageService = new MessageService();
      for (const t of order.technicians) {
        if (t.technician.feishuId) {
          try {
            await messageService.sendNewOrderNotification({
              ...order,
              technician: t.technician,
            });
          } catch (error) {
            // 飞书通知发送失败，记录错误但不影响工单创建
            console.error('发送飞书消息失败:', error instanceof Error ? error.message : error);
          }
        }
      }
    }

    success(res, order, '工单创建成功');
  } catch (error) {
    next(error);
  }
});

// 确认接单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/accept', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        submitter: { select: { feishuId: true } },
        technicians: true,
      },
    });

    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status !== OrderStatus.PENDING) throw ApiError.badRequest('工单状态不正确');

    // 验证是否是分配的技术员
    if (user.role === Role.TECHNICIAN) {
      const isAssigned = order.technicians.some(t => t.technicianId === user.id);
      if (!isAssigned) {
        throw ApiError.forbidden('只能接受分配给自己的工单');
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: OrderStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    // 通知提交人（失败不影响操作）
    if (order.submitter?.feishuId) {
      const messageService = new MessageService();
      try {
        await messageService.sendOrderAcceptedNotification(updated, order.submitter.feishuId);
      } catch (error) {
        console.error('发送飞书消息失败:', error instanceof Error ? error.message : error);
      }
    }

    success(res, updated, '接单成功');
  } catch (error) {
    next(error);
  }
});

// 拒绝接单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/reject', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        submitter: { select: { feishuId: true } },
        technicians: true,
      },
    });

    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status !== OrderStatus.PENDING) throw ApiError.badRequest('工单状态不正确');

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: OrderStatus.REJECTED,
        cancelReason: reason || '技术人员拒绝接单',
      },
    });

    // 通知提交人（失败不影响操作）
    if (order.submitter?.feishuId) {
      const messageService = new MessageService();
      try {
        await messageService.sendOrderRejectedNotification(updated, order.submitter.feishuId, reason);
      } catch (error) {
        console.error('发送飞书消息失败:', error instanceof Error ? error.message : error);
      }
    }

    success(res, updated, '已退回工单');
  } catch (error) {
    next(error);
  }
});

// 开始服务（AUDITOR 和 OTHER 不能操作）
router.post('/:id/start', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status !== OrderStatus.ACCEPTED) throw ApiError.badRequest('请先确认接单');

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: OrderStatus.IN_SERVICE,
        startedAt: new Date(),
      },
    });

    success(res, updated, '开始服务');
  } catch (error) {
    next(error);
  }
});

// 完成服务（AUDITOR 和 OTHER 不能操作）
router.post('/:id/complete', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { serviceSummary } = req.body;

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: { submitter: { select: { feishuId: true } } },
    });

    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status !== OrderStatus.IN_SERVICE) throw ApiError.badRequest('工单状态不正确');

    if (!serviceSummary) {
      throw ApiError.badRequest('请填写服务小结');
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: OrderStatus.DONE,
        serviceSummary,
        completedAt: new Date(),
      },
    });

    // 通知提交人评价（失败不影响操作）
    if (order.submitter?.feishuId) {
      const messageService = new MessageService();
      try {
        await messageService.sendServiceCompletedNotification(updated, order.submitter.feishuId);
      } catch (error) {
        console.error('发送飞书消息失败:', error instanceof Error ? error.message : error);
      }
    }

    success(res, updated, '服务完成');
  } catch (error) {
    next(error);
  }
});

// 取消工单（AUDITOR 和 OTHER 不能操作）
router.post('/:id/cancel', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status === OrderStatus.DONE) throw ApiError.badRequest('已完成的工单无法取消');

    const updated = await prisma.workOrder.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: reason,
      },
    });

    success(res, updated, '工单已取消');
  } catch (error) {
    next(error);
  }
});

// 提交评价（AUDITOR 和 OTHER 不能操作）
router.post('/:id/evaluate', authorize(...canManageOrders), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { qualityRating, responseRating, customerFeedback, improvementSuggestion, recommend } = req.body;
    const user = req.user!;

    const order = await prisma.workOrder.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('工单不存在');
    if (order.status !== OrderStatus.DONE) throw ApiError.badRequest('工单未完成，无法评价');

    // 检查是否已评价
    const existing = await prisma.evaluation.findUnique({ where: { workOrderId: id } });
    if (existing) throw ApiError.badRequest('该工单已评价');

    const evaluation = await prisma.evaluation.create({
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

    success(res, evaluation, '评价提交成功');
  } catch (error) {
    next(error);
  }
});

// ============ 联想输入数据接口 ============

// 客户联想
router.get('/suggest/customers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return success(res, []);
    }

    const records = await prisma.customerRecord.findMany({
      where: {
        name: { contains: keyword as string },
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    success(res, records);
  } catch (error) {
    next(error);
  }
});

// 渠道联想
router.get('/suggest/channels', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return success(res, []);
    }

    const records = await prisma.channelRecord.findMany({
      where: {
        name: { contains: keyword as string },
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    success(res, records);
  } catch (error) {
    next(error);
  }
});

// 厂家对接人联想
router.get('/suggest/manufacturer-contacts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return success(res, []);
    }

    const records = await prisma.manufacturerContactRecord.findMany({
      where: {
        name: { contains: keyword as string },
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    });

    success(res, records);
  } catch (error) {
    next(error);
  }
});

// ============ 辅助函数 ============

async function saveCustomerRecord(name: string, contactPerson?: string, contactPhone?: string) {
  try {
    await prisma.customerRecord.upsert({
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
  } catch (error) {
    console.error('保存客户记录失败', error);
  }
}

async function saveChannelRecord(name: string, contactPerson?: string, contactPhone?: string) {
  try {
    await prisma.channelRecord.upsert({
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
  } catch (error) {
    console.error('保存渠道记录失败', error);
  }
}

async function saveManufacturerContactRecord(name: string) {
  try {
    await prisma.manufacturerContactRecord.upsert({
      where: { name },
      update: {
        usageCount: { increment: 1 },
      },
      create: {
        name,
      },
    });
  } catch (error) {
    console.error('保存厂家对接人记录失败', error);
  }
}

export default router;
