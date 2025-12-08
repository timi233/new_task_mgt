/**
 * 枚举常量定义
 * 前后端共享类型，保持一致性
 */

// ============ 用户角色 ============
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

// 可查看工单的角色（不包括 OTHER）
export const canViewOrderRoles = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.SALES, Role.TECHNICIAN, Role.AUDITOR];
// 可管理工单的角色（不包括 AUDITOR 和 OTHER）
export const canManageOrderRoles = [Role.SYSTEM_ADMIN, Role.ADMIN, Role.SALES, Role.TECHNICIAN];

// ============ 功能权限（Functional Role） ============
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

// ============ 权限辅助函数 ============
export function hasFunctionalRole(role: FunctionalRoleType | null, target: FunctionalRoleType): boolean {
  return role === target;
}

export function hasResponsibilityRole(role: ResponsibilityRoleType | null, target: ResponsibilityRoleType): boolean {
  return role === target;
}

export function isSystemAdmin(user: any): boolean {
  return user?.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN;
}

export function isAdmin(user: any): boolean {
  return user?.responsibilityRole === ResponsibilityRole.ADMIN || isSystemAdmin(user);
}

export function isTechnician(user: any): boolean {
  return user?.functionalRole === FunctionalRole.TECHNICIAN;
}

export function isSales(user: any): boolean {
  return user?.functionalRole === FunctionalRole.SALES;
}


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

// ============ 显示标签（中文） ============

export const RoleLabel: Record<RoleType, string> = {
  [Role.SYSTEM_ADMIN]: '系统管理员',
  [Role.ADMIN]: '管理员',
  [Role.SALES]: '销售',
  [Role.TECHNICIAN]: '技术员',
  [Role.AUDITOR]: '审计',
  [Role.OTHER]: '其他',
};

export const FunctionalRoleLabel: Record<string, string> = {
  [FunctionalRole.TECHNICIAN]: '技术',
  [FunctionalRole.SALES]: '销售',
  'null': '无',
};

export const ResponsibilityRoleLabel: Record<string, string> = {
  [ResponsibilityRole.SYSTEM_ADMIN]: '系统管理员',
  [ResponsibilityRole.ADMIN]: '管理员',
  [ResponsibilityRole.AUDITOR]: '审计',
  [ResponsibilityRole.OTHER]: '其他',
  'null': '无',
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

// 优先级颜色（Vant 主题色）
export const PriorityColor: Record<PriorityType, string> = {
  [Priority.NORMAL]: '#1989fa',  // primary
  [Priority.URGENT]: '#ff976a',  // warning
  [Priority.VERY_URGENT]: '#ee0a24', // danger
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

// 工单状态颜色
export const OrderStatusColor: Record<OrderStatusType, string> = {
  [OrderStatus.PENDING]: '#ff976a',    // warning
  [OrderStatus.ACCEPTED]: '#1989fa',   // primary
  [OrderStatus.IN_SERVICE]: '#07c160', // success
  [OrderStatus.DONE]: '#969799',       // gray
  [OrderStatus.CANCELLED]: '#969799',  // gray
  [OrderStatus.REJECTED]: '#ee0a24',   // danger
};

// ============ 下拉选项（用于 Vant Picker/Select） ============

export const RoleOptions = RoleValues.filter(v => v !== Role.SYSTEM_ADMIN).map(value => ({
  value,
  text: RoleLabel[value],
}));

export const UserStatusOptions = UserStatusValues.map(value => ({
  value,
  text: UserStatusLabel[value],
}));

export const OrderTypeOptions = OrderTypeValues.map(value => ({
  value,
  text: OrderTypeLabel[value],
}));

export const WorkTypeOptions = WorkTypeValues.map(value => ({
  value,
  text: WorkTypeLabel[value],
}));

export const PriorityOptions = PriorityValues.map(value => ({
  value,
  text: PriorityLabel[value],
}));

export const EstimatedPeriodOptions = EstimatedPeriodValues.map(value => ({
  value,
  text: EstimatedPeriodLabel[value],
}));

export const OrderStatusOptions = OrderStatusValues.map(value => ({
  value,
  text: OrderStatusLabel[value],
}));

export const FunctionalRoleOptions = [
  { value: null, text: '无' },
  ...FunctionalRoleValues.map(value => ({
    value,
    text: FunctionalRoleLabel[value],
  })),
];

export const ResponsibilityRoleOptions = ResponsibilityRoleValues.map(value => ({
  value,
  text: ResponsibilityRoleLabel[value],
}));
