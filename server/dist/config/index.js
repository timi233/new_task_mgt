"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 加载环境变量
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
// 生产环境必须配置 JWT_SECRET
if (!jwtSecret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET 未配置，禁止在生产环境启动服务');
}
// 开发环境警告（config 模块在 logger 之前加载，此处使用 console）
if (!jwtSecret && nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.warn('[CONFIG] JWT_SECRET 未配置，使用开发环境默认值');
}
const devSecret = 'dev-only-secret-do-not-use-in-production';
exports.config = {
    // 服务配置
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv,
    webUrl: process.env.WEB_URL || 'http://localhost:5173',
    // 数据库
    databaseUrl: process.env.DATABASE_URL || 'file:./data/dispatch.db',
    // JWT
    jwt: {
        secret: jwtSecret || devSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    // 飞书配置
    feishu: {
        appId: process.env.FEISHU_APP_ID || '',
        appSecret: process.env.FEISHU_APP_SECRET || '',
        encryptKey: process.env.FEISHU_ENCRYPT_KEY || '',
        verificationToken: process.env.FEISHU_VERIFICATION_TOKEN || '',
        approvalCode: process.env.FEISHU_APPROVAL_CODE || '', // 外出审批模板Code
    },
    // 是否开发环境
    isDev: nodeEnv !== 'production',
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map