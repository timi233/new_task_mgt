import { Router } from 'express';
import authRoutes from './auth';
import workOrderRoutes from './workOrder';
import workbenchRoutes from './workbench';
import statisticsRoutes from './statistics';
import knowledgeRoutes from './knowledge';
import userRoutes from './user';
import customerRoutes from './customer';
import channelRoutes from './channel';
import scheduleRoutes from './schedule';
import feishuCallbackRoutes from './feishuCallback';
import followUpRoutes from './followUp';

const router = Router();

// 认证路由（无需登录）
router.use('/auth', authRoutes);
// 飞书回调路由（无需登录）
router.use('/feishu/callback', feishuCallbackRoutes);

// 以下路由需要登录
router.use('/workorders', workOrderRoutes);
router.use('/workbench', workbenchRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/channels', channelRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/workorders', followUpRoutes);  // 跟进记录（挂载在 /workorders 下）
router.use('/follow-ups', followUpRoutes);  // 附件下载

export default router;
