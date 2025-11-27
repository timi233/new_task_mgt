import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, ApiError } from '../middlewares';
import { prisma, success, paginate } from '../utils';

const router = Router();

router.use(authenticate);

// 客户列表（分页）
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', keyword } = req.query;
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const where: any = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { contactPerson: { contains: keyword as string } },
        { contactPhone: { contains: keyword as string } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customerRecord.findMany({
        where,
        orderBy: [
          { usageCount: 'desc' }, // 按使用次数排序
          { updatedAt: 'desc' },  // 按更新时间排序
        ],
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.customerRecord.count({ where }),
    ]);

    // 批量查询每个客户的工单数量
    const customerNames = customers.map(c => c.name);
    const orderCounts = await prisma.workOrder.groupBy({
      by: ['customerName'],
      where: {
        customerName: { in: customerNames },
      },
      _count: {
        id: true,
      },
    });

    // 创建客户名称到工单数量的映射
    const orderCountMap = new Map(
      orderCounts.map(item => [item.customerName, item._count.id])
    );

    // 为每个客户添加工单数量
    const customersWithOrders = customers.map(customer => ({
      ...customer,
      orderCount: orderCountMap.get(customer.name) || 0,
    }));

    paginate(res, customersWithOrders, total, pageNum, size);
  } catch (error) {
    next(error);
  }
});

// 客户联想搜索（用于输入框）- 必须在 /:id 之前
router.get('/search/autocomplete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return success(res, []);
    }

    const customers = await prisma.customerRecord.findMany({
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

    success(res, customers);
  } catch (error) {
    next(error);
  }
});

// 客户详情
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customerRecord.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new ApiError('客户不存在', 404);
    }

    // 查询该客户的工单（通过客户名称匹配）
    const workOrders = await prisma.workOrder.findMany({
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
    });

    // 格式化工单数据
    const formattedOrders = workOrders.map(order => ({
      ...order,
      technicianList: order.technicians.map(t => t.technician),
    }));

    // 统计数据
    const statistics = {
      totalOrders: workOrders.length,
      totalHours: 0, // TODO: 根据实际需求计算工时
    };

    success(res, {
      ...customer,
      workOrders: formattedOrders,
      statistics,
    });
  } catch (error) {
    next(error);
  }
});

// 创建客户
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, contactPerson, contactPhone } = req.body;

    if (!name) {
      throw new ApiError('客户名称不能为空', 400);
    }

    // 检查是否已存在
    const existing = await prisma.customerRecord.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ApiError('客户已存在', 400);
    }

    const customer = await prisma.customerRecord.create({
      data: {
        name,
        contactPerson,
        contactPhone,
      },
    });

    success(res, customer, '创建成功');
  } catch (error) {
    next(error);
  }
});

// 更新客户
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, contactPhone } = req.body;

    const existing = await prisma.customerRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError('客户不存在', 404);
    }

    // 如果修改了名称，检查新名称是否已存在
    if (name && name !== existing.name) {
      const duplicate = await prisma.customerRecord.findUnique({
        where: { name },
      });

      if (duplicate) {
        throw new ApiError('客户名称已存在', 400);
      }
    }

    const customer = await prisma.customerRecord.update({
      where: { id },
      data: {
        name,
        contactPerson,
        contactPhone,
      },
    });

    success(res, customer, '更新成功');
  } catch (error) {
    next(error);
  }
});

// 删除客户
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customerRecord.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError('客户不存在', 404);
    }

    await prisma.customerRecord.delete({
      where: { id },
    });

    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
});

export default router;
