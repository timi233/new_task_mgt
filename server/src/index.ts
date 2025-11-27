import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';

const app: Application = express();

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: config.webUrl,
  credentials: true,
}));

// 解析JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use(requestLogger);

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    code: 0,
    message: 'OK',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    },
  });
});

// API路由
app.use('/api', routes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 1004,
    message: '接口不存在',
    data: null,
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 IT服务派工系统后端服务启动成功                    ║
║                                                       ║
║   环境: ${config.nodeEnv.padEnd(20)}                  ║
║   端口: ${String(config.port).padEnd(20)}             ║
║   地址: http://localhost:${config.port}               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
};

startServer();

export default app;
