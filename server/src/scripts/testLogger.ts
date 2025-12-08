/**
 * 测试日志服务输出效果
 * 运行: npx ts-node src/scripts/testLogger.ts
 */

import { logger, createModuleLogger, LogModule, LogLevel } from '../utils';

console.log('='.repeat(80));
console.log('日志服务测试 - 展示不同级别和模块的日志输出');
console.log('='.repeat(80));
console.log('');

// 1. 使用通用 logger
console.log('【方式1】直接使用 logger：');
console.log('');

logger.error(LogModule.WORK_ORDER, '工单创建失败', {
  reason: '客户信息不完整',
  customerName: '测试客户',
});

logger.warn(LogModule.APPROVAL, '未配置审批模板Code');

logger.info(LogModule.FEISHU, '审批实例创建成功', {
  instanceCode: '54D42D2C-3AA4-462D-8738-8049804DCEB9',
  orderNo: 'CF20251202999',
});

logger.debug(LogModule.DATABASE, 'SQL查询执行', {
  query: 'SELECT * FROM work_orders WHERE status = ?',
  params: ['PENDING'],
});

console.log('');
console.log('-'.repeat(80));
console.log('');

// 2. 使用模块专用日志器（推荐方式）
console.log('【方式2】使用模块专用日志器（推荐）：');
console.log('');

const approvalLog = createModuleLogger(LogModule.APPROVAL);
const orderLog = createModuleLogger(LogModule.WORK_ORDER);
const feishuLog = createModuleLogger(LogModule.FEISHU);

approvalLog.info('接收到外出审批工单', {
  orderNo: 'CF20251202999',
  customerName: '测试客户公司',
});

approvalLog.debug('构造审批表单数据', {
  fields: ['工单编号', '客户名称', '服务内容'],
});

feishuLog.info('调用飞书API创建审批实例');

feishuLog.debug('完整请求数据', {
  approval_code: '1E9D3E8F-15CF-45C9-BC93-2483DDBF9A9A',
  user_id: 'a2e9eg2d',
});

approvalLog.info('审批实例创建成功', {
  instanceCode: '54D42D2C-3AA4-462D-8738-8049804DCEB9',
});

orderLog.info('更新工单审批状态', {
  orderId: 'test-order-001',
  approvalInstanceCode: '54D42D2C-3AA4-462D-8738-8049804DCEB9',
});

console.log('');
console.log('-'.repeat(80));
console.log('');

// 3. 展示错误日志
console.log('【方式3】错误场景展示：');
console.log('');

try {
  throw new Error('飞书API调用超时');
} catch (error: any) {
  feishuLog.error('创建审批实例失败', {
    message: error.message,
    stack: error.stack?.split('\n')[0],
  });
}

approvalLog.warn('预计时间为空，跳过时间区间字段', {
  estimatedStartDate: null,
  estimatedEndDate: null,
});

console.log('');
console.log('-'.repeat(80));
console.log('');

// 4. 演示日志级别过滤
console.log('【方式4】演示日志级别过滤：');
console.log('');

console.log('当前级别：DEBUG（显示所有日志）');
logger.debug(LogModule.SYSTEM, '这是 DEBUG 级别的日志');
logger.info(LogModule.SYSTEM, '这是 INFO 级别的日志');
logger.warn(LogModule.SYSTEM, '这是 WARN 级别的日志');
logger.error(LogModule.SYSTEM, '这是 ERROR 级别的日志');

console.log('');
console.log('设置级别为 INFO（只显示 INFO、WARN、ERROR）...');
logger.setLevel(LogLevel.INFO);

logger.debug(LogModule.SYSTEM, '这条 DEBUG 日志不会显示');
logger.info(LogModule.SYSTEM, '这是 INFO 级别的日志（显示）');
logger.warn(LogModule.SYSTEM, '这是 WARN 级别的日志（显示）');
logger.error(LogModule.SYSTEM, '这是 ERROR 级别的日志（显示）');

console.log('');
console.log('设置级别为 ERROR（只显示 ERROR）...');
logger.setLevel(LogLevel.ERROR);

logger.debug(LogModule.SYSTEM, '这条 DEBUG 日志不会显示');
logger.info(LogModule.SYSTEM, '这条 INFO 日志不会显示');
logger.warn(LogModule.SYSTEM, '这条 WARN 日志不会显示');
logger.error(LogModule.SYSTEM, '这是 ERROR 级别的日志（显示）');

console.log('');
console.log('='.repeat(80));
console.log('测试完成！');
console.log('='.repeat(80));

// 恢复到 DEBUG 级别
logger.setLevel(LogLevel.DEBUG);
