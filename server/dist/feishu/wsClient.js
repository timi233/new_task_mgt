"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeishuWSClient = void 0;
exports.getFeishuWSClient = getFeishuWSClient;
exports.startFeishuWSClient = startFeishuWSClient;
exports.stopFeishuWSClient = stopFeishuWSClient;
const lark = __importStar(require("@larksuiteoapi/node-sdk"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const approvalService_1 = require("./approvalService");
const log = (0, utils_1.createModuleLogger)(utils_1.LogModule.FEISHU_WS);
/**
 * 飞书长连接客户端服务
 * 用于接收实时事件推送（审批状态变更等）
 */
class FeishuWSClient {
    constructor() {
        this.wsClient = null;
        // 初始化飞书Client（用于API调用）
        this.client = new lark.Client({
            appId: config_1.config.feishu.appId,
            appSecret: config_1.config.feishu.appSecret,
            loggerLevel: config_1.config.isDev ? lark.LoggerLevel.info : lark.LoggerLevel.error,
        });
        this.approvalService = new approvalService_1.ApprovalService();
    }
    /**
     * 启动长连接客户端
     */
    start() {
        try {
            log.info('正在启动长连接客户端');
            // 创建WebSocket长连接客户端
            this.wsClient = new lark.WSClient({
                appId: config_1.config.feishu.appId,
                appSecret: config_1.config.feishu.appSecret,
                loggerLevel: config_1.config.isDev ? lark.LoggerLevel.info : lark.LoggerLevel.error,
            });
            // 创建事件分发器
            const eventDispatcher = new lark.EventDispatcher({
            // 注意：长连接模式下，SDK会自动处理数据解密
            // 如果没有配置encryptKey，SDK会自动忽略
            });
            // 注册审批实例状态变更事件
            eventDispatcher.register({
                'approval.approval_instance': async (data) => {
                    await this.handleApprovalEvent(data);
                },
            });
            // 启动长连接客户端
            this.wsClient.start({
                eventDispatcher,
            });
            log.info('长连接客户端已启动');
            log.info('等待接收审批事件');
        }
        catch (error) {
            log.error('启动长连接客户端失败', { error });
            throw error;
        }
    }
    /**
     * 停止长连接客户端
     */
    stop() {
        if (this.wsClient) {
            log.info('正在停止长连接客户端');
            // 注意：当前SDK版本可能没有stop方法，需要通过进程退出来关闭
            this.wsClient = null;
            log.info('长连接客户端已停止');
        }
    }
    /**
     * 处理审批事件
     */
    async handleApprovalEvent(data) {
        try {
            const { event } = data;
            if (!event) {
                log.warn('审批事件数据为空', { rawData: data });
                return;
            }
            const { instance_code: instanceCode, status, type } = event;
            log.debug('收到审批事件', { instanceCode, status, type });
            if (!instanceCode) {
                log.warn('审批事件缺少实例编码', { status, type });
                return;
            }
            // 查找关联的工单
            const workOrder = await utils_1.prisma.workOrder.findFirst({
                where: {
                    approvalInstanceCode: instanceCode,
                },
            });
            if (!workOrder) {
                log.warn('未找到关联的工单', { instanceCode, status, type });
                return;
            }
            log.info('找到关联工单', {
                instanceCode,
                workOrderId: workOrder.id,
                orderNo: workOrder.orderNo,
            });
            // 只处理APPROVED和REJECTED状态
            if (status === 'APPROVED' || status === 'REJECTED') {
                const result = await this.approvalService.getApprovalStatus(instanceCode);
                if (!result || !result.status) {
                    log.error('获取审批详情失败', {
                        instanceCode,
                        status,
                        workOrderId: workOrder.id,
                        orderNo: workOrder.orderNo,
                    });
                    return;
                }
                // 更新工单审批状态
                const updateData = {
                    approvalStatus: result.status,
                };
                if (result.status === approvalService_1.ApprovalStatus.APPROVED && result.actualHours) {
                    // 审批通过，保存实际工时
                    updateData.actualHours = result.actualHours;
                    log.info('审批通过，记录实际工时', {
                        instanceCode,
                        workOrderId: workOrder.id,
                        orderNo: workOrder.orderNo,
                        actualHours: result.actualHours,
                    });
                }
                else if (result.status === approvalService_1.ApprovalStatus.REJECTED && result.rejectReason) {
                    // 审批拒绝，保存拒绝原因
                    updateData.approvalRejectReason = result.rejectReason;
                    log.info('审批拒绝，记录原因', {
                        instanceCode,
                        workOrderId: workOrder.id,
                        orderNo: workOrder.orderNo,
                        rejectReason: result.rejectReason,
                    });
                }
                await utils_1.prisma.workOrder.update({
                    where: { id: workOrder.id },
                    data: updateData,
                });
                log.info('工单审批状态已更新', {
                    instanceCode,
                    workOrderId: workOrder.id,
                    orderNo: workOrder.orderNo,
                    approvalStatus: result.status,
                });
            }
            else {
                log.debug('审批状态无需处理', { instanceCode, status });
            }
        }
        catch (error) {
            log.error('处理审批事件失败', {
                error,
                instanceCode: data?.event?.instance_code,
                status: data?.event?.status,
            });
        }
    }
    /**
     * 获取Client实例（用于API调用）
     */
    getClient() {
        return this.client;
    }
}
exports.FeishuWSClient = FeishuWSClient;
// 导出单例
let wsClientInstance = null;
function getFeishuWSClient() {
    if (!wsClientInstance) {
        wsClientInstance = new FeishuWSClient();
    }
    return wsClientInstance;
}
function startFeishuWSClient() {
    const client = getFeishuWSClient();
    client.start();
}
function stopFeishuWSClient() {
    if (wsClientInstance) {
        wsClientInstance.stop();
        wsClientInstance = null;
    }
}
//# sourceMappingURL=wsClient.js.map