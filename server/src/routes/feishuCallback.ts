import { Router, Request, Response, NextFunction } from 'express';
import { prisma, success } from '../utils';
import { ApprovalService, ApprovalStatus } from '../feishu/approvalService';
import { config } from '../config';

const router = Router();

/**
 * 飞书事件回调接口
 * 用于接收审批状态变更等事件
 */
router.post('/event', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, event } = req.body;

    console.log('[飞书回调] 收到事件:', type);

    // URL验证（飞书首次配置回调URL时会发送）
    if (type === 'url_verification') {
      const { challenge } = req.body;
      return res.json({ challenge });
    }

    // 审批状态变更事件
    if (type === 'event_callback' && event?.type === 'approval_instance') {
      await handleApprovalEvent(event);
    }

    // 响应成功
    res.json({ code: 0, msg: 'success' });
  } catch (error) {
    console.error('[飞书回调] 处理失败:', error);
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
      console.warn('[飞书回调] 审批事件缺少instance_code');
      return;
    }

    console.log('[飞书回调] 审批状态变更:', { instance_code, status });

    // 查找关联的工单
    const workOrder = await prisma.workOrder.findFirst({
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
      const approvalService = new ApprovalService();
      const result = await approvalService.getApprovalStatus(instance_code);

      if (!result || !result.status) {
        console.error('[飞书回调] 获取审批详情失败');
        return;
      }

      // 更新工单审批状态
      const updateData: any = {
        approvalStatus: result.status,
      };

      if (result.status === ApprovalStatus.APPROVED && result.actualHours) {
        // 审批通过，保存实际工时
        updateData.actualHours = result.actualHours;
        console.log('[飞书回调] 审批通过，工时:', result.actualHours);
      } else if (result.status === ApprovalStatus.REJECTED && result.rejectReason) {
        // 审批拒绝，保存拒绝原因
        updateData.approvalRejectReason = result.rejectReason;
        console.log('[飞书回调] 审批拒绝，原因:', result.rejectReason);
      }

      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: updateData,
      });

      console.log('[飞书回调] 工单审批状态已更新:', workOrder.orderNo);
    }
  } catch (error) {
    console.error('[飞书回调] 处理审批事件失败:', error);
  }
}

export default router;
