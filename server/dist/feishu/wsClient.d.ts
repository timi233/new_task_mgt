import * as lark from '@larksuiteoapi/node-sdk';
/**
 * 飞书长连接客户端服务
 * 用于接收实时事件推送（审批状态变更等）
 */
export declare class FeishuWSClient {
    private wsClient;
    private client;
    private approvalService;
    constructor();
    /**
     * 启动长连接客户端
     */
    start(): void;
    /**
     * 停止长连接客户端
     */
    stop(): void;
    /**
     * 处理审批事件
     */
    private handleApprovalEvent;
    /**
     * 获取Client实例（用于API调用）
     */
    getClient(): lark.Client;
}
export declare function getFeishuWSClient(): FeishuWSClient;
export declare function startFeishuWSClient(): void;
export declare function stopFeishuWSClient(): void;
//# sourceMappingURL=wsClient.d.ts.map