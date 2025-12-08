# 后端 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制 Prisma 文件
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制编译后的代码
COPY dist ./dist/

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"]
