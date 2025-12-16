"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const axios_1 = __importDefault(require("axios"));
const feishuService_1 = require("./feishuService");
const utils_1 = require("../utils");
// 工单类型显示映射
const orderTypeMap = {
    CF: '公司外勤',
    CO: '公司内勤',
    MF: '厂家外勤',
    MO: '厂家内勤',
};
// 优先级显示映射
const priorityMap = {
    VERY_URGENT: '🔴 非常紧急',
    URGENT: '🟠 紧急',
    NORMAL: '🟢 普通',
};
class MessageService {
    constructor() {
        this.baseUrl = 'https://open.feishu.cn/open-apis';
        this.log = (0, utils_1.createModuleLogger)(utils_1.LogModule.FEISHU_MESSAGE);
        this.feishuService = new feishuService_1.FeishuService();
    }
    // 发送消息卡片
    async sendCardMessage(receiveId, card, receiveIdType = 'open_id', context) {
        try {
            const token = await this.feishuService.getTenantAccessToken();
            const response = await axios_1.default.post(`${this.baseUrl}/im/v1/messages`, {
                receive_id: receiveId,
                msg_type: 'interactive',
                content: JSON.stringify(card),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                params: {
                    receive_id_type: receiveIdType,
                },
            });
            if (response.data.code !== 0) {
                this.log.error('发送飞书消息失败', {
                    error: new Error(response.data.msg),
                    receiveId,
                    receiveIdType,
                    code: response.data.code,
                    message: response.data.msg,
                    ...context,
                });
                return false;
            }
            return true;
        }
        catch (error) {
            this.log.error('发送飞书消息异常', {
                error,
                receiveId,
                receiveIdType,
                ...context,
            });
            return false;
        }
    }
    // 获取技术人员名称列表
    getTechnicianNames(order) {
        if (order.technicians && order.technicians.length > 0) {
            return order.technicians.map(t => t.technician.name).join('、');
        }
        return order.technician?.name || '-';
    }
    // 获取第一个技术人员的飞书 ID（用于发送消息）
    getFirstTechnicianFeishuId(order) {
        if (order.technicians && order.technicians.length > 0) {
            return order.technicians[0].technician.feishuId || null;
        }
        return order.technician?.feishuId || null;
    }
    /**
     * MSG-01: 新工单通知（发给技术人员）
     *
     * @param order 工单信息
     * @param context 消息上下文（用于日志追踪）
     * @returns 当且仅当所有技术人员都通知成功时返回 true
     *          部分失败会记录 WARN 日志但仍返回 false
     */
    async sendNewOrderNotification(order, context) {
        // 向所有分配的技术人员发送通知
        const results = [];
        if (order.technicians && order.technicians.length > 0) {
            for (const assignment of order.technicians) {
                if (assignment.technician.feishuId) {
                    const result = await this.sendNewOrderCard(order, assignment.technician.feishuId, context);
                    results.push(result);
                }
            }
        }
        else if (order.technician?.feishuId) {
            const result = await this.sendNewOrderCard(order, order.technician.feishuId, context);
            results.push(result);
        }
        // 检查是否所有技术人员都通知成功
        const allSuccess = results.length > 0 && results.every(Boolean);
        if (!allSuccess && results.length > 0) {
            this.log.warn('存在未被通知的技术人员', {
                ...context,
                successCount: results.filter(Boolean).length,
                totalCount: results.length,
            });
        }
        return allSuccess;
    }
    async sendNewOrderCard(order, technicianFeishuId, context) {
        const card = {
            config: {
                wide_screen_mode: true,
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: '📋 新工单待接收',
                },
                template: 'blue',
            },
            elements: [
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单编号**\n${order.orderNo}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**优先级**\n${priorityMap[order.priority || 'NORMAL']}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单类型**\n${orderTypeMap[order.orderType] || order.orderType}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**客户名称**\n${order.customerName || '-'}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**联系人**\n${order.customerContact || '-'}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**联系电话**\n${order.customerPhone || '-'}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: `**提交人**\n${order.submitter?.name || '-'}`,
                    },
                },
                ...(order.customerAddress ? [{
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: `**地址**\n${order.customerAddress}`,
                        },
                    }] : []),
                ...(order.description ? [{
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: `**问题描述**\n${order.description}`,
                        },
                    }] : []),
                {
                    tag: 'hr',
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '✅ 确认接单',
                            },
                            type: 'primary',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}?action=accept`,
                        },
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '❌ 拒绝接单',
                            },
                            type: 'danger',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}?action=reject`,
                        },
                    ],
                },
            ],
        };
        return this.sendCardMessage(technicianFeishuId, card, 'open_id', context);
    }
    // MSG-03: 接单确认通知（发给销售/提交人）
    async sendOrderAcceptedNotification(order, salesFeishuId, context) {
        const card = {
            config: {
                wide_screen_mode: true,
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: '✅ 工单已被接收',
                },
                template: 'green',
            },
            elements: [
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单编号**\n${order.orderNo}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**技术人员**\n${this.getTechnicianNames(order)}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单类型**\n${orderTypeMap[order.orderType] || order.orderType}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**客户名称**\n${order.customerName || '-'}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'hr',
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '查看详情',
                            },
                            type: 'default',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}`,
                        },
                    ],
                },
            ],
        };
        return this.sendCardMessage(salesFeishuId, card, 'open_id', context);
    }
    // MSG-04: 拒绝接单通知（发给销售/提交人）
    async sendOrderRejectedNotification(order, salesFeishuId, context, reason) {
        const card = {
            config: {
                wide_screen_mode: true,
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: '❌ 工单被退回',
                },
                template: 'red',
            },
            elements: [
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单编号**\n${order.orderNo}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**技术人员**\n${this.getTechnicianNames(order)}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: `**客户名称**\n${order.customerName || '-'}`,
                    },
                },
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: `**退回原因**\n${reason || '未填写原因'}`,
                    },
                },
                {
                    tag: 'hr',
                },
                {
                    tag: 'note',
                    elements: [
                        {
                            tag: 'plain_text',
                            content: '请重新分配技术人员或与技术人员沟通',
                        },
                    ],
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '重新派单',
                            },
                            type: 'primary',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}/reassign`,
                        },
                    ],
                },
            ],
        };
        return this.sendCardMessage(salesFeishuId, card, 'open_id', context);
    }
    // MSG-05: 服务完成通知（发给销售/提交人）
    async sendServiceCompletedNotification(order, salesFeishuId, context) {
        const card = {
            config: {
                wide_screen_mode: true,
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: '🎉 服务已完成',
                },
                template: 'green',
            },
            elements: [
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单编号**\n${order.orderNo}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**技术人员**\n${this.getTechnicianNames(order)}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单类型**\n${orderTypeMap[order.orderType] || order.orderType}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**客户名称**\n${order.customerName || '-'}`,
                            },
                        },
                    ],
                },
                ...(order.serviceSummary ? [{
                        tag: 'div',
                        text: {
                            tag: 'lark_md',
                            content: `**服务小结**\n${order.serviceSummary}`,
                        },
                    }] : []),
                {
                    tag: 'hr',
                },
                {
                    tag: 'note',
                    elements: [
                        {
                            tag: 'plain_text',
                            content: '请及时对本次服务进行评价',
                        },
                    ],
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '立即评价',
                            },
                            type: 'primary',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}/evaluate`,
                        },
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '查看详情',
                            },
                            type: 'default',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}`,
                        },
                    ],
                },
            ],
        };
        return this.sendCardMessage(salesFeishuId, card, 'open_id', context);
    }
    // MSG-06: 评价提醒（定时任务发送）
    async sendEvaluationReminder(order, salesFeishuId, context) {
        const card = {
            config: {
                wide_screen_mode: true,
            },
            header: {
                title: {
                    tag: 'plain_text',
                    content: '⏰ 评价提醒',
                },
                template: 'orange',
            },
            elements: [
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: `您有一个工单尚未评价，请及时处理`,
                    },
                },
                {
                    tag: 'div',
                    fields: [
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**工单编号**\n${order.orderNo}`,
                            },
                        },
                        {
                            is_short: true,
                            text: {
                                tag: 'lark_md',
                                content: `**客户名称**\n${order.customerName || '-'}`,
                            },
                        },
                    ],
                },
                {
                    tag: 'div',
                    text: {
                        tag: 'lark_md',
                        content: `**工单类型**\n${orderTypeMap[order.orderType] || order.orderType}`,
                    },
                },
                {
                    tag: 'hr',
                },
                {
                    tag: 'action',
                    actions: [
                        {
                            tag: 'button',
                            text: {
                                tag: 'plain_text',
                                content: '立即评价',
                            },
                            type: 'primary',
                            url: `${process.env.WEB_URL || 'http://localhost:5173'}/order/${order.id}/evaluate`,
                        },
                    ],
                },
            ],
        };
        return this.sendCardMessage(salesFeishuId, card, 'open_id', context);
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=messageService.js.map