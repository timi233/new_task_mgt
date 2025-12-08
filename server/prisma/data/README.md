# 数据库初始化说明

生产环境数据库需要在首次部署时初始化。

## 初始化步骤

1. 确保已安装Node.js和依赖包
2. 在server目录下运行以下命令：

```bash
cd server
npm install
npx prisma db push
```

这将创建一个空的数据库，包含所有必要的表结构，但不包含任何测试数据。

## 注意事项

- 生产环境数据库文件路径：`server/prisma/data/dispatch.db`
- 首次运行前请确保 `.env.production` 文件已重命名为 `.env`
- 建议定期备份数据库文件
