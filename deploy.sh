#!/bin/bash

################################################################################
# IT服务派工系统 - 一键部署脚本
# 版本: 1.0.0
# 服务器地址: 192.168.101.13
################################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
APP_DIR="/opt/dispatch-system"
BACKUP_DIR="/opt/backups"
NGINX_SITE="/etc/nginx/sites-available/dispatch-system"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  IT服务派工系统 - 生产环境部署${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}错误: 请使用root权限运行此脚本${NC}"
   echo "使用: sudo ./deploy.sh"
   exit 1
fi

# 检查必要的软件
echo -e "${YELLOW}[1/10] 检查系统环境...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装Node.js${NC}"
    echo "请先安装Node.js 18或更高版本"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未安装npm${NC}"
    exit 1
fi

if ! command -v nginx &> /dev/null; then
    echo -e "${RED}错误: 未安装Nginx${NC}"
    echo "请先安装Nginx"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js版本: $NODE_VERSION${NC}"

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✓ PM2已安装${NC}"

# 创建必要的目录
echo -e "${YELLOW}[2/10] 创建应用目录...${NC}"
mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR/database
mkdir -p $BACKUP_DIR/code
mkdir -p /opt/scripts
mkdir -p /var/www/dispatch-system
echo -e "${GREEN}✓ 目录创建完成${NC}"

# 备份现有部署（如果存在）
if [ -d "$APP_DIR/server" ]; then
    echo -e "${YELLOW}[3/10] 备份现有部署...${NC}"
    BACKUP_FILE="$BACKUP_DIR/code/dispatch-system-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf $BACKUP_FILE -C /opt dispatch-system
    echo -e "${GREEN}✓ 备份完成: $BACKUP_FILE${NC}"

    # 停止现有服务
    echo -e "${YELLOW}停止现有服务...${NC}"
    pm2 stop dispatch-backend || true
    pm2 delete dispatch-backend || true
else
    echo -e "${YELLOW}[3/10] 首次部署，跳过备份${NC}"
fi

# 复制文件
echo -e "${YELLOW}[4/10] 部署应用文件...${NC}"
CURRENT_DIR=$(pwd)

if [ -d "$CURRENT_DIR/server" ] && [ -d "$CURRENT_DIR/client" ]; then
    cp -r $CURRENT_DIR/server $APP_DIR/
    cp -r $CURRENT_DIR/client $APP_DIR/
    echo -e "${GREEN}✓ 文件复制完成${NC}"
else
    echo -e "${RED}错误: 未找到server或client目录${NC}"
    echo "请在解压后的部署包目录中运行此脚本"
    exit 1
fi

# 安装后端依赖
echo -e "${YELLOW}[5/10] 安装后端依赖...${NC}"
cd $APP_DIR/server
npm install --production
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"

# 配置后端环境
echo -e "${YELLOW}[6/10] 配置后端环境...${NC}"
if [ ! -f "$APP_DIR/server/.env" ]; then
    if [ -f "$APP_DIR/server/.env.production" ]; then
        cp $APP_DIR/server/.env.production $APP_DIR/server/.env
        echo -e "${YELLOW}已从.env.production创建.env文件${NC}"
        echo -e "${RED}⚠ 重要: 请编辑 $APP_DIR/server/.env 文件，修改以下配置:${NC}"
        echo -e "  - JWT_SECRET (必须修改为随机密钥)"
        echo -e "  - FEISHU_APP_ID (填入实际值)"
        echo -e "  - FEISHU_APP_SECRET (填入实际值)"
        echo ""
        read -p "按Enter继续，或按Ctrl+C取消部署以先修改配置..."
    else
        echo -e "${RED}错误: 未找到.env.production文件${NC}"
        exit 1
    fi
fi

# 设置文件权限
chmod 600 $APP_DIR/server/.env
echo -e "${GREEN}✓ 后端环境配置完成${NC}"

# 初始化数据库
echo -e "${YELLOW}[7/10] 初始化数据库...${NC}"
cd $APP_DIR/server
npx prisma generate
npx prisma db push
chmod 600 $APP_DIR/server/prisma/data/dispatch.db
echo -e "${GREEN}✓ 数据库初始化完成${NC}"

# 构建前端
echo -e "${YELLOW}[8/10] 构建前端应用...${NC}"
cd $APP_DIR/client
npm install
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"

# 部署前端到Nginx
echo -e "${YELLOW}[9/10] 部署前端到Nginx...${NC}"
rm -rf /var/www/dispatch-system/*
cp -r $APP_DIR/client/dist/* /var/www/dispatch-system/

# 配置Nginx
if [ -f "$APP_DIR/client/nginx.prod.conf" ]; then
    cp $APP_DIR/client/nginx.prod.conf $NGINX_SITE

    # 启用站点
    ln -sf $NGINX_SITE /etc/nginx/sites-enabled/dispatch-system

    # 移除默认站点（如果存在）
    rm -f /etc/nginx/sites-enabled/default

    # 测试Nginx配置
    if nginx -t; then
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx配置完成${NC}"
    else
        echo -e "${RED}错误: Nginx配置测试失败${NC}"
        exit 1
    fi
else
    echo -e "${RED}错误: 未找到nginx.prod.conf文件${NC}"
    exit 1
fi

# 启动后端服务
echo -e "${YELLOW}[10/10] 启动后端服务...${NC}"
cd $APP_DIR/server
pm2 start npm --name "dispatch-backend" -- start
pm2 save
pm2 startup

echo -e "${GREEN}✓ 后端服务启动完成${NC}"

# 验证部署
echo ""
echo -e "${YELLOW}验证部署状态...${NC}"
sleep 3

# 检查PM2状态
pm2 status

# 检查后端健康状态
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.101.13:3000/api/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 后端服务运行正常${NC}"
else
    echo -e "${RED}⚠ 后端服务可能未正常启动 (HTTP $BACKEND_STATUS)${NC}"
    echo "请检查日志: pm2 logs dispatch-backend"
fi

# 检查前端
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.101.13/ || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ 前端服务运行正常${NC}"
else
    echo -e "${RED}⚠ 前端服务可能未正常启动 (HTTP $FRONTEND_STATUS)${NC}"
    echo "请检查Nginx日志"
fi

# 部署完成
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}       部署完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "访问地址: ${GREEN}http://192.168.101.13${NC}"
echo ""
echo "常用命令:"
echo "  - 查看后端日志: ${YELLOW}pm2 logs dispatch-backend${NC}"
echo "  - 重启后端服务: ${YELLOW}pm2 restart dispatch-backend${NC}"
echo "  - 查看服务状态: ${YELLOW}pm2 status${NC}"
echo "  - 重启Nginx: ${YELLOW}sudo systemctl restart nginx${NC}"
echo ""
echo "详细文档:"
echo "  - 部署文档: $APP_DIR/../部署文档.md"
echo "  - 运维文档: $APP_DIR/../运维文档.md"
echo ""
echo -e "${YELLOW}⚠ 重要提醒:${NC}"
echo "1. 请确保已修改 $APP_DIR/server/.env 中的敏感配置"
echo "2. 建议立即设置数据库自动备份（参考运维文档）"
echo "3. 建议配置健康检查脚本（参考运维文档）"
echo ""
