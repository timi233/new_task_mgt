import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma, success } from '../utils';
import { ApiError } from '../middlewares';
import { FeishuService } from '../feishu/feishuService';
import { Role, UserStatus } from '../types';

const router = Router();

// Cookie 配置
const AUTH_COOKIE_NAME = 'dispatch_token';
const COOKIE_MAX_AGE = (() => {
  const match = /^(\d+)([smhd])$/.exec(config.jwt.expiresIn);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 默认7天
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
  return amount * factor;
})();

// 设置认证 Cookie
function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !config.isDev, // 生产环境使用 HTTPS
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

// 清除认证 Cookie
function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
  });
}

// 飞书OAuth登录
router.post('/feishu/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw ApiError.badRequest('缺少授权码');
    }

    // 通过飞书获取用户信息
    const feishuService = new FeishuService();
    const feishuUser = await feishuService.getUserByCode(code);

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { feishuId: feishuUser.open_id },
    });

    if (!user) {
      // 首次登录，创建用户
      user = await prisma.user.create({
        data: {
          feishuId: feishuUser.open_id,
          feishuUserId: feishuUser.user_id,
          name: feishuUser.name,
          phone: feishuUser.mobile || null,
          email: feishuUser.email || null,
          avatar: feishuUser.avatar_url || null,
          role: Role.TECHNICIAN, // 默认技术人员角色（旧字段，保持兼容）
          functionalRole: 'TECHNICIAN', // 功能权限：默认技术人员
        },
      });
    } else {
      // 更新用户信息
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          feishuUserId: feishuUser.user_id,
          name: feishuUser.name,
          phone: feishuUser.mobile || user.phone,
          email: feishuUser.email || user.email,
          avatar: feishuUser.avatar_url || user.avatar,
        },
      });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, feishuId: user.feishuId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    // 设置 HttpOnly Cookie
    setAuthCookie(res, token);

    success(res, {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        functionalRole: user.functionalRole,
        responsibilityRole: user.responsibilityRole,
        avatar: user.avatar,
      },
    }, '登录成功');
  } catch (error) {
    next(error);
  }
});

// 刷新Token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw ApiError.badRequest('缺少Token');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; feishuId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw ApiError.unauthorized('用户不存在或已禁用');
    }

    const newToken = jwt.sign(
      { userId: user.id, feishuId: user.feishuId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    // 设置新的 HttpOnly Cookie
    setAuthCookie(res, newToken);

    success(res, { token: newToken }, 'Token刷新成功');
  } catch (error) {
    next(error);
  }
});

// 从请求中获取 Token
function getTokenFromRequest(req: Request): string | undefined {
  // 优先从 Cookie 获取
  const cookies = req.headers.cookie;
  if (cookies) {
    const match = cookies.split(';').find(c => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
    if (match) {
      return decodeURIComponent(match.split('=')[1]);
    }
  }

  // 从 Authorization Header 获取（API 调用场景）
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
}

// 获取当前用户信息
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      throw ApiError.unauthorized('请先登录');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        functionalRole: true,
        responsibilityRole: true,
        avatar: true,
        status: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('用户不存在');
    }

    success(res, user);
  } catch (error) {
    next(error);
  }
});

// 退出登录
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  success(res, null, '退出成功');
});

export default router;
