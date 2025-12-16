"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLimiter = exports.loginLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
/**
 * 通用 API 限流
 * 每个 IP 每分钟最多 100 次请求
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 分钟
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 1429,
        message: '请求过于频繁，请稍后再试',
        data: null,
    },
    skip: () => config_1.config.isDev, // 开发环境跳过
});
/**
 * 登录接口限流
 * 每个 IP 每分钟最多 10 次登录尝试
 */
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 分钟
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 1429,
        message: '登录尝试过于频繁，请稍后再试',
        data: null,
    },
    skip: () => config_1.config.isDev,
});
/**
 * 搜索接口限流
 * 每个 IP 每分钟最多 60 次搜索
 */
exports.searchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 1429,
        message: '搜索请求过于频繁，请稍后再试',
        data: null,
    },
    skip: () => config_1.config.isDev,
});
//# sourceMappingURL=rateLimit.js.map