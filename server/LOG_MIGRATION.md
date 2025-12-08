# 日志系统改造记录

## 📋 改造概览

### 改造目标
将后端console.log/console.error统一替换为结构化日志系统，提升生产环境可观测性。

### 改造方案
采用**方案1（逐步改造）**：核心模块 → 第三方集成 → 其他模块

### 改造原则
1. 导入统一日志模块：`import { createModuleLogger, LogModule } from '../utils'`
2. 初始化模块级logger：`const log = createModuleLogger(LogModule.XXX)`
3. 统一error对象格式：`{ error }`
4. 添加完整业务上下文字段

---

## ✅ 已完成模块 (5个)

### 1. approvalService.ts - 审批服务
- **改造时间**：第一批
- **替换数量**：13处 console → log
- **改造内容**：
  - ✅ 导入日志模块
  - ✅ 初始化logger: `LogModule.APPROVAL`
  - ✅ 替换所有console调用
  - ✅ 添加业务上下文：approvalId、status、feishuId等
- **质量评价**：生产级标准（已通过codex review）

### 2. workOrder.ts - 工单路由
- **改造时间**：第一批
- **替换数量**：11处 console → log（含9处额外改进）
- **改造内容**：
  - ✅ 导入日志模块
  - ✅ 初始化logger: `LogModule.WORK_ORDER`
  - ✅ 替换所有console调用
  - ✅ 添加业务上下文：orderId、orderNo、userId等
  - ✅ 补充type字段
- **质量评价**：生产级标准（已通过codex review）

### 3. feishuService.ts - 飞书服务
- **改造时间**：第一批
- **替换数量**：17处 console → log
- **改造内容**：
  - ✅ 导入日志模块
  - ✅ 初始化logger: `LogModule.FEISHU`
  - ✅ 替换所有console调用
  - ✅ 添加业务上下文：feishuId、code、requestId等
- **质量评价**：生产级标准（已通过codex review）

### 4. wsClient.ts - WebSocket客户端
- **改造时间**：第一批
- **替换数量**：17处 console → log
- **改造内容**：
  - ✅ 导入日志模块
  - ✅ 初始化logger: `LogModule.FEISHU_WS`
  - ✅ 替换所有console调用
  - ✅ 添加业务上下文：eventType、connectionId等
  - ✅ 补充type字段
- **质量评价**：生产级标准（已通过codex review）

### 5. messageService.ts - 飞书消息服务
- **改造时间**：2025-12-03
- **替换数量**：2处 console.error → log.error
- **改造内容**：
  - ✅ 新增 LogModule.FEISHU_MESSAGE 枚举
  - ✅ 导入日志模块
  - ✅ 初始化logger: `LogModule.FEISHU_MESSAGE`
  - ✅ 替换sendCardMessage中2处console.error
  - ✅ 添加基础上下文：receiveId、receiveIdType、code、message
- **日志改造Review结果**：
  - ✅ LogModule导出链正确
  - ✅ logger初始化方式正确
  - ⚠️ **待改进**：缺少业务标识（orderId/orderNo）、request_id等诊断信息
  - ⚠️ **待改进**：AxiosError序列化丢失信息
  - ⚠️ **待改进**：避免人为构造Error对象

- **业务逻辑Review结果（2025-12-03）**：
  - ✅ **已修复-Critical**：部分发送成功被误判为完全成功（messageService.ts:142）
    - 原问题：`results.some(r => r)` 导致只要1个技术人员成功就返回true
    - 修复方案：改为 `results.every(Boolean)` 确保所有人都通知成功
    - 新增日志：部分失败时记录 successCount/totalCount
    - 业务说明：当前依赖销售人工口头沟通兜底，消息漏发风险可接受

- **日志上下文改进（2025-12-03）**：
  - ✅ **已完成**：context 参数必填化
    - 修改范围：5个公共方法 + 1个私有方法
    - 改进效果：编译期强制传入完整业务上下文（orderId, orderNo, msgType, cardTitle）
    - 代码简洁性：消除5处重复的 context 构建代码
    - 类型安全：TypeScript 编译器自动检查参数完整性
  - ✅ **已完成**：所有调用点同步更新
    - workOrder.ts:313 - sendNewOrderNotification
    - workOrder.ts:384 - sendOrderAcceptedNotification
    - workOrder.ts:508 - sendOrderRejectedNotification
    - workOrder.ts:592 - sendServiceCompletedNotification
  - ✅ **效果验证**：编译通过，无类型错误
  - 🟠 **High**：receive_id_type硬编码可能导致ID类型不匹配（messageService.ts:82）
    - 问题：硬编码'open_id'，但getUserIdByMobile返回user_id
    - 影响：若存储user_id则所有消息发送失败
    - 待验证：查看数据库schema确认feishuId实际类型
  - 🟠 **High**：错误信息丢失，无法诊断（messageService.ts:88-105）
    - 问题：只返回false，丢失request_id、HTTP状态码等诊断信息
    - 影响：生产环境故障无法排查，无法联系飞书技术支持
  - 🟠 **High**：缺少重试和降级策略
    - 问题：网络抖动、API限流等瞬时故障导致消息永久丢失
    - 影响：飞书服务短暂不可用时大面积漏发通知
  - 🟡 **Medium**：嵌套字段缺少空值保护（messageService.ts:112, 132）
    - 问题：`t.technician.name` 等直接访问可能抛运行时错误
    - 影响：脏数据导致整个通知链路中断
  - 🟡 **Medium**：卡片内容映射缺少fallback（messageService.ts:172, 184）
    - 问题：未知枚举值显示undefined，长文本未限制长度
    - 影响：用户看到破损卡片或超出飞书API限制
  - ⚪ **Low**：card payload类型为any，缺少类型约束
  - ⚪ **Low**：多技术人员发送采用顺序for await，可改为并发

---

## 📊 改造统计

### 总体进度
```
✅ 已完成：5个模块
📝 改造数量：60处 console语句
🎯 质量标准：企业生产级
```

### 分类统计
| 模块类别 | 已完成 | 待完成 |
|---------|-------|-------|
| 核心业务模块 | 2 (approvalService, workOrder) | - |
| 第三方集成 | 3 (feishuService, wsClient, messageService) | - |
| 其他模块 | 0 | 待定 |

---

## 🔍 Codex Review - messageService.ts

### Review时间
2025-12-03

### 主要发现

#### [中-高] 缺少业务上下文
- **位置**：`src/feishu/messageService.ts:88`
- **问题**：日志只包含 receiveId/receiveIdType/code/msg，缺少 orderId/orderNo、MSG编号、卡片类型等
- **影响**：多条消息同时失败时无法定位具体工单
- **优先级**：高

#### [中] 缺少飞书API诊断信息
- **位置**：`src/feishu/messageService.ts:88`
- **问题**：未记录 request_id、HTTP状态码、response.data原文、baseUrl/msg_type
- **影响**：真实问题发生时运维无法将request_id提供给飞书侧排查
- **优先级**：中

#### [中] AxiosError序列化问题
- **位置**：`src/feishu/messageService.ts:100`
- **问题**：catch块中的error可能是AxiosError，序列化后丢失config/response
- **建议**：记录cardMeta与axiosError.toJSON()
- **优先级**：中

#### [低] Error对象构造方式
- **位置**：`src/feishu/messageService.ts:88`
- **问题**：`new Error(response.data.msg)` 既没有HTTP堆栈，也重复message
- **建议**：将response.data挂在details字段，而不是伪造Error对象
- **优先级**：低

### 改进建议

#### 方案1：contextBuilder参数（✅ 已实施 - 2025-12-03）
**优势**：
- 实现简单，快速补齐业务上下文
- 不需要大规模重构

**实施步骤**：
```typescript
// ✅ 已完成：为 sendCardMessage 和所有公共方法增加 context 参数（必填）
private async sendCardMessage(
  receiveId: string,
  card: any,
  receiveIdType: string = 'open_id',
  context: MessageContext  // 必填参数
): Promise<boolean> {
  // 失败时展开context
  this.log.error('发送飞书消息失败', {
    error: new Error(response.data.msg),
    receiveId,
    receiveIdType,
    code: response.data.code,
    message: response.data.msg,
    ...context  // 补充业务上下文
  });
}

// ✅ 所有公共方法签名已更新：
// - sendNewOrderNotification(order, context)
// - sendOrderAcceptedNotification(order, salesFeishuId, context)
// - sendOrderRejectedNotification(order, salesFeishuId, context, reason?)
// - sendServiceCompletedNotification(order, salesFeishuId, context)
// - sendEvaluationReminder(order, salesFeishuId, context)
```

**实施结果**：
- ✅ 编译期强制要求传入完整业务上下文
- ✅ 消除5处重复的 context 构建代码
- ✅ 所有调用点已更新（workOrder.ts 4处）
- ✅ TypeScript 类型检查确保参数完整性

#### 方案2：Axios拦截器（长期）
**优势**：
- 统一处理飞书API错误
- 可复用到其他飞书调用
- 集中记录request_id/headers/config

**实施步骤**：
1. 创建飞书专用axios实例
2. 添加响应拦截器捕获非0 code
3. 添加错误拦截器记录异常
4. MessageService只负责语义化message

#### 方案3：扩展logger（最佳）
**优势**：
- 长期提升可观测性
- 支持结构化payload
- 直接输出axiosError.toJSON()

**实施步骤**：
1. 扩展logger支持JSON.stringify(card, replacer)限长
2. 添加payload哈希
3. 支持AxiosError特殊处理

### 验证结果

#### ✅ LogModule导出链验证
1. `src/utils/logger.ts:26` - 定义 FEISHU_MESSAGE
2. `src/utils/index.ts:4` - re-export LogModule
3. `src/feishu/messageService.ts:3,58` - 成功引入并实例化

#### ⚠️ 待确认事项
1. 飞书API最新schema（网络受限，未能访问官方文档）
2. request_id字段命名规范
3. 卡片内容写日志的合规范围（需与安全团队确认）
4. 真实线上日志采集格式

### 后续行动

#### 立即执行（日志改进）
- [x] ✅ **已完成（2025-12-03）**：实施方案1：为sendCardMessage添加context参数
  - 将 context 参数设为必填
  - 修改5个公共方法签名
  - 更新所有4个调用点
  - 编译验证通过
- [ ] 记录request_id等飞书API诊断信息
- [ ] 避免构造空洞的Error对象

#### 立即执行（Critical业务问题）
- [x] ✅ **已完成**：与业务确认成功语义（当前依赖人工兜底，可接受）
- [x] ✅ **已完成**：修复部分发送成功判定逻辑（改为.every()并添加日志）
- [ ] **待确认**：验证数据库feishuId字段的实际类型（open_id vs user_id）

#### 短期计划（High级别修复）
- [ ] 改造sendCardMessage抛出FeishuMessageError而非返回false
- [ ] 在错误日志中记录完整的response.data和request_id
- [ ] 实施重试策略：对可重试错误（网络抖动、429限流）进行有限次数重试
- [ ] 添加飞书服务降级方案（短信/邮件备用通知）
- [ ] 修复receive_id_type硬编码问题，支持open_id和user_id动态传入

#### 短期计划（Medium级别修复）
- [ ] 添加嵌套字段空值保护（可选链 + 数据验证）
- [ ] 为卡片内容映射添加fallback默认值
- [ ] 限制长文本字段长度（description等）防止超出飞书限制
- [ ] 在sendNewOrderNotification中添加"无有效接收人"的警告日志

#### 短期计划（日志相关）
- [ ] 与安全/运维确认可记录的业务字段范围
- [ ] 对card内容进行脱敏/截断
- [ ] 完善AxiosError处理

#### 长期规划
- [ ] 查阅飞书官方文档确认最佳实践
- [ ] 考虑实施Axios拦截器方案统一处理飞书API错误
- [ ] 建立日志告警机制
- [ ] 引入TypeScript类型约束替换any（Card payload）
- [ ] 优化多技术人员发送为并发模式（Promise.allSettled）
- [ ] 建立消息发送失败的补偿队列机制

---

## 🚀 未来优化方案：消息发送重试队列（待实施）

### 背景说明
**当前状态**：消息发送失败后无重试机制，依赖销售人工口头沟通兜底
**业务风险**：当前可接受（销售会人工沟通后派工）
**未来需求**：当业务量增长或需要更高可靠性时实施

### 方案选择：方案2-场景A（Redis队列 + 自动补偿）

#### 技术架构
```
┌─────────────┐
│ MessageService │
│ sendNewOrder   │ ──┐
└─────────────┘   │
                   │ (部分失败)
                   ↓
            ┌──────────────┐
            │ RetryQueue   │
            │ (Redis/Bull) │
            └──────────────┘
                   │
                   │ (定期扫描)
                   ↓
            ┌──────────────┐
            │ RetryWorker  │
            │ (后台任务)   │
            └──────────────┘
                   │
                   ↓
            ┌──────────────┐
            │ 重试发送     │
            │ 指数退避     │
            └──────────────┘
```

#### 实施前提条件
1. ✅ 安装 Redis 服务器
2. ✅ 安装 npm 依赖：`bull`, `@types/bull`, `ioredis`
3. ✅ 配置 Redis 连接信息
4. ✅ 部署后台 Worker 进程

#### 工期评估
- **开发时间**：3-5个工作日
- **测试时间**：1-2个工作日
- **总工期**：约1周

#### 核心代码框架

**1. 队列服务 (src/services/messageRetryQueue.ts)**
```typescript
import Queue from 'bull';
import { config } from '../config';
import { MessageService } from '../feishu/messageService';
import { createModuleLogger, LogModule } from '../utils';

const log = createModuleLogger(LogModule.FEISHU_MESSAGE);

export interface RetryJob {
  orderId: string;
  orderNo: string;
  failedRecipients: Array<{
    technicianId: string;
    technicianName: string;
    feishuId: string;
    error: any;
  }>;
}

export class MessageRetryQueue {
  private queue: Queue.Queue<RetryJob>;
  private messageService: MessageService;

  constructor() {
    this.queue = new Queue('message-retry', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1分钟起始延迟
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.messageService = new MessageService();
    this.setupProcessor();
  }

  private setupProcessor() {
    // 并发处理3个任务
    this.queue.process(3, async (job) => {
      log.info('开始处理重试任务', {
        jobId: job.id,
        orderId: job.data.orderId,
        attemptsMade: job.attemptsMade,
      });

      return this.processRetry(job.data);
    });

    // 监听失败事件（达到最大重试次数）
    this.queue.on('failed', (job, err) => {
      log.error('消息重试最终失败', {
        jobId: job.id,
        orderId: job.data.orderId,
        failedCount: job.data.failedRecipients.length,
        error: err,
      });

      // TODO: 触发告警（短信/邮件/钉钉等）
    });

    // 监听成功事件
    this.queue.on('completed', (job) => {
      log.info('消息重试成功', {
        jobId: job.id,
        orderId: job.data.orderId,
      });
    });
  }

  async addRetryJob(job: RetryJob) {
    await this.queue.add(job, {
      priority: 1, // 可根据优先级调整
    });

    log.info('添加重试任务', {
      orderId: job.orderId,
      failedCount: job.failedRecipients.length,
    });
  }

  private async processRetry(data: RetryJob): Promise<void> {
    const { orderId, orderNo, failedRecipients } = data;

    // 获取工单最新信息（确保数据一致性）
    // const order = await prisma.workOrder.findUnique({ where: { id: orderId } });

    // 重试发送给失败的技术人员
    const results = await Promise.allSettled(
      failedRecipients.map(recipient =>
        this.messageService.sendNewOrderCard(
          { id: orderId, orderNo } as any, // 简化示例
          recipient.feishuId
        )
      )
    );

    // 检查是否仍有失败
    const stillFailed = results.filter(r => r.status === 'rejected' || !r.value);

    if (stillFailed.length > 0) {
      log.warn('部分重试仍然失败', {
        orderId,
        failedCount: stillFailed.length,
        totalCount: results.length,
      });

      // Bull会自动重试（根据配置）
      throw new Error(`${stillFailed.length}/${results.length} 技术人员重试失败`);
    }

    log.info('所有重试成功', { orderId });
  }

  // 获取队列统计信息
  async getStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

// 导出单例
export const messageRetryQueue = new MessageRetryQueue();
```

**2. 修改 messageService.ts**
```typescript
import { messageRetryQueue } from '../services/messageRetryQueue';

async sendNewOrderNotification(order: WorkOrderForMessage): Promise<boolean> {
  const recipients = this.getValidRecipients(order);

  if (recipients.length === 0) {
    this.log.warn('工单无有效接收人', {
      orderId: order.id,
      orderNo: order.orderNo,
    });
    return false;
  }

  // 使用 Promise.allSettled 并发发送
  const settled = await Promise.allSettled(
    recipients.map(r => this.sendNewOrderCard(order, r.technician.feishuId))
  );

  // 分析结果
  const summary = recipients.map((r, idx) => ({
    technicianId: r.technician.id,
    technicianName: r.technician.name,
    feishuId: r.technician.feishuId,
    success: settled[idx].status === 'fulfilled' && settled[idx].value,
    error: settled[idx].status === 'rejected' ? settled[idx].reason : null,
  }));

  const failed = summary.filter(s => !s.success);

  if (failed.length > 0) {
    // 写入重试队列
    await messageRetryQueue.addRetryJob({
      orderId: order.id,
      orderNo: order.orderNo,
      failedRecipients: failed,
    });

    this.log.error('技术人员通知部分失败', {
      orderId: order.id,
      orderNo: order.orderNo,
      totalCount: summary.length,
      failedCount: failed.length,
      failedTechnicians: failed.map(f => f.technicianName),
    });

    // 部分失败仍返回false
    return false;
  }

  this.log.info('所有技术人员通知成功', {
    orderId: order.id,
    orderNo: order.orderNo,
    count: summary.length,
  });

  return true;
}

// 辅助方法：获取有效接收人
private getValidRecipients(order: WorkOrderForMessage) {
  if (order.technicians && order.technicians.length > 0) {
    return order.technicians.filter(t => t?.technician?.feishuId);
  } else if (order.technician?.feishuId) {
    return [{
      technician: {
        id: order.technician.id,
        name: order.technician.name,
        feishuId: order.technician.feishuId,
      }
    }];
  }
  return [];
}
```

**3. Worker进程 (src/workers/messageRetryWorker.ts)**
```typescript
import { messageRetryQueue } from '../services/messageRetryQueue';
import { createModuleLogger, LogModule } from '../utils';

const log = createModuleLogger(LogModule.SYSTEM);

async function startWorker() {
  log.info('消息重试Worker启动');

  // 监听退出信号
  process.on('SIGTERM', async () => {
    log.info('收到SIGTERM信号，关闭Worker');
    await messageRetryQueue.queue.close();
    process.exit(0);
  });

  // 定期输出统计信息
  setInterval(async () => {
    const stats = await messageRetryQueue.getStats();
    log.info('队列统计', stats);
  }, 60000); // 每分钟
}

startWorker().catch((error) => {
  log.error('Worker启动失败', { error });
  process.exit(1);
});
```

**4. 配置文件更新 (src/config/index.ts)**
```typescript
export const config = {
  // ... 其他配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
};
```

**5. 环境变量 (.env)**
```env
# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here
```

**6. package.json 脚本**
```json
{
  "scripts": {
    "worker": "ts-node src/workers/messageRetryWorker.ts",
    "worker:dev": "nodemon --exec ts-node src/workers/messageRetryWorker.ts"
  }
}
```

#### 部署说明
1. 启动Redis服务
2. 启动主服务：`npm run dev`
3. 启动Worker：`npm run worker:dev`（开发环境）或 `pm2 start npm --name message-worker -- run worker`（生产环境）

#### 监控面板（可选）
Bull提供了Web UI：
```bash
npm install bull-board
```

可快速查看队列状态、失败任务、重试历史等。

#### 成本评估
- **硬件**：Redis服务器（可与其他服务共用）
- **人力**：3-5个工作日开发 + 1-2天测试
- **维护**：几乎无需额外维护（Bull自动管理）

#### 未来扩展
- [ ] 支持短信/邮件降级通知
- [ ] 监控告警接入（钉钉/企业微信）
- [ ] 优先级队列（紧急工单优先重试）
- [ ] 分布式部署（多Worker节点）

---

## 📝 改造规范

### 日志级别使用
- **ERROR**：系统故障、异常
- **WARN**：潜在问题、降级处理
- **INFO**：重要业务流程
- **DEBUG**：详细执行信息

### 业务上下文字段原则
1. **必须包含**：能唯一定位业务对象的ID（orderId、userId等）
2. **应该包含**：操作类型、状态变更、关键参数
3. **可选包含**：辅助诊断信息（requestId、timestamp等）
4. **禁止包含**：敏感信息（密码、token等）

### Error对象规范
- 统一使用 `{ error }` 格式传入
- 保留原始error对象，避免人为包装
- AxiosError需特殊处理，记录config/response

---

## 🎯 下一步计划

### 待改造模块
根据项目情况决定下一批改造模块优先级

### 改进优化
1. 根据codex review意见优化messageService.ts
2. 建立日志最佳实践文档
3. 添加日志监控和告警

### 文档完善
1. ✅ 创建LOG_MIGRATION.md记录改造过程
2. 更新README说明日志系统
3. 编写日志使用指南

---

## 📚 参考资料

- logger实现：`src/utils/logger.ts`
- logger使用文档：`src/utils/LOGGER_USAGE.md`
- 已完成模块示例：approvalService.ts, feishuService.ts, wsClient.ts
