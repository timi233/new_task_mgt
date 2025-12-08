import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, requireResponsibility, requireEither, AuthRequest, ApiError } from '../middlewares';
import { prisma, success, paginate } from '../utils';
import { Role, UserStatus, FunctionalRole, ResponsibilityRole, FunctionalRoleType, ResponsibilityRoleType, isValidRole, isValidUserStatus, isValidFunctionalRole, isValidResponsibilityRole } from '../types';
import { FeishuService } from '../feishu/feishuService';

const router = Router();

router.use(authenticate);

// 用户列表（系统管理员可见）
router.get('/', authorize('SYSTEM_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', role, status, keyword } = req.query;
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const where: any = {};

    if (role) where.role = role;
    if (status) where.status = status;

    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { phone: { contains: keyword as string } },
        { email: { contains: keyword as string } },
        { department: { contains: keyword as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          feishuId: true,
          name: true,
          phone: true,
          email: true,
          department: true,
          role: true,
          functionalRole: true,
          responsibilityRole: true,
          status: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              submittedOrders: true,
              technicianAssignments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.user.count({ where }),
    ]);

    paginate(res, users, total, pageNum, size);
  } catch (error) {
    next(error);
  }
});

// 技术人员列表（下拉框）
router.get('/technicians', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { functionalRole: FunctionalRole.TECHNICIAN, status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        phone: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    success(res, technicians);
  } catch (error) {
    next(error);
  }
});

// 销售列表（下拉框）
router.get('/sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sales = await prisma.user.findMany({
      where: { functionalRole: FunctionalRole.SALES, status: UserStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        phone: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    success(res, sales);
  } catch (error) {
    next(error);
  }
});

// 用户详情
router.get('/:id', authorize('SYSTEM_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        feishuId: true,
        feishuUnionId: true,
        name: true,
        phone: true,
        email: true,
        department: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            submittedOrders: true,
            technicianAssignments: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('用户不存在');
    }

    success(res, user);
  } catch (error) {
    next(error);
  }
});

// 更新用户角色（系统管理员）
router.put('/:id/role', authorize('SYSTEM_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUser = req.user!;

    if (!isValidRole(role)) {
      throw ApiError.badRequest('无效的角色');
    }

    // 不能修改自己的角色
    if (id === currentUser.id) {
      throw ApiError.badRequest('不能修改自己的角色');
    }

    // 系统管理员角色只能由系统管理员分配
    if (role === Role.SYSTEM_ADMIN) {
      throw ApiError.badRequest('不能分配系统管理员角色');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    success(res, user, '角色更新成功');
  } catch (error) {
    next(error);
  }
});

// 更新用户状态（系统管理员）
router.put('/:id/status', authorize('SYSTEM_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user!;

    if (id === currentUser.id) {
      throw ApiError.badRequest('不能修改自己的状态');
    }

    if (!isValidUserStatus(status)) {
      throw ApiError.badRequest('无效的状态');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    success(res, user, status === UserStatus.ACTIVE ? '用户已启用' : '用户已禁用');
  } catch (error) {
    next(error);
  }
});

// 更新个人信息
router.put('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { phone, email } = req.body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        email,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    success(res, updated, '个人信息更新成功');
  } catch (error) {
    next(error);
  }
});

// ============ 双重权限分配 API ============

// 更新功能权限（系统管理员 或 管理员）
router.put('/:id/functional-role',
  requireEither([], [ResponsibilityRole.SYSTEM_ADMIN, ResponsibilityRole.ADMIN]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { functionalRole } = req.body;
      const currentUser = req.user!;

      // 不能修改自己的权限
      if (id === currentUser.id) {
        throw ApiError.badRequest('不能修改自己的权限');
      }

      // 验证 functionalRole
      if (functionalRole !== null && !isValidFunctionalRole(functionalRole)) {
        throw ApiError.badRequest('无效的功能权限');
      }

      const user = await prisma.user.update({
        where: { id },
        data: { functionalRole },
        select: {
          id: true,
          name: true,
          functionalRole: true,
          responsibilityRole: true,
        },
      });

      success(res, user, '功能权限更新成功');
    } catch (error) {
      next(error);
    }
  }
);

// 更新职责权限（仅系统管理员）
router.put('/:id/responsibility-role',
  requireResponsibility(ResponsibilityRole.SYSTEM_ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { responsibilityRole } = req.body;
      const currentUser = req.user!;

      // 不能修改自己的权限
      if (id === currentUser.id) {
        throw ApiError.badRequest('不能修改自己的权限');
      }

      // 验证 responsibilityRole
      if (responsibilityRole !== null && !isValidResponsibilityRole(responsibilityRole)) {
        throw ApiError.badRequest('无效的职责权限');
      }

      const user = await prisma.user.update({
        where: { id },
        data: { responsibilityRole },
        select: {
          id: true,
          name: true,
          functionalRole: true,
          responsibilityRole: true,
        },
      });

      success(res, user, '职责权限更新成功');
    } catch (error) {
      next(error);
    }
  }
);

// 批量分配权限（仅系统管理员）
router.post('/batch-assign-roles',
  requireResponsibility(ResponsibilityRole.SYSTEM_ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userIds, functionalRole, responsibilityRole } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw ApiError.badRequest('用户ID列表不能为空');
      }

      // 构建更新数据
      const updateData: any = {};
      if (functionalRole !== undefined) {
        if (functionalRole !== null && !isValidFunctionalRole(functionalRole)) {
          throw ApiError.badRequest('无效的功能权限');
        }
        updateData.functionalRole = functionalRole;
      }
      if (responsibilityRole !== undefined) {
        if (responsibilityRole !== null && !isValidResponsibilityRole(responsibilityRole)) {
          throw ApiError.badRequest('无效的职责权限');
        }
        updateData.responsibilityRole = responsibilityRole;
      }

      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: updateData,
      });

      success(res, { count: result.count }, `成功分配权限给 ${result.count} 个用户`);
    } catch (error) {
      next(error);
    }
  }
);

// 从飞书同步组织架构（系统管理员）
router.post('/sync-feishu', authorize('SYSTEM_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const feishuService = new FeishuService();
    const result = await syncFeishuOrganization(feishuService);

    success(res, result, `同步完成：新增 ${result.created} 人，跳过 ${result.skipped} 人`);
  } catch (error) {
    next(error);
  }
});

// 获取角色选项
router.get('/options/roles', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = [
      { value: Role.ADMIN, label: '管理员' },
      { value: Role.SALES, label: '销售' },
      { value: Role.TECHNICIAN, label: '技术员' },
      { value: Role.AUDITOR, label: '审计' },
      { value: Role.OTHER, label: '其他' },
    ];
    success(res, roles);
  } catch (error) {
    next(error);
  }
});

// ============ 飞书同步辅助函数 ============

interface SyncResult {
  created: number;
  skipped: number; // 改名：跳过已存在的用户
  total: number;
  newUsers: string[]; // 新增：新用户列表（用于通知）
}

async function syncFeishuOrganization(feishuService: FeishuService): Promise<SyncResult> {
  let created = 0;
  let skipped = 0; // 改名：跳过已存在用户
  let total = 0;
  const newUsers: string[] = []; // 新增：记录新用户
  const processedUserIds = new Set<string>(); // 避免重复处理

  try {
    // 获取飞书部门列表
    console.log('[飞书同步] 开始获取部门列表...');
    const departments = await feishuService.getDepartments();
    console.log(`[飞书同步] 获取到 ${departments.length} 个部门`);

    if (departments.length === 0) {
      console.log('[飞书同步] 未获取到任何部门，请检查飞书应用权限');
      return { created: 0, skipped: 0, total: 0, newUsers: [] };
    }

    // 遍历每个部门，获取成员
    for (const dept of departments) {
      console.log(`[飞书同步] 处理部门: ${dept.name} (${dept.open_department_id})`);
      const members = await feishuService.getDepartmentMembers(dept.open_department_id);
      console.log(`[飞书同步] 部门 ${dept.name} 有 ${members.length} 个成员`);

      for (const member of members) {
        // 避免重复处理同一用户（可能在多个部门）
        // 使用 open_id 作为唯一标识（与登录时获取的一致）
        if (processedUserIds.has(member.open_id)) {
          continue;
        }
        processedUserIds.add(member.open_id);
        total++;

        // 提取手机号（去掉国际区号前缀 +86）
        const phone = member.mobile?.replace(/^\+86/, '') || null;
        // 优先使用企业邮箱
        const email = member.enterprise_email || member.email || null;
        // 获取头像
        const avatar = member.avatar?.avatar_origin || null;

        // find_by_department API 已返回完整用户信息，无需再调用 getUserInfo
        console.log(`[飞书同步] 处理用户: ${member.name} (open_id: ${member.open_id})`);

        // 检查用户是否已存在（多种匹配方式）
        // 1. 通过 open_id 匹配（登录时创建的用户用的是 open_id）
        // 2. 通过 union_id 匹配
        // 3. 通过手机号匹配（兼容旧数据）
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { feishuId: member.open_id },
              { feishuUnionId: member.union_id },
              ...(phone ? [{ phone }, { phone: `+86${phone}` }] : []),
            ],
          },
        });

        if (existingUser) {
          // ⚠️ 重要变更：存在则跳过，不更新
          skipped++;
          console.log(`[飞书同步] 跳过已存在用户: ${member.name} (ID: ${existingUser.id})`);
          continue;
        }

        // ⚠️ 重要变更：新用户默认无权限
        const newUser = await prisma.user.create({
          data: {
            feishuId: member.open_id, // 使用 open_id
            feishuUnionId: member.union_id,
            name: member.name || '未知用户',
            phone,
            email,
            avatar,
            department: dept.name,
            functionalRole: null,      // ⚠️ 默认无功能权限
            responsibilityRole: null,  // ⚠️ 默认无职责权限
            status: UserStatus.ACTIVE,
          },
        });
        created++;
        newUsers.push(newUser.name); // 记录新用户
        console.log(`[飞书同步] 创建新用户: ${member.name}（无权限，待管理员分配）`);
      }
    }

    console.log(`[飞书同步] 完成! 新增: ${created}, 跳过: ${skipped}, 总计: ${total}`);
    if (newUsers.length > 0) {
      console.log(`[飞书同步] 新增用户列表: ${newUsers.join(', ')}`);
    }
  } catch (error) {
    console.error('[飞书同步] 失败:', error);
    throw ApiError.internal('飞书同步失败，请检查配置');
  }

  return { created, skipped, total, newUsers };
}

export default router;
