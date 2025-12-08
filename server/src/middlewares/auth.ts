import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from './errorHandler';
import { prisma } from '../utils/prisma';
import {
  UserStatus,
  RoleType,
  FunctionalRoleType,
  ResponsibilityRoleType,
  Role,
  FunctionalRole,
  ResponsibilityRole,
} from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    feishuId: string | null;
    name: string;
    role: string | null;
    functionalRole: string | null;
    responsibilityRole: string | null;
  };
}

export const resolveLegacyRole = (payload: {
  role?: string | null;
  functionalRole?: string | null;
  responsibilityRole?: string | null;
}): RoleType | null => {
  // 优先检查 responsibilityRole（新的权限模型）
  if (payload.responsibilityRole === ResponsibilityRole.SYSTEM_ADMIN) {
    return Role.SYSTEM_ADMIN;
  }

  if (payload.responsibilityRole === ResponsibilityRole.ADMIN) {
    return Role.ADMIN;
  }

  if (payload.responsibilityRole === ResponsibilityRole.AUDITOR) {
    return Role.AUDITOR;
  }

  // 然后检查 functionalRole
  if (payload.functionalRole === FunctionalRole.TECHNICIAN) {
    return Role.TECHNICIAN;
  }

  if (payload.functionalRole === FunctionalRole.SALES) {
    return Role.SALES;
  }

  // 最后回退到旧的 role 字段（向后兼容）
  if (payload.role) {
    return payload.role as RoleType;
  }

  return null;
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('请先登录');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        feishuId: string;
      };

      const user = await prisma.user.findUnique({
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
        throw ApiError.unauthorized('用户不存在');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw ApiError.unauthorized('用户已被禁用');
      }

      const resolvedRole = resolveLegacyRole(user);

      req.user = {
        id: user.id,
        feishuId: user.feishuId,
        name: user.name,
        role: resolvedRole,
        functionalRole: user.functionalRole,
        responsibilityRole: user.responsibilityRole,
      };

      next();
    } catch (jwtError) {
      throw ApiError.unauthorized('登录已过期，请重新登录');
    }
  } catch (error) {
    next(error);
  }
};

// 旧的角色权限检查（向后兼容）
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('请先登录'));
    }

    const legacyRole = resolveLegacyRole(req.user);
    if (legacyRole) {
      req.user.role = legacyRole;
    }

    if (!legacyRole || !allowedRoles.includes(legacyRole)) {
      return next(ApiError.forbidden('权限不足'));
    }

    next();
  };
};

// ============ 新增：双重权限检查函数 ============

// 检查职责权限
export function requireResponsibility(...roles: ResponsibilityRoleType[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('未登录');
    }

    if (!user.responsibilityRole || !roles.includes(user.responsibilityRole as ResponsibilityRoleType)) {
      throw ApiError.forbidden('权限不足');
    }

    next();
  };
}

// 检查功能权限
export function requireFunction(...roles: FunctionalRoleType[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('未登录');
    }

    if (!user.functionalRole || !roles.includes(user.functionalRole as FunctionalRoleType)) {
      throw ApiError.forbidden('权限不足');
    }

    next();
  };
}

// 组合权限检查（需要同时满足）
export function requireBoth(
  functionalRoles: FunctionalRoleType[],
  responsibilityRoles: ResponsibilityRoleType[]
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('未登录');
    }

    const hasFunctional = user.functionalRole && functionalRoles.includes(user.functionalRole as FunctionalRoleType);
    const hasResponsibility = user.responsibilityRole && responsibilityRoles.includes(user.responsibilityRole as ResponsibilityRoleType);

    if (!hasFunctional || !hasResponsibility) {
      throw ApiError.forbidden('权限不足');
    }

    next();
  };
}

// 或权限检查（满足任一即可）
export function requireEither(
  functionalRoles: FunctionalRoleType[] = [],
  responsibilityRoles: ResponsibilityRoleType[] = []
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('未登录');
    }

    const hasFunctional = user.functionalRole && functionalRoles.includes(user.functionalRole as FunctionalRoleType);
    const hasResponsibility = user.responsibilityRole && responsibilityRoles.includes(user.responsibilityRole as ResponsibilityRoleType);

    if (!hasFunctional && !hasResponsibility) {
      throw ApiError.forbidden('权限不足');
    }

    next();
  };
}
