import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * 通用 API 限流
 * 每个 IP 每分钟最多 100 次请求
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1429,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  skip: () => config.isDev, // 开发环境跳过
});

/**
 * 登录接口限流
 * 每个 IP 每分钟最多 10 次登录尝试
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1429,
    message: '登录尝试过于频繁，请稍后再试',
    data: null,
  },
  skip: () => config.isDev,
});

/**
 * 搜索接口限流
 * 每个 IP 每分钟最多 60 次搜索
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 1429,
    message: '搜索请求过于频繁，请稍后再试',
    data: null,
  },
  skip: () => config.isDev,
});
