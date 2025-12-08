# 派工系统 - 后端服务

## 项目概述

派工系统后端服务，基于 Node.js + Express + Prisma + PostgreSQL 构建，集成飞书开放平台实现工单管理、审批流程、消息通知等功能。

## 技术栈

- **运行环境**：Node.js 18+
- **Web框架**：Express.js
- **数据库**：PostgreSQL + Prisma ORM
- **第三方集成**：飞书开放平台（审批、消息、WebSocket）
- **日志系统**：自研结构化日志模块

## 快速开始

### 环境准备

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑.env填写数据库连接、飞书配置等
```

### 数据库初始化

```bash
# 生成Prisma Client
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 查看数据库
npx prisma studio
```

### 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

## 项目结构

```
server/
├── src/
│   ├── feishu/           # 飞书集成模块
│   │   ├── feishuService.ts      # 飞书API服务
│   │   ├── wsClient.ts           # WebSocket客户端
│   │   ├── messageService.ts     # 消息卡片服务
│   │   └── approvalService.ts    # 审批流程服务
│   ├── routes/           # 路由模块
│   │   ├── workOrder.ts          # 工单路由
│   │   ├── approval.ts           # 审批路由
│   │   └── callback.ts           # 飞书回调路由
│   ├── utils/            # 工具模块
│   │   ├── logger.ts             # 日志系统
│   │   ├── prisma.ts             # 数据库客户端
│   │   ├── response.ts           # 响应封装
│   │   └── helpers.ts            # 辅助函数
│   ├── middleware/       # 中间件
│   ├── config/          # 配置文件
│   └── index.ts         # 入口文件
├── prisma/              # 数据库Schema
├── scripts/             # 脚本工具
└── LOG_MIGRATION.md     # 日志系统改造记录
```

## 核心功能

### 工单管理
- 工单创建、分配、接单、完成
- 多技术人员协同
- 工单状态流转
- 服务评价

### 审批流程
- 飞书审批集成
- 审批状态同步
- 审批通知推送

### 消息通知
- 飞书消息卡片推送
- 工单状态变更通知
- 审批结果通知
- WebSocket实时通信

## 日志系统

### 概述

项目采用**自研结构化日志系统**，支持分级日志、模块化标签、业务上下文记录。

**详细说明**：参见 [LOG_MIGRATION.md](./LOG_MIGRATION.md)

### 快速使用

```typescript
import { createModuleLogger, LogModule } from '../utils';

// 创建模块级logger
const log = createModuleLogger(LogModule.WORK_ORDER);

// 记录日志
log.info('工单创建成功', {
  orderId: '123',
  orderNo: 'WO-2024-001'
});

log.error('工单处理失败', {
  error,
  orderId: '123',
  reason: '数据库异常'
});
```

### 日志级别
- **ERROR**：系统故障、异常
- **WARN**：潜在问题、降级处理
- **INFO**：重要业务流程
- **DEBUG**：详细执行信息

### 改造进度

已完成5个核心模块的日志改造（60处console替换）：
- ✅ approvalService.ts - 审批服务
- ✅ workOrder.ts - 工单路由
- ✅ feishuService.ts - 飞书服务
- ✅ wsClient.ts - WebSocket客户端
- ✅ messageService.ts - 消息服务

**详细记录**：[LOG_MIGRATION.md](./LOG_MIGRATION.md)

### 代码质量Review发现

**messageService.ts 业务逻辑问题**（2025-12-03 Codex Review）：
- ✅ ~~**Critical**：部分发送成功被误判为完全成功~~ → **已修复**（改为.every()并添加日志）
- ✅ ~~**Medium**：日志缺少业务上下文~~ → **已修复**（context 参数必填化）
- 🟠 **High**：缺少重试和降级策略 - 网络抖动导致消息永久丢失（已记录未来方案）
- 🟠 **High**：错误信息丢失 - 生产环境故障无法诊断
- 🟠 **High**：ID类型硬编码 - 可能导致所有消息发送失败（待验证数据库）
- 🟡 **Medium**：缺少空值保护和边界检查

**当前状态**：
- ✅ Critical问题已修复（返回值语义准确，添加失败日志）
- ✅ context 参数必填化（编译期强制传入完整业务上下文）
- ✅ 未来重试方案已完整记录（Redis队列方案，待业务需求时实施）
- 🔄 依赖销售人工口头沟通兜底，消息漏发风险可接受

**详细信息**：见 [LOG_MIGRATION.md](./LOG_MIGRATION.md)

## 飞书集成

### 配置

在`.env`中配置飞书应用凭证：

```env
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_APPROVAL_CODE=approval_code
```

### 功能模块

#### 1. feishuService.ts
- 飞书API调用封装
- Token管理（自动刷新）
- 用户信息查询

#### 2. wsClient.ts
- WebSocket长连接管理
- 事件监听与处理
- 自动重连机制

#### 3. messageService.ts
- 消息卡片发送
- 工单通知推送
- 审批提醒

#### 4. approvalService.ts
- 审批实例创建
- 审批状态查询
- 审批结果同步

## API文档

### 工单接口

```
GET    /api/workorder       # 获取工单列表
POST   /api/workorder       # 创建工单
GET    /api/workorder/:id   # 获取工单详情
PUT    /api/workorder/:id   # 更新工单
DELETE /api/workorder/:id   # 删除工单
```

### 审批接口

```
POST   /api/approval        # 创建审批
GET    /api/approval/:id    # 获取审批状态
POST   /api/callback/approval  # 飞书审批回调
```

## 开发规范

### 代码风格
- 使用TypeScript严格模式
- 遵循ESLint规则
- 统一使用Prettier格式化

### 日志规范
- 所有业务逻辑必须使用结构化日志
- 禁止使用console.log/console.error
- 必须包含业务上下文（orderId、userId等）
- 参考：[LOG_MIGRATION.md](./LOG_MIGRATION.md)

### Git提交规范
```
feat: 新功能
fix: 修复bug
refactor: 重构
docs: 文档更新
style: 代码格式
test: 测试相关
chore: 构建/工具相关
```

## 常见问题

### 1. 数据库连接失败
检查`.env`中的`DATABASE_URL`配置是否正确。

### 2. 飞书回调验证失败
确认`FEISHU_VERIFICATION_TOKEN`与飞书开放平台配置一致。

### 3. WebSocket连接断开
检查日志系统输出的连接状态，wsClient会自动重连。

### 4. 日志不输出
检查`LOG_LEVEL`环境变量，开发环境建议设置为`DEBUG`。

## 维护与监控

### 日志查看
```bash
# 开发环境：控制台输出
npm run dev

# 生产环境：日志文件
tail -f logs/app.log
```

### 性能监控
- 数据库查询性能：使用Prisma日志
- API响应时间：Express中间件记录
- 飞书API调用：feishuService自动记录

## 相关文档

- [日志系统改造记录](./LOG_MIGRATION.md) - 详细记录日志改造过程和review意见
- [日志使用指南](./src/utils/LOGGER_USAGE.md) - 日志系统使用文档
- [Prisma Schema](./prisma/schema.prisma) - 数据库模型定义
- [飞书开放平台文档](https://open.feishu.cn/document/) - 飞书API参考

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 许可证

[MIT License](LICENSE)
