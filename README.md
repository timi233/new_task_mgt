# IT服务派工系统

## 项目简介

IT服务派工系统是一个面向小型IT服务团队（10人以内）的工单管理平台，支持外勤服务、内勤服务和厂家派单三种工单类型，集成飞书消息通知，帮助团队高效管理服务工单。

## 技术栈

### 后端
- Node.js + Express + TypeScript
- Prisma ORM + SQLite
- JWT 认证

### 前端
- Vue 3 + TypeScript
- Vant 4 (移动端UI)
- Pinia 状态管理
- Vue Router

## 项目结构

```
dispatch-system/
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/        # 配置
│   │   ├── middlewares/   # 中间件
│   │   ├── routes/        # 路由
│   │   ├── feishu/        # 飞书服务
│   │   └── utils/         # 工具函数
│   └── prisma/            # 数据库Schema
├── client/                 # 前端项目
│   └── src/
│       ├── views/         # 页面组件
│       ├── stores/        # 状态管理
│       ├── router/        # 路由配置
│       └── utils/         # 工具函数
├── docker-compose.yml      # 生产环境部署
└── docker-compose.dev.yml  # 开发环境
```

## 快速开始

### 本地开发

1. 安装后端依赖
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev
```

2. 安装前端依赖
```bash
cd client
npm install
npm run dev
```

### Docker 部署

1. 复制环境变量配置
```bash
cp .env.example .env
# 编辑 .env 文件，填入飞书应用配置
```

2. 启动服务
```bash
docker-compose up -d
```

## 功能模块

- **工作台**: 根据角色显示不同的统计数据和待处理事项
- **工单管理**: 创建、接单、服务、完成、评价全流程
- **客户管理**: 客户信息维护和服务历史
- **知识库**: 自动沉淀服务经验
- **数据统计**: 工单、工时、评价等统计报表
- **厂家派单**: 厂家合作派单管理

## 飞书集成

系统通过飞书实现：
- OAuth 登录认证
- 工单状态变更消息通知
- 服务完成评价提醒
