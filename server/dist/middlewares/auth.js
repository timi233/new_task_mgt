"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.resolveLegacyRole = void 0;
exports.requireResponsibility = requireResponsibility;
exports.requireFunction = requireFunction;
exports.requireBoth = requireBoth;
exports.requireEither = requireEither;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const errorHandler_1 = require("./errorHandler");
const prisma_1 = require("../utils/prisma");
const types_1 = require("../types");
// Cookie 名称（与 auth.ts 保持一致）
const AUTH_COOKIE_NAME = 'dispatch_token';
// 从请求中获取 Token
function getTokenFromRequest(req) {
    // 1. 优先从 Cookie 获取
    const cookies = req.headers.cookie;
    if (cookies) {
        const match = cookies.split(';').find(c => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
        if (match) {
            return decodeURIComponent(match.split('=')[1]);
        }
    }
    // 2. 从 Authorization Header 获取（API 调用场景）
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return undefined;
}
const resolveLegacyRole = (payload) => {
    // 优先检查 responsibilityRole（新的权限模型）
    if (payload.responsibilityRole === types_1.ResponsibilityRole.SYSTEM_ADMIN) {
        return types_1.Role.SYSTEM_ADMIN;
    }
    if (payload.responsibilityRole === types_1.ResponsibilityRole.ADMIN) {
        return types_1.Role.ADMIN;
    }
    if (payload.responsibilityRole === types_1.ResponsibilityRole.AUDITOR) {
        return types_1.Role.AUDITOR;
    }
    // 然后检查 functionalRole
    if (payload.functionalRole === types_1.FunctionalRole.TECHNICIAN) {
        return types_1.Role.TECHNICIAN;
    }
    if (payload.functionalRole === types_1.FunctionalRole.SALES) {
        return types_1.Role.SALES;
    }
    // 最后回退到旧的 role 字段（向后兼容）
    if (payload.role) {
        return payload.role;
    }
    return null;
};
exports.resolveLegacyRole = resolveLegacyRole;
const authenticate = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            throw errorHandler_1.ApiError.unauthorized('请先登录');
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    feishuId: true,
                    name: true,
                    role: true,
                    functionalRole: true,
                    responsibilityRole: true,
                    status: true,
                },
            });
            if (!user) {
                throw errorHandler_1.ApiError.unauthorized('用户不存在');
            }
            if (user.status !== types_1.UserStatus.ACTIVE) {
                throw errorHandler_1.ApiError.unauthorized('用户已被禁用');
            }
            const resolvedRole = (0, exports.resolveLegacyRole)(user);
            req.user = {
                id: user.id,
                feishuId: user.feishuId,
                name: user.name,
                role: resolvedRole,
                functionalRole: user.functionalRole,
                responsibilityRole: user.responsibilityRole,
            };
            next();
        }
        catch (jwtError) {
            throw errorHandler_1.ApiError.unauthorized('登录已过期，请重新登录');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
// 旧的角色权限检查（向后兼容）
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(errorHandler_1.ApiError.unauthorized('请先登录'));
        }
        const legacyRole = (0, exports.resolveLegacyRole)(req.user);
        if (legacyRole) {
            req.user.role = legacyRole;
        }
        if (!legacyRole || !allowedRoles.includes(legacyRole)) {
            return next(errorHandler_1.ApiError.forbidden('权限不足'));
        }
        next();
    };
};
exports.authorize = authorize;
// ============ 新增：双重权限检查函数 ============
// 检查职责权限
function requireResponsibility(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw errorHandler_1.ApiError.unauthorized('未登录');
        }
        if (!user.responsibilityRole || !roles.includes(user.responsibilityRole)) {
            throw errorHandler_1.ApiError.forbidden('权限不足');
        }
        next();
    };
}
// 检查功能权限
function requireFunction(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw errorHandler_1.ApiError.unauthorized('未登录');
        }
        if (!user.functionalRole || !roles.includes(user.functionalRole)) {
            throw errorHandler_1.ApiError.forbidden('权限不足');
        }
        next();
    };
}
// 组合权限检查（需要同时满足）
function requireBoth(functionalRoles, responsibilityRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw errorHandler_1.ApiError.unauthorized('未登录');
        }
        const hasFunctional = user.functionalRole && functionalRoles.includes(user.functionalRole);
        const hasResponsibility = user.responsibilityRole && responsibilityRoles.includes(user.responsibilityRole);
        if (!hasFunctional || !hasResponsibility) {
            throw errorHandler_1.ApiError.forbidden('权限不足');
        }
        next();
    };
}
// 或权限检查（满足任一即可）
function requireEither(functionalRoles = [], responsibilityRoles = []) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw errorHandler_1.ApiError.unauthorized('未登录');
        }
        const hasFunctional = user.functionalRole && functionalRoles.includes(user.functionalRole);
        const hasResponsibility = user.responsibilityRole && responsibilityRoles.includes(user.responsibilityRole);
        if (!hasFunctional && !hasResponsibility) {
            throw errorHandler_1.ApiError.forbidden('权限不足');
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map