/**
 * 通用 API 限流
 * 每个 IP 每分钟最多 100 次请求
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * 登录接口限流
 * 每个 IP 每分钟最多 10 次登录尝试
 */
export declare const loginLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * 搜索接口限流
 * 每个 IP 每分钟最多 60 次搜索
 */
export declare const searchLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimit.d.ts.map