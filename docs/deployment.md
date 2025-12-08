# 部署指南

## 服务器信息

- IP: 192.168.101.13
- 前端目录: `/var/www/dispatch-system`
- 后端目录: `/tmp/dispatch-system-production/server`
- 后端端口: 3000

## 部署流程

### 1. 构建前端

```bash
cd /tmp/dispatch-system-production/client
npm run build
```

### 2. 部署前端到 nginx

```bash
sudo cp -r /tmp/dispatch-system-production/client/dist/* /var/www/dispatch-system/
```

### 3. 构建并重启后端

```bash
cd /tmp/dispatch-system-production/server
npm run build
pm2 restart dispatch-backend
```

### 4. 查看后端日志

```bash
pm2 logs dispatch-backend --lines 50
```

## 常见问题

### 前端更新后页面没变化

1. 确认构建成功: `npm run build`
2. 确认文件已复制到 nginx 目录: `sudo cp -r dist/* /var/www/dispatch-system/`
3. 浏览器强制刷新: `Ctrl+Shift+R`

### 后端 API 报错

1. 查看日志: `pm2 logs dispatch-backend`
2. 重启服务: `pm2 restart dispatch-backend`

## nginx 配置

- 配置文件: `/etc/nginx/sites-enabled/`
- 静态文件: `/var/www/dispatch-system`
- API 代理: `/api/` -> `http://192.168.101.13:3000/api/`
