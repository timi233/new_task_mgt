/**
 * 这是使用新日志服务改造后的 approvalService.ts 示例
 * 展示如何替换原有的 console.log/error 为结构化日志
 */
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
    getApprovalStatus(instanceCode: string): Promise<null | undefined>;
}
//# sourceMappingURL=approvalService.example.d.ts.map