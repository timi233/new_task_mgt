# 前端 Dockerfile - 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
