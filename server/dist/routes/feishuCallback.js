"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../utils");
const approvalService_1 = require("../feishu/approvalService");
const config_1 = require("../config");
const router = (0, express_1.Router)();
/**
 * 验证飞书回调签名
 */
function verifyFeishuSignature(req) {
    const { encryptKey, verificationToken } = config_1.config.feishu;
    // 如果配置了 encryptKey，使用签名验证
    if (encryptKey) {
        const timestamp = req.headers['x-lark-request-timestamp'];
        const nonce = req.headers['x-lark-request-nonce'];
        const signature = req.headers['x-lark-signature'];
        if (!timestamp || !nonce || !signature) {
            return false;
        }
        const body = JSON.stringify(req.body);
        const baseString = `${timestamp}${nonce}${encryptKey}${body}`;
        const expected = crypto_1.default
            .createHash('sha256')
            .update(baseString)
            .digest('hex');
        if (signature !== expected) {
            return false;
        }
    }
    // 验证 token（v1 事件或 url_verification）
    const bodyToken = req.body?.token || req.body?.header?.token;
    if (verificationToken && bodyToken && bodyToken !== verificationToken) {
        return false;
    }
    return true;
}
/**
 * 飞书事件回调接口
 * 用于接收审批状态变更等事件
 */
router.post('/event', async (req, res, next) => {
    try {
        // 验证签名
        if (!verifyFeishuSignature(req)) {
            console.warn('[飞书回调] 验签失败');
            return res.status(403).json({ code: 1002, msg: 'invalid signature' });
        }
        const { type, event } = req.body;
        console.log('[飞书回调] 收到事件:', type);
        // URL验证（飞书首次配置回调URL时会发送）
        if (type === 'url_verification') {
            const { challenge, token } = req.body;
            // 再次验证 token
            if (config_1.config.feishu.verificationToken && token !== config_1.config.feishu.verificationToken) {
                return res.status(403).json({ code: 1002, msg: 'invalid token' });
            }
            return res.json({ challenge });
        }
        // 审批状态变更事件
        if (type === 'event_callback' && event?.type === 'approval_instance') {
            await handleApprovalEvent(event);
        }
        // 响应成功
        res.json({ code: 0, msg: 'success' });
    }
    catch (error) {
        console.error('[飞书回调] 处理失败:', error);
        // 即使处理失败，也要返回成功，避免飞书重试
        res.json({ code: 0, msg: 'success' });
    }
});
/**
 * 处理审批状态变更事件
 */
async function handleApprovalEvent(event) {
    try {
        const { instance_code, status } = event;
        if (!instance_code) {
            console.warn('[飞书回调] 审批事件缺少instance_code');
            return;
        }
        console.log('[飞书回调] 审批状态变更:', { instance_code, status });
        // 查找关联的工单
        const workOrder = await utils_1.prisma.workOrder.findFirst({
            where: {
                approvalInstanceCode: instance_code,
            },
        });
        if (!workOrder) {
            console.warn('[飞书回调] 未找到关联的工单:', instance_code);
            return;
        }
        // 只处理APPROVED和REJECTED状态
        if (status === 'APPROVED' || status === 'REJECTED') {
            const approvalService = new approvalService_1.ApprovalService();
            const result = await approvalService.getApprovalStatus(instance_code);
            if (!result || !result.status) {
                console.error('[飞书回调] 获取审批详情失败');
                return;
            }
            // 更新工单审批状态
            const updateData = {
                approvalStatus: result.status,
            };
            if (result.status === approvalService_1.ApprovalStatus.APPROVED && result.actualHours) {
                // 审批通过，保存实际工时
                updateData.actualHours = result.actualHours;
                console.log('[飞书回调] 审批通过，工时:', result.actualHours);
            }
            else if (result.status === approvalService_1.ApprovalStatus.REJECTED && result.rejectReason) {
                // 审批拒绝，保存拒绝原因
                updateData.approvalRejectReason = result.rejectReason;
                console.log('[飞书回调] 审批拒绝，原因:', result.rejectReason);
            }
            await utils_1.prisma.workOrder.update({
                where: { id: workOrder.id },
                data: updateData,
            });
            console.log('[飞书回调] 工单审批状态已更新:', workOrder.orderNo);
        }
    }
    catch (error) {
        console.error('[飞书回调] 处理审批事件失败:', error);
    }
}
exports.default = router;
//# sourceMappingURL=feishuCallback.js.map