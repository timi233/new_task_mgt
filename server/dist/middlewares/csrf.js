"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = csrfProtection;
const config_1 = require("../config");
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
/**
 * CSRF 保护中间件
 * 通过验证 Origin/Referer 头防止跨站请求伪造
 */
function csrfProtection(req, res, next) {
    // 安全方法不需要 CSRF 检查
    if (SAFE_METHODS.includes(req.method)) {
        return next();
    }
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    // 获取允许的源
    const allowedOrigin = new URL(config_1.config.webUrl).origin;
    // 优先检查 Origin 头
    if (origin) {
        if (origin === allowedOrigin) {
            return next();
        }
        return res.status(403).json({
            code: 1403,
            message: '请求来源不合法',
            data: null,
        });
    }
    // 如果没有 Origin，检查 Referer
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (refererOrigin === allowedOrigin) {
                return next();
            }
        }
        catch {
            // Referer 解析失败
        }
        return res.status(403).json({
            code: 1403,
            message: '请求来源不合法',
            data: null,
        });
    }
    // 没有 Origin 和 Referer 的请求（如服务端调用）
    // 对于需要认证的接口，后续中间件会验证 Cookie
    // 这里允许通过，但记录警告
    if (config_1.config.isDev) {
        console.warn(`[CSRF] 请求缺少 Origin/Referer: ${req.method} ${req.path}`);
    }
    next();
}
//# sourceMappingURL=csrf.js.map