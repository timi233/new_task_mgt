import { Request, Response, NextFunction } from 'express';
/**
 * CSRF 保护中间件
 * 通过验证 Origin/Referer 头防止跨站请求伪造
 */
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=csrf.d.ts.map