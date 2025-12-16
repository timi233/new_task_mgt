"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
(_a = process.env).TZ ?? (_a.TZ = 'Asia/Shanghai');
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const middlewares_1 = require("./middlewares");
const requestLogger_1 = require("./middlewares/requestLogger");
const feishu_1 = require("./feishu");
const utils_1 = require("./utils");
const log = (0, utils_1.createModuleLogger)('server');
const app = (0, express_1.default)();
// 安全中间件
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vue 需要
            styleSrc: ["'self'", "'unsafe-inline'"], // Element Plus/Vant 内联样式
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://open.feishu.cn"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // 允许加载外部资源
}));
// CORS配置
app.use((0, cors_1.default)({
    origin: config_1.config.webUrl,
    credentials: true,
}));
// CSRF 保护
app.use('/api', middlewares_1.csrfProtection);
// API 限流
app.use('/api', middlewares_1.apiLimiter);
// 解析JSON（限制请求体大小）
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
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
app.use(middlewares_1.errorHandler);
// 启动服务器
const startServer = async () => {
    try {
        app.listen(config_1.config.port, () => {
            log.info('服务启动成功', { env: config_1.config.nodeEnv, port: config_1.config.port, url: `http://localhost:${config_1.config.port}` });
            // 启动飞书长连接客户端（用于接收审批事件）
            try {
                (0, feishu_1.startFeishuWSClient)();
            }
            catch (error) {
                log.error('飞书长连接客户端启动失败', { error });
                log.warn('系统将继续运行，但无法接收实时审批事件');
            }
        });
    }
    catch (error) {
        log.error('服务启动失败', { error });
        process.exit(1);
    }
};
// 优雅关闭
process.on('SIGTERM', () => {
    log.info('收到SIGTERM信号，正在优雅关闭');
    (0, feishu_1.stopFeishuWSClient)();
    process.exit(0);
});
process.on('SIGINT', () => {
    log.info('收到SIGINT信号，正在优雅关闭');
    (0, feishu_1.stopFeishuWSClient)();
    process.exit(0);
});
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map