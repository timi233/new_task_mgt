import { Router } from 'express';
import authRoutes from './auth';
import workOrderRoutes from './workOrder';
import workbenchRoutes from './workbench';
import statisticsRoutes from './statistics';
import knowledgeRoutes from './knowledge';
import userRoutes from './user';
import customerRoutes from './customer';

const router = Router();

// 认证路由（无需登录）
router.use('/auth', authRoutes);

// 以下路由需要登录
router.use('/workorders', workOrderRoutes);
router.use('/workbench', workbenchRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);

export default router;
