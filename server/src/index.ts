import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { startFeishuWSClient, stopFeishuWSClient } from './feishu';

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

// 注意：上传文件通过 API 端点提供，不使用静态文件服务（安全考虑）

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

      // 启动飞书长连接客户端（用于接收审批事件）
      try {
        console.log('');
        startFeishuWSClient();
      } catch (error) {
        console.error('[飞书] 长连接客户端启动失败:', error);
        console.warn('[飞书] 系统将继续运行，但无法接收实时审批事件');
      }
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在优雅关闭...');
  stopFeishuWSClient();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到SIGINT信号，正在优雅关闭...');
  stopFeishuWSClient();
  process.exit(0);
});

startServer();

export default app;
