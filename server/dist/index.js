"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const requestLogger_1 = require("./middlewares/requestLogger");
const feishu_1 = require("./feishu");
const app = (0, express_1.default)();
// 安全中间件
app.use((0, helmet_1.default)());
// CORS配置
app.use((0, cors_1.default)({
    origin: config_1.config.webUrl,
    credentials: true,
}));
// 解析JSON
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 请求日志
app.use(requestLogger_1.requestLogger);
// 注意：上传文件通过 API 端点提供，不使用静态文件服务（安全考虑）
// 健康检查
app.get('/health', (req, res) => {
    res.json({
        code: 0,
        message: 'OK',
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: config_1.config.nodeEnv,
        },
    });
});
// API路由
app.use('/api', routes_1.default);
// 404处理
app.use((req, res) => {
    res.status(404).json({
        code: 1004,
        message: '接口不存在',
        data: null,
    });
});
// 错误处理
app.use(errorHandler_1.errorHandler);
// 启动服务器
const startServer = async () => {
    try {
        app.listen(config_1.config.port, () => {
            console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 IT服务派工系统后端服务启动成功                    ║
║                                                       ║
║   环境: ${config_1.config.nodeEnv.padEnd(20)}                  ║
║   端口: ${String(config_1.config.port).padEnd(20)}             ║
║   地址: http://localhost:${config_1.config.port}               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
            // 启动飞书长连接客户端（用于接收审批事件）
            try {
                console.log('');
                (0, feishu_1.startFeishuWSClient)();
            }
            catch (error) {
                console.error('[飞书] 长连接客户端启动失败:', error);
                console.warn('[飞书] 系统将继续运行，但无法接收实时审批事件');
            }
        });
    }
    catch (error) {
        console.error('服务启动失败:', error);
        process.exit(1);
    }
};
// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在优雅关闭...');
    (0, feishu_1.stopFeishuWSClient)();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('\n收到SIGINT信号，正在优雅关闭...');
    (0, feishu_1.stopFeishuWSClient)();
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map