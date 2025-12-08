/**
 * 枚举常量定义
 * 由于 SQLite 不支持原生 enum，使用 String + TypeScript 常量实现类型安全
 */

// ============ 用户角色（旧版，向后兼容） ============
export const Role = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN', // 系统管理员
  ADMIN: 'ADMIN',               // 管理员
  SALES: 'SALES',               // 销售
  TECHNICIAN: 'TECHNICIAN',     // 技术员
  AUDITOR: 'AUDITOR',           // 审计（只能查看工单，不能管理）
  OTHER: 'OTHER',               // 其他（无工单权限）
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
export const RoleValues = Object.values(Role);
// ============ 功能权限（Function Role） ============
export const FunctionalRole = {
  TECHNICIAN: 'TECHNICIAN',  // 技术人员
  SALES: 'SALES',           // 销售人员
} as const;

export type FunctionalRoleType = (typeof FunctionalRole)[keyof typeof FunctionalRole];
export const FunctionalRoleValues = Object.values(FunctionalRole);

// ============ 职责权限（Responsibility Role） ============
export const ResponsibilityRole = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',  // 系统管理员
  ADMIN: 'ADMIN',                // 管理员
  AUDITOR: 'AUDITOR',            // 审计（只读）
  OTHER: 'OTHER',                // 其他
} as const;

export type ResponsibilityRoleType = (typeof ResponsibilityRole)[keyof typeof ResponsibilityRole];
export const ResponsibilityRoleValues = Object.values(ResponsibilityRole);


// ============ 用户状态 ============
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
export const UserStatusValues = Object.values(UserStatus);

// ============ 工单类型 ============
export const OrderType = {
  CF: 'CF', // 公司外勤 Company Field
  CO: 'CO', // 公司内勤 Company Office
  MF: 'MF', // 厂家外勤 Manufacturer Field
  MO: 'MO', // 厂家内勤 Manufacturer Office
} as const;

export type OrderTypeType = (typeof OrderType)[keyof typeof OrderType];
export const OrderTypeValues = Object.values(OrderType);

// 判断是否为公司类型
export const isCompanyOrder = (type: string) =>
  type === OrderType.CF || type === OrderType.CO;

// 判断是否为厂家类型
export const isManufacturerOrder = (type: string) =>
  type === OrderType.MF || type === OrderType.MO;

// 判断是否为外勤类型
export const isFieldOrder = (type: string) =>
  type === OrderType.CF || type === OrderType.MF;

// 判断是否为内勤类型
export const isOfficeOrder = (type: string) =>
  type === OrderType.CO || type === OrderType.MO;

// ============ 工作类型（仅公司外勤/内勤） ============
export const WorkType = {
  COMMUNICATION: 'COMMUNICATION', // 交流
  TEST: 'TEST',                   // 测试
  DELIVERY: 'DELIVERY',           // 交付
  ISSUE: 'ISSUE',                 // 问题处理
  INSPECTION: 'INSPECTION',       // 巡检
  TRAINING: 'TRAINING',           // 培训
  OTHER: 'OTHER',                 // 其他
} as const;

export type WorkTypeType = (typeof WorkType)[keyof typeof WorkType];
export const WorkTypeValues = Object.values(WorkType);

// ============ 工单优先级 ============
export const Priority = {
  NORMAL: 'NORMAL',           // 普通
  URGENT: 'URGENT',           // 紧急
  VERY_URGENT: 'VERY_URGENT', // 非常紧急
} as const;

export type PriorityType = (typeof Priority)[keyof typeof Priority];
export const PriorityValues = Object.values(Priority);

// 优先级排序权重（数字越小优先级越高）
export const PriorityWeight: Record<PriorityType, number> = {
  [Priority.VERY_URGENT]: 1,
  [Priority.URGENT]: 2,
  [Priority.NORMAL]: 3,
};

// ============ 预计派工时段 ============
export const EstimatedPeriod = {
  AM: 'AM', // 上午
  PM: 'PM', // 下午
} as const;

export type EstimatedPeriodType = (typeof EstimatedPeriod)[keyof typeof EstimatedPeriod];
export const EstimatedPeriodValues = Object.values(EstimatedPeriod);

// ============ 工单状态 ============
export const OrderStatus = {
  PENDING: 'PENDING',       // 待接单
  ACCEPTED: 'ACCEPTED',     // 已接单
  IN_SERVICE: 'IN_SERVICE', // 服务中
  DONE: 'DONE',             // 已完成
  CANCELLED: 'CANCELLED',   // 已取消
  REJECTED: 'REJECTED',     // 已拒绝
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export const OrderStatusValues = Object.values(OrderStatus);

// ============ 知识库来源类型 ============
export const KnowledgeSourceType = {
  MANUAL: 'manual',
  WORK_ORDER: 'work_order',
} as const;

export type KnowledgeSourceTypeType = (typeof KnowledgeSourceType)[keyof typeof KnowledgeSourceType];
export const KnowledgeSourceTypeValues = Object.values(KnowledgeSourceType);

// ============ 验证函数 ============


export function isValidFunctionalRole(value: unknown): value is FunctionalRoleType {
  return typeof value === 'string' && FunctionalRoleValues.includes(value as FunctionalRoleType);
}

export function isValidResponsibilityRole(value: unknown): value is ResponsibilityRoleType {
  return typeof value === 'string' && ResponsibilityRoleValues.includes(value as ResponsibilityRoleType);
}

export function isValidRole(value: unknown): value is RoleType {
  return typeof value === 'string' && RoleValues.includes(value as RoleType);
}

export function isValidUserStatus(value: unknown): value is UserStatusType {
  return typeof value === 'string' && UserStatusValues.includes(value as UserStatusType);
}

export function isValidOrderType(value: unknown): value is OrderTypeType {
  return typeof value === 'string' && OrderTypeValues.includes(value as OrderTypeType);
}

export function isValidWorkType(value: unknown): value is WorkTypeType {
  return typeof value === 'string' && WorkTypeValues.includes(value as WorkTypeType);
}

export function isValidPriority(value: unknown): value is PriorityType {
  return typeof value === 'string' && PriorityValues.includes(value as PriorityType);
}

export function isValidOrderStatus(value: unknown): value is OrderStatusType {
  return typeof value === 'string' && OrderStatusValues.includes(value as OrderStatusType);
}

// ============ 显示标签（中文） ============


export const FunctionalRoleLabel: Record<FunctionalRoleType, string> = {
  [FunctionalRole.TECHNICIAN]: '技术',
  [FunctionalRole.SALES]: '销售',
};

export const ResponsibilityRoleLabel: Record<ResponsibilityRoleType, string> = {
  [ResponsibilityRole.SYSTEM_ADMIN]: '系统管理员',
  [ResponsibilityRole.ADMIN]: '管理员',
  [ResponsibilityRole.AUDITOR]: '审计',
  [ResponsibilityRole.OTHER]: '其他',
};

export const RoleLabel: Record<RoleType, string> = {
  [Role.SYSTEM_ADMIN]: '系统管理员',
  [Role.ADMIN]: '管理员',
  [Role.SALES]: '销售',
  [Role.TECHNICIAN]: '技术员',
  [Role.AUDITOR]: '审计',
  [Role.OTHER]: '其他',
};

export const UserStatusLabel: Record<UserStatusType, string> = {
  [UserStatus.ACTIVE]: '正常',
  [UserStatus.DISABLED]: '已禁用',
};

export const OrderTypeLabel: Record<OrderTypeType, string> = {
  [OrderType.CF]: '公司外勤',
  [OrderType.CO]: '公司内勤',
  [OrderType.MF]: '厂家外勤',
  [OrderType.MO]: '厂家内勤',
};

export const WorkTypeLabel: Record<WorkTypeType, string> = {
  [WorkType.COMMUNICATION]: '交流',
  [WorkType.TEST]: '测试',
  [WorkType.DELIVERY]: '交付',
  [WorkType.ISSUE]: '问题处理',
  [WorkType.INSPECTION]: '巡检',
  [WorkType.TRAINING]: '培训',
  [WorkType.OTHER]: '其他',
};

export const PriorityLabel: Record<PriorityType, string> = {
  [Priority.NORMAL]: '普通',
  [Priority.URGENT]: '紧急',
  [Priority.VERY_URGENT]: '非常紧急',
};

export const EstimatedPeriodLabel: Record<EstimatedPeriodType, string> = {
  [EstimatedPeriod.AM]: '上午',
  [EstimatedPeriod.PM]: '下午',
};

export const OrderStatusLabel: Record<OrderStatusType, string> = {
  [OrderStatus.PENDING]: '待接单',
  [OrderStatus.ACCEPTED]: '已接单',
  [OrderStatus.IN_SERVICE]: '服务中',
  [OrderStatus.DONE]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.REJECTED]: '已拒绝',
};

// ============ 权限辅助函数 ============

export function hasFunctionalRole(user: any, role: FunctionalRoleType): boolean {
  return user?.functionalRole === role;
}

export function hasResponsibilityRole(user: any, role: ResponsibilityRoleType): boolean {
  return user?.responsibilityRole === role;
}

export function isSystemAdmin(user: any): boolean {
  return user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN;
}

export function isAdmin(user: any): boolean {
  return (
    user?.responsibilityRole === ResponsibilityRole.ADMIN ||
    user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN
  );
}

export function isTechnician(user: any): boolean {
  return user?.functionalRole === FunctionalRole.TECHNICIAN;
}

export function isSales(user: any): boolean {
  return user?.functionalRole === FunctionalRole.SALES;
}

export function isAuditor(user: any): boolean {
  return user?.responsibilityRole === ResponsibilityRole.AUDITOR;
}

/**
 * 判断用户是否有业务权限（技术员或销售）
 */
export function hasBusinessRole(user: any): boolean {
  return isTechnician(user) || isSales(user);
}

/**
 * 判断用户是否有管理权限（系统管理员、管理员、审计）
 */
export function hasManagementRole(user: any): boolean {
  return isAdmin(user) || isAuditor(user);
}

/**
 * 判断用户是否有任何有效权限（可以访问业务数据）
 */
export function hasAnyPermission(user: any): boolean {
  return hasBusinessRole(user) || hasManagementRole(user);
}

/**
 * 判断用户是否完全无权限
 */
export function hasNoPermission(user: any): boolean {
  return !hasAnyPermission(user);
}

