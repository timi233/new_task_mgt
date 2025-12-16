"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const types_1 = require("../types");
const feishuService_1 = require("../feishu/feishuService");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
// 用户列表（系统管理员可见）
router.get('/', (0, middlewares_1.authorize)('SYSTEM_ADMIN'), async (req, res, next) => {
    try {
        const { role, status } = req.query;
        const { page: pageNum, pageSize: size } = (0, utils_1.sanitizePagination)(req.query.page, req.query.pageSize);
        const keyword = (0, utils_1.sanitizeKeyword)(req.query.keyword);
        const where = {};
        if (role)
            where.role = role;
        if (status)
            where.status = status;
        if (keyword) {
            where.OR = [
                { name: { contains: keyword } },
                { phone: { contains: keyword } },
                { email: { contains: keyword } },
                { department: { contains: keyword } },
            ];
        }
        const [users, total] = await Promise.all([
            utils_1.prisma.user.findMany({
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
            utils_1.prisma.user.count({ where }),
        ]);
        (0, utils_1.paginate)(res, users, total, pageNum, size);
    }
    catch (error) {
        next(error);
    }
});
// 技术人员列表（下拉框）
router.get('/technicians', async (req, res, next) => {
    try {
        const technicians = await utils_1.prisma.user.findMany({
            where: { functionalRole: types_1.FunctionalRole.TECHNICIAN, status: types_1.UserStatus.ACTIVE },
            select: {
                id: true,
                name: true,
                phone: true,
                department: true,
            },
            orderBy: { name: 'asc' },
        });
        (0, utils_1.success)(res, technicians);
    }
    catch (error) {
        next(error);
    }
});
// 销售列表（下拉框）
router.get('/sales', async (req, res, next) => {
    try {
        const sales = await utils_1.prisma.user.findMany({
            where: { functionalRole: types_1.FunctionalRole.SALES, status: types_1.UserStatus.ACTIVE },
            select: {
                id: true,
                name: true,
                phone: true,
                department: true,
            },
            orderBy: { name: 'asc' },
        });
        (0, utils_1.success)(res, sales);
    }
    catch (error) {
        next(error);
    }
});
// 用户详情
router.get('/:id', (0, middlewares_1.authorize)('SYSTEM_ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await utils_1.prisma.user.findUnique({
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
            throw middlewares_1.ApiError.notFound('用户不存在');
        }
        (0, utils_1.success)(res, user);
    }
    catch (error) {
        next(error);
    }
});
// 更新用户角色（系统管理员）
router.put('/:id/role', (0, middlewares_1.authorize)('SYSTEM_ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const currentUser = req.user;
        if (!(0, types_1.isValidRole)(role)) {
            throw middlewares_1.ApiError.badRequest('无效的角色');
        }
        // 不能修改自己的角色
        if (id === currentUser.id) {
            throw middlewares_1.ApiError.badRequest('不能修改自己的角色');
        }
        // 系统管理员角色只能由系统管理员分配
        if (role === types_1.Role.SYSTEM_ADMIN) {
            throw middlewares_1.ApiError.badRequest('不能分配系统管理员角色');
        }
        const user = await utils_1.prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                name: true,
                role: true,
            },
        });
        (0, utils_1.success)(res, user, '角色更新成功');
    }
    catch (error) {
        next(error);
    }
});
// 更新用户状态（系统管理员）
router.put('/:id/status', (0, middlewares_1.authorize)('SYSTEM_ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const currentUser = req.user;
        if (id === currentUser.id) {
            throw middlewares_1.ApiError.badRequest('不能修改自己的状态');
        }
        if (!(0, types_1.isValidUserStatus)(status)) {
            throw middlewares_1.ApiError.badRequest('无效的状态');
        }
        const user = await utils_1.prisma.user.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                name: true,
                status: true,
            },
        });
        (0, utils_1.success)(res, user, status === types_1.UserStatus.ACTIVE ? '用户已启用' : '用户已禁用');
    }
    catch (error) {
        next(error);
    }
});
// 更新个人信息
router.put('/profile', async (req, res, next) => {
    try {
        const user = req.user;
        const { phone, email } = req.body;
        const updated = await utils_1.prisma.user.update({
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
        (0, utils_1.success)(res, updated, '个人信息更新成功');
    }
    catch (error) {
        next(error);
    }
});
// ============ 双重权限分配 API ============
// 更新功能权限（系统管理员 或 管理员）
router.put('/:id/functional-role', (0, middlewares_1.requireEither)([], [types_1.ResponsibilityRole.SYSTEM_ADMIN, types_1.ResponsibilityRole.ADMIN]), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { functionalRole } = req.body;
        const currentUser = req.user;
        // 不能修改自己的权限
        if (id === currentUser.id) {
            throw middlewares_1.ApiError.badRequest('不能修改自己的权限');
        }
        // 验证 functionalRole
        if (functionalRole !== null && !(0, types_1.isValidFunctionalRole)(functionalRole)) {
            throw middlewares_1.ApiError.badRequest('无效的功能权限');
        }
        const user = await utils_1.prisma.user.update({
            where: { id },
            data: { functionalRole },
            select: {
                id: true,
                name: true,
                functionalRole: true,
                responsibilityRole: true,
            },
        });
        (0, utils_1.success)(res, user, '功能权限更新成功');
    }
    catch (error) {
        next(error);
    }
});
// 更新职责权限（仅系统管理员）
router.put('/:id/responsibility-role', (0, middlewares_1.requireResponsibility)(types_1.ResponsibilityRole.SYSTEM_ADMIN), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { responsibilityRole } = req.body;
        const currentUser = req.user;
        // 不能修改自己的权限
        if (id === currentUser.id) {
            throw middlewares_1.ApiError.badRequest('不能修改自己的权限');
        }
        // 验证 responsibilityRole
        if (responsibilityRole !== null && !(0, types_1.isValidResponsibilityRole)(responsibilityRole)) {
            throw middlewares_1.ApiError.badRequest('无效的职责权限');
        }
        const user = await utils_1.prisma.user.update({
            where: { id },
            data: { responsibilityRole },
            select: {
                id: true,
                name: true,
                functionalRole: true,
                responsibilityRole: true,
            },
        });
        (0, utils_1.success)(res, user, '职责权限更新成功');
    }
    catch (error) {
        next(error);
    }
});
// 批量分配权限（仅系统管理员）
router.post('/batch-assign-roles', (0, middlewares_1.requireResponsibility)(types_1.ResponsibilityRole.SYSTEM_ADMIN), async (req, res, next) => {
    try {
        const { userIds, functionalRole, responsibilityRole } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw middlewares_1.ApiError.badRequest('用户ID列表不能为空');
        }
        // 构建更新数据
        const updateData = {};
        if (functionalRole !== undefined) {
            if (functionalRole !== null && !(0, types_1.isValidFunctionalRole)(functionalRole)) {
                throw middlewares_1.ApiError.badRequest('无效的功能权限');
            }
            updateData.functionalRole = functionalRole;
        }
        if (responsibilityRole !== undefined) {
            if (responsibilityRole !== null && !(0, types_1.isValidResponsibilityRole)(responsibilityRole)) {
                throw middlewares_1.ApiError.badRequest('无效的职责权限');
            }
            updateData.responsibilityRole = responsibilityRole;
        }
        const result = await utils_1.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
        });
        (0, utils_1.success)(res, { count: result.count }, `成功分配权限给 ${result.count} 个用户`);
    }
    catch (error) {
        next(error);
    }
});
// 从飞书同步组织架构（系统管理员）
router.post('/sync-feishu', (0, middlewares_1.authorize)('SYSTEM_ADMIN'), async (req, res, next) => {
    try {
        const feishuService = new feishuService_1.FeishuService();
        const result = await syncFeishuOrganization(feishuService);
        (0, utils_1.success)(res, result, `同步完成：新增 ${result.created} 人，跳过 ${result.skipped} 人`);
    }
    catch (error) {
        next(error);
    }
});
// 获取角色选项
router.get('/options/roles', async (req, res, next) => {
    try {
        const roles = [
            { value: types_1.Role.ADMIN, label: '管理员' },
            { value: types_1.Role.SALES, label: '销售' },
            { value: types_1.Role.TECHNICIAN, label: '技术员' },
            { value: types_1.Role.AUDITOR, label: '审计' },
            { value: types_1.Role.OTHER, label: '其他' },
        ];
        (0, utils_1.success)(res, roles);
    }
    catch (error) {
        next(error);
    }
});
async function syncFeishuOrganization(feishuService) {
    let created = 0;
    let skipped = 0; // 改名：跳过已存在用户
    let total = 0;
    const newUsers = []; // 新增：记录新用户
    const processedUserIds = new Set(); // 避免重复处理
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
                const existingUser = await utils_1.prisma.user.findFirst({
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
                const newUser = await utils_1.prisma.user.create({
                    data: {
                        feishuId: member.open_id, // 使用 open_id
                        feishuUnionId: member.union_id,
                        name: member.name || '未知用户',
                        phone,
                        email,
                        avatar,
                        department: dept.name,
                        functionalRole: null, // ⚠️ 默认无功能权限
                        responsibilityRole: null, // ⚠️ 默认无职责权限
                        status: types_1.UserStatus.ACTIVE,
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
    }
    catch (error) {
        console.error('[飞书同步] 失败:', error);
        throw middlewares_1.ApiError.internal('飞书同步失败，请检查配置');
    }
    return { created, skipped, total, newUsers };
}
exports.default = router;
//# sourceMappingURL=user.js.map