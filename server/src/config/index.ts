import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // 服务配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  webUrl: process.env.WEB_URL || 'http://localhost:5173',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'file:./data/dispatch.db',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 飞书配置
  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    encryptKey: process.env.FEISHU_ENCRYPT_KEY || '',
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN || '',
  },

  // 是否开发环境
  isDev: process.env.NODE_ENV !== 'production',
};

export default config;
