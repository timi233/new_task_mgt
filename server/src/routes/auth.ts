import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma, success } from '../utils';
import { ApiError } from '../middlewares';
import { FeishuService } from '../feishu/feishuService';
import { Role, UserStatus } from '../types';

const router = Router();

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
          name: feishuUser.name,
          phone: feishuUser.mobile || null,
          email: feishuUser.email || null,
          avatar: feishuUser.avatar_url || null,
          role: Role.TECHNICIAN, // 默认技术人员角色
        },
      });
    } else {
      // 更新用户信息
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
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

    success(res, {
      token,
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

    success(res, { token: newToken }, 'Token刷新成功');
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('请先登录');
    }

    const token = authHeader.substring(7);
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

// 退出登录（前端清除token即可，这里只是占位）
router.post('/logout', (req: Request, res: Response) => {
  success(res, null, '退出成功');
});

export default router;
