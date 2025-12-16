import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma, createModuleLogger } from '../utils';
import { ApprovalService, ApprovalStatus } from '../feishu/approvalService';
import { config } from '../config';

const log = createModuleLogger('feishu-callback');
const router = Router();

/**
 * 验证飞书回调签名
 */
function verifyFeishuSignature(req: Request): boolean {
  const { encryptKey, verificationToken } = config.feishu;

  // 如果配置了 encryptKey，使用签名验证
  if (encryptKey) {
    const timestamp = req.headers['x-lark-request-timestamp'] as string | undefined;
    const nonce = req.headers['x-lark-request-nonce'] as string | undefined;
    const signature = req.headers['x-lark-signature'] as string | undefined;

    if (!timestamp || !nonce || !signature) {
      return false;
    }

    const body = JSON.stringify(req.body);
    const baseString = `${timestamp}${nonce}${encryptKey}${body}`;
    const expected = crypto
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
router.post('/event', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 验证签名
    if (!verifyFeishuSignature(req)) {
      log.warn('验签失败');
      return res.status(403).json({ code: 1002, msg: 'invalid signature' });
    }

    const { type, event } = req.body;

    log.info('收到事件', { type });

    // URL验证（飞书首次配置回调URL时会发送）
    if (type === 'url_verification') {
      const { challenge, token } = req.body;
      // 再次验证 token
      if (config.feishu.verificationToken && token !== config.feishu.verificationToken) {
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
  } catch (error) {
    log.error('处理失败', { error });
    // 即使处理失败，也要返回成功，避免飞书重试
    res.json({ code: 0, msg: 'success' });
  }
});

/**
 * 处理审批状态变更事件
 */
async function handleApprovalEvent(event: any) {
  try {
    const { instance_code, status } = event;

    if (!instance_code) {
      log.warn('审批事件缺少instance_code');
      return;
    }

    log.info('审批状态变更', { instance_code, status });

    // 查找关联的工单
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        approvalInstanceCode: instance_code,
      },
    });

    if (!workOrder) {
      log.warn('未找到关联的工单', { instance_code });
      return;
    }

    // 只处理APPROVED和REJECTED状态
    if (status === 'APPROVED' || status === 'REJECTED') {
      const approvalService = new ApprovalService();
      const result = await approvalService.getApprovalStatus(instance_code);

      if (!result || !result.status) {
        log.error('获取审批详情失败', { instance_code });
        return;
      }

      // 更新工单审批状态
      const updateData: any = {
        approvalStatus: result.status,
      };

      if (result.status === ApprovalStatus.APPROVED && result.actualHours) {
        // 审批通过，保存实际工时
        updateData.actualHours = result.actualHours;
        log.info('审批通过', { orderNo: workOrder.orderNo, actualHours: result.actualHours });
      } else if (result.status === ApprovalStatus.REJECTED && result.rejectReason) {
        // 审批拒绝，保存拒绝原因
        updateData.approvalRejectReason = result.rejectReason;
        log.info('审批拒绝', { orderNo: workOrder.orderNo, reason: result.rejectReason });
      }

      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: updateData,
      });

      log.info('工单审批状态已更新', { orderNo: workOrder.orderNo, status: result.status });
    }
  } catch (error) {
    log.error('处理审批事件失败', { error });
  }
}

export default router;
