"use strict";
/**
 * 枚举常量定义
 * 由于 SQLite 不支持原生 enum，使用 String + TypeScript 常量实现类型安全
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatusLabel = exports.EstimatedPeriodLabel = exports.PriorityLabel = exports.WorkTypeLabel = exports.OrderTypeLabel = exports.UserStatusLabel = exports.RoleLabel = exports.ResponsibilityRoleLabel = exports.FunctionalRoleLabel = exports.KnowledgeSourceTypeValues = exports.KnowledgeSourceType = exports.OrderStatusValues = exports.OrderStatus = exports.EstimatedPeriodValues = exports.EstimatedPeriod = exports.PriorityWeight = exports.PriorityValues = exports.Priority = exports.WorkTypeValues = exports.WorkType = exports.isOfficeOrder = exports.isFieldOrder = exports.isManufacturerOrder = exports.isCompanyOrder = exports.OrderTypeValues = exports.OrderType = exports.UserStatusValues = exports.UserStatus = exports.ResponsibilityRoleValues = exports.ResponsibilityRole = exports.FunctionalRoleValues = exports.FunctionalRole = exports.RoleValues = exports.Role = void 0;
exports.isValidFunctionalRole = isValidFunctionalRole;
exports.isValidResponsibilityRole = isValidResponsibilityRole;
exports.isValidRole = isValidRole;
exports.isValidUserStatus = isValidUserStatus;
exports.isValidOrderType = isValidOrderType;
exports.isValidWorkType = isValidWorkType;
exports.isValidPriority = isValidPriority;
exports.isValidOrderStatus = isValidOrderStatus;
exports.hasFunctionalRole = hasFunctionalRole;
exports.hasResponsibilityRole = hasResponsibilityRole;
exports.isSystemAdmin = isSystemAdmin;
exports.isAdmin = isAdmin;
exports.isTechnician = isTechnician;
exports.isSales = isSales;
exports.isAuditor = isAuditor;
exports.hasBusinessRole = hasBusinessRole;
exports.hasManagementRole = hasManagementRole;
exports.hasAnyPermission = hasAnyPermission;
exports.hasNoPermission = hasNoPermission;
// ============ 用户角色（旧版，向后兼容） ============
exports.Role = {
    SYSTEM_ADMIN: 'SYSTEM_ADMIN', // 系统管理员
    ADMIN: 'ADMIN', // 管理员
    SALES: 'SALES', // 销售
    TECHNICIAN: 'TECHNICIAN', // 技术员
    AUDITOR: 'AUDITOR', // 审计（只能查看工单，不能管理）
    OTHER: 'OTHER', // 其他（无工单权限）
};
exports.RoleValues = Object.values(exports.Role);
// ============ 功能权限（Function Role） ============
exports.FunctionalRole = {
    TECHNICIAN: 'TECHNICIAN', // 技术人员
    SALES: 'SALES', // 销售人员
};
exports.FunctionalRoleValues = Object.values(exports.FunctionalRole);
// ============ 职责权限（Responsibility Role） ============
exports.ResponsibilityRole = {
    SYSTEM_ADMIN: 'SYSTEM_ADMIN', // 系统管理员
    ADMIN: 'ADMIN', // 管理员
    AUDITOR: 'AUDITOR', // 审计（只读）
    OTHER: 'OTHER', // 其他
};
exports.ResponsibilityRoleValues = Object.values(exports.ResponsibilityRole);
// ============ 用户状态 ============
exports.UserStatus = {
    ACTIVE: 'ACTIVE',
    DISABLED: 'DISABLED',
};
exports.UserStatusValues = Object.values(exports.UserStatus);
// ============ 工单类型 ============
exports.OrderType = {
    CF: 'CF', // 公司外勤 Company Field
    CO: 'CO', // 公司内勤 Company Office
    MF: 'MF', // 厂家外勤 Manufacturer Field
    MO: 'MO', // 厂家内勤 Manufacturer Office
};
exports.OrderTypeValues = Object.values(exports.OrderType);
// 判断是否为公司类型
const isCompanyOrder = (type) => type === exports.OrderType.CF || type === exports.OrderType.CO;
exports.isCompanyOrder = isCompanyOrder;
// 判断是否为厂家类型
const isManufacturerOrder = (type) => type === exports.OrderType.MF || type === exports.OrderType.MO;
exports.isManufacturerOrder = isManufacturerOrder;
// 判断是否为外勤类型
const isFieldOrder = (type) => type === exports.OrderType.CF || type === exports.OrderType.MF;
exports.isFieldOrder = isFieldOrder;
// 判断是否为内勤类型
const isOfficeOrder = (type) => type === exports.OrderType.CO || type === exports.OrderType.MO;
exports.isOfficeOrder = isOfficeOrder;
// ============ 工作类型（仅公司外勤/内勤） ============
exports.WorkType = {
    COMMUNICATION: 'COMMUNICATION', // 交流
    TEST: 'TEST', // 测试
    DELIVERY: 'DELIVERY', // 交付
    ISSUE: 'ISSUE', // 问题处理
    INSPECTION: 'INSPECTION', // 巡检
    TRAINING: 'TRAINING', // 培训
    OTHER: 'OTHER', // 其他
};
exports.WorkTypeValues = Object.values(exports.WorkType);
// ============ 工单优先级 ============
exports.Priority = {
    NORMAL: 'NORMAL', // 普通
    URGENT: 'URGENT', // 紧急
    VERY_URGENT: 'VERY_URGENT', // 非常紧急
};
exports.PriorityValues = Object.values(exports.Priority);
// 优先级排序权重（数字越小优先级越高）
exports.PriorityWeight = {
    [exports.Priority.VERY_URGENT]: 1,
    [exports.Priority.URGENT]: 2,
    [exports.Priority.NORMAL]: 3,
};
// ============ 预计派工时段 ============
exports.EstimatedPeriod = {
    AM: 'AM', // 上午
    PM: 'PM', // 下午
};
exports.EstimatedPeriodValues = Object.values(exports.EstimatedPeriod);
// ============ 工单状态 ============
exports.OrderStatus = {
    PENDING: 'PENDING', // 待接单
    ACCEPTED: 'ACCEPTED', // 已接单
    IN_SERVICE: 'IN_SERVICE', // 服务中
    DONE: 'DONE', // 已完成
    CANCELLED: 'CANCELLED', // 已取消
    REJECTED: 'REJECTED', // 已拒绝
};
exports.OrderStatusValues = Object.values(exports.OrderStatus);
// ============ 知识库来源类型 ============
exports.KnowledgeSourceType = {
    MANUAL: 'manual',
    WORK_ORDER: 'work_order',
};
exports.KnowledgeSourceTypeValues = Object.values(exports.KnowledgeSourceType);
// ============ 验证函数 ============
function isValidFunctionalRole(value) {
    return typeof value === 'string' && exports.FunctionalRoleValues.includes(value);
}
function isValidResponsibilityRole(value) {
    return typeof value === 'string' && exports.ResponsibilityRoleValues.includes(value);
}
function isValidRole(value) {
    return typeof value === 'string' && exports.RoleValues.includes(value);
}
function isValidUserStatus(value) {
    return typeof value === 'string' && exports.UserStatusValues.includes(value);
}
function isValidOrderType(value) {
    return typeof value === 'string' && exports.OrderTypeValues.includes(value);
}
function isValidWorkType(value) {
    return typeof value === 'string' && exports.WorkTypeValues.includes(value);
}
function isValidPriority(value) {
    return typeof value === 'string' && exports.PriorityValues.includes(value);
}
function isValidOrderStatus(value) {
    return typeof value === 'string' && exports.OrderStatusValues.includes(value);
}
// ============ 显示标签（中文） ============
exports.FunctionalRoleLabel = {
    [exports.FunctionalRole.TECHNICIAN]: '技术',
    [exports.FunctionalRole.SALES]: '销售',
};
exports.ResponsibilityRoleLabel = {
    [exports.ResponsibilityRole.SYSTEM_ADMIN]: '系统管理员',
    [exports.ResponsibilityRole.ADMIN]: '管理员',
    [exports.ResponsibilityRole.AUDITOR]: '审计',
    [exports.ResponsibilityRole.OTHER]: '其他',
};
exports.RoleLabel = {
    [exports.Role.SYSTEM_ADMIN]: '系统管理员',
    [exports.Role.ADMIN]: '管理员',
    [exports.Role.SALES]: '销售',
    [exports.Role.TECHNICIAN]: '技术员',
    [exports.Role.AUDITOR]: '审计',
    [exports.Role.OTHER]: '其他',
};
exports.UserStatusLabel = {
    [exports.UserStatus.ACTIVE]: '正常',
    [exports.UserStatus.DISABLED]: '已禁用',
};
exports.OrderTypeLabel = {
    [exports.OrderType.CF]: '公司外勤',
    [exports.OrderType.CO]: '公司内勤',
    [exports.OrderType.MF]: '厂家外勤',
    [exports.OrderType.MO]: '厂家内勤',
};
exports.WorkTypeLabel = {
    [exports.WorkType.COMMUNICATION]: '交流',
    [exports.WorkType.TEST]: '测试',
    [exports.WorkType.DELIVERY]: '交付',
    [exports.WorkType.ISSUE]: '问题处理',
    [exports.WorkType.INSPECTION]: '巡检',
    [exports.WorkType.TRAINING]: '培训',
    [exports.WorkType.OTHER]: '其他',
};
exports.PriorityLabel = {
    [exports.Priority.NORMAL]: '普通',
    [exports.Priority.URGENT]: '紧急',
    [exports.Priority.VERY_URGENT]: '非常紧急',
};
exports.EstimatedPeriodLabel = {
    [exports.EstimatedPeriod.AM]: '上午',
    [exports.EstimatedPeriod.PM]: '下午',
};
exports.OrderStatusLabel = {
    [exports.OrderStatus.PENDING]: '待接单',
    [exports.OrderStatus.ACCEPTED]: '已接单',
    [exports.OrderStatus.IN_SERVICE]: '服务中',
    [exports.OrderStatus.DONE]: '已完成',
    [exports.OrderStatus.CANCELLED]: '已取消',
    [exports.OrderStatus.REJECTED]: '已拒绝',
};
// ============ 权限辅助函数 ============
function hasFunctionalRole(user, role) {
    return user?.functionalRole === role;
}
function hasResponsibilityRole(user, role) {
    return user?.responsibilityRole === role;
}
function isSystemAdmin(user) {
    return user?.responsibilityRole === exports.ResponsibilityRole.SYSTEM_ADMIN;
}
function isAdmin(user) {
    return (user?.responsibilityRole === exports.ResponsibilityRole.ADMIN ||
        user?.responsibilityRole === exports.ResponsibilityRole.SYSTEM_ADMIN);
}
function isTechnician(user) {
    return user?.functionalRole === exports.FunctionalRole.TECHNICIAN;
}
function isSales(user) {
    return user?.functionalRole === exports.FunctionalRole.SALES;
}
function isAuditor(user) {
    return user?.responsibilityRole === exports.ResponsibilityRole.AUDITOR;
}
/**
 * 判断用户是否有业务权限（技术员或销售）
 */
function hasBusinessRole(user) {
    return isTechnician(user) || isSales(user);
}
/**
 * 判断用户是否有管理权限（系统管理员、管理员、审计）
 */
function hasManagementRole(user) {
    return isAdmin(user) || isAuditor(user);
}
/**
 * 判断用户是否有任何有效权限（可以访问业务数据）
 */
function hasAnyPermission(user) {
    return hasBusinessRole(user) || hasManagementRole(user);
}
/**
 * 判断用户是否完全无权限
 */
function hasNoPermission(user) {
    return !hasAnyPermission(user);
}
//# sourceMappingURL=enums.js.map