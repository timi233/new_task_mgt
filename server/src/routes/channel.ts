import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, ApiError } from '../middlewares';
import { prisma, success, paginate } from '../utils';
import { hasNoPermission, hasManagementRole, isTechnician, isSales } from '../types';

const router = Router();

router.use(authenticate);

/**
 * 构建用户相关工单的渠道名称过滤条件
 */
const buildUserRelatedChannelNames = async (user: any): Promise<string[] | null> => {
  // 管理员/审计可以看所有
  if (hasManagementRole(user)) {
    return null;
  }

  // 技术员：看分配给自己的工单的渠道
  if (isTechnician(user)) {
    const orders = await prisma.workOrder.findMany({
      where: {
        technicians: {
          some: { technicianId: user.id },
        },
        channelName: { not: null },
      },
      select: { channelName: true },
      distinct: ['channelName'],
    });
    return orders.map(o => o.channelName).filter(Boolean) as string[];
  }

  // 销售：看自己提交或关联的工单的渠道
  if (isSales(user)) {
    const orders = await prisma.workOrder.findMany({
      where: {
        OR: [
          { submitterId: user.id },
          { relatedSalesId: user.id },
        ],
        channelName: { not: null },
      },
      select: { channelName: true },
      distinct: ['channelName'],
    });
    return orders.map(o => o.channelName).filter(Boolean) as string[];
  }

  return [];
};

// 渠道列表（分页）
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', keyword } = req.query;
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);
    const user = req.user!;

    // 无权限用户返回空列表
    if (hasNoPermission(user)) {
      return paginate(res, [], 0, pageNum, size);
    }

    const where: any = {};

    // 获取用户可访问的渠道名称列表
    const allowedChannelNames = await buildUserRelatedChannelNames(user);
    if (allowedChannelNames !== null) {
      if (allowedChannelNames.length === 0) {
        return paginate(res, [], 0, pageNum, size);
      }
      where.name = { in: allowedChannelNames };
    }

    if (keyword) {
      where.AND = [
        ...(where.name ? [{ name: where.name }] : []),
        {
          OR: [
            { name: { contains: keyword as string } },
            { contactPerson: { contains: keyword as string } },
            { contactPhone: { contains: keyword as string } },
          ],
        },
      ];
      delete where.name;
    }

    const [channels, total] = await Promise.all([
      prisma.channelRecord.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' }, // 按使用次数排序
          { updatedAt: 'desc' },  // 按更新时间排序
        ],
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.channelRecord.count({ where }),
    ]);

    // 批量查询每个渠道的工单数量
    const channelNames = channels.map(c => c.name);
    const orderCounts = await prisma.workOrder.groupBy({
      by: ['channelName'],
      where: {
        channelName: { in: channelNames },
      },
      _count: {
        id: true,
      },
    });

    // 创建渠道名称到工单数量的映射
    const orderCountMap = new Map(
      orderCounts.map(item => [item.channelName, item._count.id])
    );

    // 为每个渠道添加工单数量
    const channelsWithOrders = channels.map(channel => ({
      ...channel,
      orderCount: orderCountMap.get(channel.name) || 0,
    }));

    paginate(res, channelsWithOrders, total, pageNum, size);
  } catch (error) {
    next(error);
  }
});

// 渠道联想搜索（用于输入框）- 必须在 /:id 之前
router.get('/search/autocomplete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return success(res, []);
    }

    const channels = await prisma.channelRecord.findMany({
      where: {
        OR: [
          { name: { contains: keyword as string } },
          { contactPerson: { contains: keyword as string } },
        ],
      },
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 10, // 最多返回10条
    });

    success(res, channels);
  } catch (error) {
    next(error);
  }
});

// 获取所有渠道选项（用于下拉框）
router.get('/options', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const channels = await prisma.channelRecord.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' },
      ],
    });

    success(res, channels);
  } catch (error) {
    next(error);
  }
});

// 渠道详情
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channelRecord.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new ApiError('渠道不存在', 404);
    }

    // 查询关联工单
    const [allOrderCount, workOrders] = await Promise.all([
      prisma.workOrder.count({
        where: { channelName: channel.name },
      }),
      prisma.workOrder.findMany({
        where: { channelName: channel.name },
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

    // 查询关联客户（通过工单）
    // 1. 获取所有关联工单的客户名称（去重）
    const allChannelOrders = await prisma.workOrder.findMany({
      where: { channelName: channel.name },
      select: { customerName: true },
      distinct: ['customerName'],
    });

    const customerNames = allChannelOrders.map(order => order.customerName);

    // 2. 查询这些客户的详细信息
    const relatedCustomers = await prisma.customerRecord.findMany({
      where: {
        name: { in: customerNames },
      },
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    // 3. 为每个客户添加通过该渠道的工单数量
    const customerOrderCounts = await prisma.workOrder.groupBy({
      by: ['customerName'],
      where: {
        channelName: channel.name,
        customerName: { in: customerNames },
      },
      _count: {
        id: true,
      },
    });

    const customerOrderCountMap = new Map(
      customerOrderCounts.map(item => [item.customerName, item._count.id])
    );

    const customersWithOrderCount = relatedCustomers.map(customer => ({
      ...customer,
      orderCountViaChannel: customerOrderCountMap.get(customer.name) || 0,
    }));

    // 统计数据
    const statistics = {
      totalOrders: allOrderCount,
      recentOrders: formattedOrders.length,
      hasMoreOrders: allOrderCount > formattedOrders.length,
      relatedCustomersCount: relatedCustomers.length,
      totalHours: 0, // TODO: 根据实际需求计算工时
    };

    success(res, {
      ...channel,
      // 最近工单
      recentWorkOrders: formattedOrders,
      // 向后兼容字段
      workOrders: formattedOrders,
      // 关联客户
      relatedCustomers: customersWithOrderCount,
      // 统计数据
      statistics,
    });
  } catch (error) {
    next(error);
  }
});

// 创建渠道
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, region, contactPerson, contactPhone } = req.body;

    if (!name) {
      throw new ApiError('渠道名称不能为空', 400);
    }

    // 检查是否已存在
    const existing = await prisma.channelRecord.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ApiError('渠道已存在', 400);
    }

    const channel = await prisma.channelRecord.create({
      data: {
        name,
        region,
        contactPerson,
        contactPhone,
      },
    });

    success(res, channel, '创建成功');
  } catch (error) {
    next(error);
  }
});

// 更新渠道
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, region, contactPerson, contactPhone } = req.body;

    const existing = await prisma.channelRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError('渠道不存在', 404);
    }

    // 如果修改了名称，检查新名称是否已存在
    if (name && name !== existing.name) {
      const duplicate = await prisma.channelRecord.findUnique({
        where: { name },
      });

      if (duplicate) {
        throw new ApiError('渠道名称已存在', 400);
      }
    }

    const channel = await prisma.channelRecord.update({
      where: { id },
      data: {
        name,
        region,
        contactPerson,
        contactPhone,
      },
    });

    success(res, channel, '更新成功');
  } catch (error) {
    next(error);
  }
});

// 删除渠道
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.channelRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError('渠道不存在', 404);
    }

    await prisma.channelRecord.delete({
      where: { id },
    });

    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
});

export default router;
