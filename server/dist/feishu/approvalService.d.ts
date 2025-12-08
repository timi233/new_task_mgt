export interface CreateApprovalRequest {
    workOrderId: string;
    orderNo: string;
    customerName: string;
    description: string;
    customerContact?: string;
    customerPhone?: string;
    estimatedStartDate?: Date;
    estimatedEndDate?: Date;
    userId: string;
}
export declare enum ApprovalStatus {
    PENDING = "PENDING",// 审批中
    APPROVED = "APPROVED",// 已通过
    REJECTED = "REJECTED"
}
export declare class ApprovalService {
    private feishuService;
    private baseUrl;
    private approvalCode;
    constructor();
    /**
     * 创建外出审批实例
     */
    createApprovalInstance(request: CreateApprovalRequest): Promise<string | null>;
    /**
     * 查询审批实例状态
     */
    getApprovalStatus(instanceCode: string): Promise<{
        status: ApprovalStatus | null;
        actualHours?: number;
        rejectReason?: string;
    } | null>;
    /**
     * 生成审批页面URL（用于前端跳转）
     */
    generateApprovalUrl(instanceCode: string): string;
}
//# sourceMappingURL=approvalService.d.ts.map