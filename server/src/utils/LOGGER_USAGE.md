# 日志服务使用指南

## 概述

统一的日志服务提供结构化、分级、带模块标签的日志输出，方便快速定位和排查问题。

## 日志级别

```typescript
LogLevel.ERROR  // 错误：系统故障、异常
LogLevel.WARN   // 警告：潜在问题、降级处理
LogLevel.INFO   // 信息：重要业务流程
LogLevel.DEBUG  // 调试：详细执行信息
```

**开发环境**: 默认显示所有级别（DEBUG 及以上）
**生产环境**: 默认只显示 INFO 及以上

## 基本使用

### 方式1：直接使用 logger

```typescript
import { logger, LogModule } from '../utils';

// ERROR 级别
logger.error(LogModule.APPROVAL, '创建审批实例失败', error);

// WARN 级别
logger.warn(LogModule.FEISHU, '未配置审批模板Code');

// INFO 级别
logger.info(LogModule.WORK_ORDER, '工单创建成功', { orderId, orderNo });

// DEBUG 级别
logger.debug(LogModule.APPROVAL, '审批表单数据', formData);
```

### 方式2：创建模块专用日志器（推荐）

```typescript
import { createModuleLogger, LogModule } from '../utils';

// 在文件顶部创建专用日志器
const log = createModuleLogger(LogModule.APPROVAL);

// 使用
log.error('创建审批实例失败', error);
log.warn('未配置审批模板Code');
log.info('审批实例创建成功', { instanceCode });
log.debug('完整表单数据', formData);
```

## 日志输出示例

```
14:23:45.123 INFO  [工单] 工单创建成功
14:23:45.234 DEBUG [审批] 调用飞书API创建审批实例
14:23:45.456 ERROR [飞书] 创建审批实例失败
{ code: 1390001, msg: '用户ID不正确' }
```

## 模块标签

使用预定义的模块标签保持一致性：

```typescript
LogModule.WORK_ORDER      // 工单
LogModule.APPROVAL        // 审批
LogModule.USER            // 用户
LogModule.CUSTOMER        // 客户
LogModule.EVALUATION      // 评价
LogModule.STATISTICS      // 统计
LogModule.FEISHU          // 飞书
LogModule.FEISHU_WS       // 飞书WS
LogModule.FEISHU_CALLBACK // 飞书回调
LogModule.SERVER          // 服务器
LogModule.DATABASE        // 数据库
LogModule.AUTH            // 认证
LogModule.MIDDLEWARE      // 中间件
LogModule.SYSTEM          // 系统
```

也可以使用自定义字符串：

```typescript
const log = createModuleLogger('自定义模块');
```

## 最佳实践

### 1. 关键业务流程使用 INFO

```typescript
log.info('接收到外出审批工单', { orderNo, customerName });
log.info('审批实例创建成功', { instanceCode });
log.info('工单状态更新为已完成', { orderId });
```

### 2. 潜在问题使用 WARN

```typescript
log.warn('未配置审批模板Code，审批功能将不可用');
log.warn('预计时间为空，跳过时间区间字段');
log.warn('用户未绑定飞书账号', { userId });
```

### 3. 异常错误使用 ERROR

```typescript
log.error('创建审批实例失败', error);
log.error('数据库连接失败', error);
log.error('飞书API调用异常', error.response?.data);
```

### 4. 调试信息使用 DEBUG

```typescript
log.debug('接收到的参数', request);
log.debug('完整表单数据', formData);
log.debug('SQL查询结果', result);
```

### 5. 携带上下文数据

```typescript
// 推荐：携带关键上下文
log.info('工单创建成功', {
  orderId: order.id,
  orderNo: order.orderNo,
  type: order.orderType,
});

// 避免：只有文本消息
log.info(`工单创建成功: ${order.id}`);
```

## 改造现有代码

### 改造前

```typescript
console.log('[审批服务] 接收到的参数:', {
  workOrderId: request.workOrderId,
  orderNo: request.orderNo,
});
console.log('[审批服务] 创建审批实例:', {
  approvalCode: this.approvalCode,
  userId: request.userId,
});
console.error('[审批服务] 创建审批实例失败:', response.data.msg);
```

### 改造后

```typescript
import { createModuleLogger, LogModule } from '../utils';

const log = createModuleLogger(LogModule.APPROVAL);

log.debug('接收到创建审批请求', {
  workOrderId: request.workOrderId,
  orderNo: request.orderNo,
});

log.debug('调用飞书API创建审批实例', {
  approvalCode: this.approvalCode,
  userId: request.userId,
});

log.error('创建审批实例失败', { msg: response.data.msg });
```

## 排查问题的建议流程

### 1. 快速扫描 (INFO 及以上)

```bash
# 设置环境变量，只显示 INFO 及以上
export LOG_LEVEL=INFO
npm run dev
```

在代码中：
```typescript
import { logger, LogLevel } from '../utils';

// 在入口文件设置
logger.setLevel(LogLevel.INFO);
```

快速看到关键业务流程和错误。

### 2. 详细排查 (DEBUG)

```typescript
logger.setLevel(LogLevel.DEBUG);
```

查看完整的执行细节和数据流转。

### 3. 按模块过滤

在日志中搜索模块标签：
```bash
# 只看审批相关
grep "审批" logs.txt

# 只看错误
grep "ERROR" logs.txt

# 看某个工单的完整流程
grep "CF20251202999" logs.txt
```

## 配置选项

```typescript
import { logger, LogLevel } from '../utils';

// 设置日志级别
logger.setLevel(LogLevel.INFO);

// 在生产环境可以通过环境变量控制
const logLevel = process.env.LOG_LEVEL
  ? parseInt(process.env.LOG_LEVEL)
  : LogLevel.INFO;
logger.setLevel(logLevel);
```

## 注意事项

1. **敏感信息**: 不要在日志中记录密码、token等敏感信息
2. **性能**: DEBUG 级别会输出大量信息，生产环境建议使用 INFO
3. **一致性**: 同一模块使用相同的模块标签
4. **上下文**: 重要操作记录关键上下文（订单号、用户ID等）
