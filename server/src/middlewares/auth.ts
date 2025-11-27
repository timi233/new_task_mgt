import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from './errorHandler';
import { prisma } from '../utils/prisma';
import { UserStatus, RoleType, FunctionalRoleType, ResponsibilityRoleType } from '../types';

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

      req.user = {
        id: user.id,
        feishuId: user.feishuId,
        name: user.name,
        role: user.role,
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

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
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
