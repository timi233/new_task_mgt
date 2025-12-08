interface FeishuUserInfo {
    open_id: string;
    user_id: string;
    name: string;
    mobile?: string;
    email?: string;
    avatar_url?: string;
}
export declare class FeishuService {
    private baseUrl;
    private tenantAccessToken;
    private tokenExpireTime;
    getTenantAccessToken(): Promise<string>;
    getUserByCode(code: string): Promise<FeishuUserInfo>;
    getUserIdByMobile(mobile: string): Promise<string | null>;
    getDepartments(parentId?: string): Promise<any[]>;
    getDepartmentMembers(departmentId: string): Promise<any[]>;
    getUserInfo(userId: string): Promise<any | null>;
}
export {};
//# sourceMappingURL=feishuService.d.ts.map