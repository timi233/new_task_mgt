# IT服务派工系统 - 生产环境部署包

## 📦 部署包内容

本部署包包含IT服务派工系统的完整生产环境代码和文档。

### 目录结构

```
dispatch-system-production/
├── server/                 # 后端代码
│   ├── src/               # 源代码
│   ├── prisma/            # 数据库配置
│   ├── .env.production    # 生产环境配置模板
│   └── package.json       # 依赖配置
├── client/                # 前端代码
│   ├── src/               # 源代码
│   ├── nginx.prod.conf    # Nginx生产配置
│   └── package.json       # 依赖配置
├── deploy.sh              # 一键部署脚本
├── 部署文档.md            # 详细部署文档
├── 运维文档.md            # 运维手册
└── README.md              # 本文件
```

## 🚀 快速部署

### 前置要求

- Linux服务器（Ubuntu 20.04+推荐）
- Node.js 18+
- Nginx 1.18+
- root权限

### 部署步骤

1. **上传部署包到服务器**

```bash
# 使用scp或其他工具上传
scp dispatch-system-production.tar.gz root@192.168.101.13:/tmp/
```

2. **解压部署包**

```bash
cd /tmp
tar -xzf dispatch-system-production.tar.gz
cd dispatch-system-production
```

3. **运行部署脚本**

```bash
# 方式1: 使用一键部署脚本（推荐）
sudo ./deploy.sh

# 方式2: 参考部署文档手动部署
# 详见：部署文档.md
```

4. **配置环境变量**

部署脚本会提示你修改环境变量，主要需要修改：

```bash
# 编辑 /opt/dispatch-system/server/.env
nano /opt/dispatch-system/server/.env

# 必须修改：
# - JWT_SECRET: 改为随机的强密码
# - FEISHU_APP_ID: 填入实际的飞书应用ID
# - FEISHU_APP_SECRET: 填入实际的飞书应用密钥
```

生成随机JWT密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **重启服务**

```bash
pm2 restart dispatch-backend
```

6. **访问系统**

打开浏览器访问：http://192.168.101.13

## 📖 文档说明

### 部署文档.md

详细的部署指南，包括：
- 系统要求
- 环境准备
- 完整部署步骤
- 配置说明
- 服务管理
- 部署验证
- 常见问题解决

### 运维文档.md

完整的运维手册，包括：
- 日常运维操作
- 备份与恢复
- 监控与告警
- 性能优化
- 故障处理
- 安全维护
- 定期维护任务

## ⚙️ 系统配置

### 生产环境地址

- **服务器IP**: 192.168.101.13
- **前端地址**: http://192.168.101.13
- **后端API**: http://192.168.101.13:3000
- **Nginx端口**: 80
- **后端端口**: 3000

### 主要技术栈

**后端**：
- Node.js + TypeScript
- Express.js
- Prisma ORM + SQLite
- 飞书SDK

**前端**：
- Vue 3
- Vite
- Element Plus（桌面端）
- Vant（移动端）

## 🔧 服务管理

### 后端服务（PM2）

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs dispatch-backend

# 重启服务
pm2 restart dispatch-backend

# 停止服务
pm2 stop dispatch-backend
```

### 前端服务（Nginx）

```bash
# 查看状态
sudo systemctl status nginx

# 重启Nginx
sudo systemctl restart nginx

# 重新加载配置
sudo systemctl reload nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
```

## 📊 验证部署

部署完成后，请验证以下内容：

1. **后端服务健康检查**
   ```bash
   curl http://192.168.101.13:3000/api/health
   # 应返回: {"success":true,"message":"OK"}
   ```

2. **前端页面访问**
   - 在浏览器打开：http://192.168.101.13
   - 应能看到登录页面

3. **飞书登录测试**
   - 点击"飞书登录"
   - 使用飞书账号登录
   - 验证能否正常进入系统

## 🛡️ 安全特性

### 已实现的安全防护

**认证与会话**
- HttpOnly Cookie 存储 JWT Token（防 XSS 窃取）
- 短期签名 Token 用于附件下载（5分钟有效期）
- 会话 7 天自动过期

**请求安全**
- CSRF 保护（Origin/Referer 验证）
- API 限流（100次/分钟/IP）
- 请求体大小限制（1MB）
- CSP 内容安全策略

**文件上传安全**
- MIME 类型白名单
- Magic Number 字节签名校验（防伪造文件类型）
- 文件大小限制（10MB）
- 随机化存储文件名

**输入验证**
- 分页参数边界校验
- 关键字搜索 SQL 注入防护
- 路径遍历攻击防护

**日志系统**
- 统一结构化日志（模块化、分级别）
- 敏感信息脱敏

### 部署后必须修改

1. **JWT_SECRET**: 必须改为随机的强密码
2. **数据库文件权限**: `chmod 600 dispatch.db`
3. **环境变量文件权限**: `chmod 600 .env`
4. **飞书应用配置**: 填入实际的应用凭证

## 📝 常用命令

```bash
# 查看服务状态
pm2 status

# 查看后端日志
pm2 logs dispatch-backend

# 重启所有服务
pm2 restart all && sudo systemctl reload nginx

# 查看系统资源
htop
df -h
free -h

# 数据库备份
cp /opt/dispatch-system/server/prisma/data/dispatch.db \
   /opt/backups/database/dispatch.db.backup-$(date +%Y%m%d)
```

## 🔍 故障排查

### 后端服务无法启动

```bash
# 查看详细日志
pm2 logs dispatch-backend --lines 100

# 检查端口占用
sudo lsof -i :3000

# 检查环境变量配置
cat /opt/dispatch-system/server/.env
```

### 前端无法访问

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 测试Nginx配置
sudo nginx -t

# 查看Nginx日志
sudo tail -f /var/log/nginx/error.log
```

### API请求失败

```bash
# 测试后端API
curl http://192.168.101.13:3000/api/health

# 检查后端服务
pm2 status

# 重启服务
pm2 restart dispatch-backend
```

## 📞 技术支持

如遇到部署问题，请：

1. 查看详细文档：`部署文档.md` 和 `运维文档.md`
2. 检查日志文件
3. 联系技术支持团队

## 📌 版本信息

- **系统版本**: 1.1.0
- **最后更新**: 2025-12-16
- **目标环境**: 生产环境（192.168.101.13）

### 更新日志

**v1.1.0 (2025-12-16)**
- 认证改用 HttpOnly Cookie 存储 Token
- 新增 CSRF 保护、API 限流、CSP 策略
- 文件上传增加 Magic Number 校验
- 统一日志系统迁移
- 输入验证与 SQL 注入防护

**v1.0.0 (2025-12-03)**
- 初始版本发布

---

**祝部署顺利！**
