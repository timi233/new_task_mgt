/**
 * 枚举常量定义
 * 由于 SQLite 不支持原生 enum，使用 String + TypeScript 常量实现类型安全
 */
export declare const Role: {
    readonly SYSTEM_ADMIN: "SYSTEM_ADMIN";
    readonly ADMIN: "ADMIN";
    readonly SALES: "SALES";
    readonly TECHNICIAN: "TECHNICIAN";
    readonly AUDITOR: "AUDITOR";
    readonly OTHER: "OTHER";
};
export type RoleType = (typeof Role)[keyof typeof Role];
export declare const RoleValues: ("SYSTEM_ADMIN" | "ADMIN" | "SALES" | "TECHNICIAN" | "AUDITOR" | "OTHER")[];
export declare const FunctionalRole: {
    readonly TECHNICIAN: "TECHNICIAN";
    readonly SALES: "SALES";
};
export type FunctionalRoleType = (typeof FunctionalRole)[keyof typeof FunctionalRole];
export declare const FunctionalRoleValues: ("SALES" | "TECHNICIAN")[];
export declare const ResponsibilityRole: {
    readonly SYSTEM_ADMIN: "SYSTEM_ADMIN";
    readonly ADMIN: "ADMIN";
    readonly AUDITOR: "AUDITOR";
    readonly OTHER: "OTHER";
};
export type ResponsibilityRoleType = (typeof ResponsibilityRole)[keyof typeof ResponsibilityRole];
export declare const ResponsibilityRoleValues: ("SYSTEM_ADMIN" | "ADMIN" | "AUDITOR" | "OTHER")[];
export declare const UserStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly DISABLED: "DISABLED";
};
export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
export declare const UserStatusValues: ("ACTIVE" | "DISABLED")[];
export declare const OrderType: {
    readonly CF: "CF";
    readonly CO: "CO";
    readonly MF: "MF";
    readonly MO: "MO";
};
export type OrderTypeType = (typeof OrderType)[keyof typeof OrderType];
export declare const OrderTypeValues: ("CF" | "CO" | "MF" | "MO")[];
export declare const isCompanyOrder: (type: string) => type is "CF" | "CO";
export declare const isManufacturerOrder: (type: string) => type is "MF" | "MO";
export declare const isFieldOrder: (type: string) => type is "CF" | "MF";
export declare const isOfficeOrder: (type: string) => type is "CO" | "MO";
export declare const WorkType: {
    readonly COMMUNICATION: "COMMUNICATION";
    readonly TEST: "TEST";
    readonly DELIVERY: "DELIVERY";
    readonly ISSUE: "ISSUE";
    readonly INSPECTION: "INSPECTION";
    readonly TRAINING: "TRAINING";
    readonly OTHER: "OTHER";
};
export type WorkTypeType = (typeof WorkType)[keyof typeof WorkType];
export declare const WorkTypeValues: ("OTHER" | "COMMUNICATION" | "TEST" | "DELIVERY" | "ISSUE" | "INSPECTION" | "TRAINING")[];
export declare const Priority: {
    readonly NORMAL: "NORMAL";
    readonly URGENT: "URGENT";
    readonly VERY_URGENT: "VERY_URGENT";
};
export type PriorityType = (typeof Priority)[keyof typeof Priority];
export declare const PriorityValues: ("NORMAL" | "URGENT" | "VERY_URGENT")[];
export declare const PriorityWeight: Record<PriorityType, number>;
export declare const EstimatedPeriod: {
    readonly AM: "AM";
    readonly PM: "PM";
};
export type EstimatedPeriodType = (typeof EstimatedPeriod)[keyof typeof EstimatedPeriod];
export declare const EstimatedPeriodValues: ("AM" | "PM")[];
export declare const OrderStatus: {
    readonly PENDING: "PENDING";
    readonly ACCEPTED: "ACCEPTED";
    readonly IN_SERVICE: "IN_SERVICE";
    readonly DONE: "DONE";
    readonly CANCELLED: "CANCELLED";
    readonly REJECTED: "REJECTED";
};
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const OrderStatusValues: ("PENDING" | "ACCEPTED" | "IN_SERVICE" | "DONE" | "CANCELLED" | "REJECTED")[];
export declare const KnowledgeSourceType: {
    readonly MANUAL: "manual";
    readonly WORK_ORDER: "work_order";
};
export type KnowledgeSourceTypeType = (typeof KnowledgeSourceType)[keyof typeof KnowledgeSourceType];
export declare const KnowledgeSourceTypeValues: ("manual" | "work_order")[];
export declare function isValidFunctionalRole(value: unknown): value is FunctionalRoleType;
export declare function isValidResponsibilityRole(value: unknown): value is ResponsibilityRoleType;
export declare function isValidRole(value: unknown): value is RoleType;
export declare function isValidUserStatus(value: unknown): value is UserStatusType;
export declare function isValidOrderType(value: unknown): value is OrderTypeType;
export declare function isValidWorkType(value: unknown): value is WorkTypeType;
export declare function isValidPriority(value: unknown): value is PriorityType;
export declare function isValidOrderStatus(value: unknown): value is OrderStatusType;
export declare const FunctionalRoleLabel: Record<FunctionalRoleType, string>;
export declare const ResponsibilityRoleLabel: Record<ResponsibilityRoleType, string>;
export declare const RoleLabel: Record<RoleType, string>;
export declare const UserStatusLabel: Record<UserStatusType, string>;
export declare const OrderTypeLabel: Record<OrderTypeType, string>;
export declare const WorkTypeLabel: Record<WorkTypeType, string>;
export declare const PriorityLabel: Record<PriorityType, string>;
export declare const EstimatedPeriodLabel: Record<EstimatedPeriodType, string>;
export declare const OrderStatusLabel: Record<OrderStatusType, string>;
export declare function hasFunctionalRole(user: any, role: FunctionalRoleType): boolean;
export declare function hasResponsibilityRole(user: any, role: ResponsibilityRoleType): boolean;
export declare function isSystemAdmin(user: any): boolean;
export declare function isAdmin(user: any): boolean;
export declare function isTechnician(user: any): boolean;
export declare function isSales(user: any): boolean;
export declare function isAuditor(user: any): boolean;
/**
 * 判断用户是否有业务权限（技术员或销售）
 */
export declare function hasBusinessRole(user: any): boolean;
/**
 * 判断用户是否有管理权限（系统管理员、管理员、审计）
 */
export declare function hasManagementRole(user: any): boolean;
/**
 * 判断用户是否有任何有效权限（可以访问业务数据）
 */
export declare function hasAnyPermission(user: any): boolean;
/**
 * 判断用户是否完全无权限
 */
export declare function hasNoPermission(user: any): boolean;
//# sourceMappingURL=enums.d.ts.map