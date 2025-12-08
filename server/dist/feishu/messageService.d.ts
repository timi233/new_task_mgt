export interface WorkOrderForMessage {
    id: string;
    orderNo: string;
    orderType: string;
    description?: string | null;
    priority?: string | null;
    customerName: string;
    customerContact?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    technicians?: Array<{
        technician: {
            id: string;
            name: string;
            feishuId?: string | null;
        };
    }>;
    technician?: {
        id: string;
        name: string;
        feishuId?: string | null;
    };
    submitter?: {
        id: string;
        name: string;
        feishuId?: string | null;
    };
    serviceSummary?: string | null;
    completedAt?: Date | null;
}
interface MessageContext {
    orderId: string;
    orderNo: string;
    msgType: string;
    cardTitle: string;
}
export declare class MessageService {
    private feishuService;
    private baseUrl;
    private log;
    constructor();
    private sendCardMessage;
    private getTechnicianNames;
    private getFirstTechnicianFeishuId;
    /**
     * MSG-01: 新工单通知（发给技术人员）
     *
     * @param order 工单信息
     * @param context 消息上下文（用于日志追踪）
     * @returns 当且仅当所有技术人员都通知成功时返回 true
     *          部分失败会记录 WARN 日志但仍返回 false
     */
    sendNewOrderNotification(order: WorkOrderForMessage, context: MessageContext): Promise<boolean>;
    private sendNewOrderCard;
    sendOrderAcceptedNotification(order: WorkOrderForMessage, salesFeishuId: string, context: MessageContext): Promise<boolean>;
    sendOrderRejectedNotification(order: WorkOrderForMessage, salesFeishuId: string, context: MessageContext, reason?: string): Promise<boolean>;
    sendServiceCompletedNotification(order: WorkOrderForMessage, salesFeishuId: string, context: MessageContext): Promise<boolean>;
    sendEvaluationReminder(order: WorkOrderForMessage, salesFeishuId: string, context: MessageContext): Promise<boolean>;
}
export {};
//# sourceMappingURL=messageService.d.ts.map