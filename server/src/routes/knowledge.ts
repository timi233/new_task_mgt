import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest, ApiError } from '../middlewares';
import { prisma, success, paginate } from '../utils';

const router = Router();

router.use(authenticate);

// 知识库列表
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', pageSize = '20', keyword, problemType } = req.query;
    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    const where: any = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { problem: { contains: keyword as string } },
        { solution: { contains: keyword as string } },
      ];
    }

    if (problemType) {
      where.problemType = problemType;
    }

    const [items, total] = await Promise.all([
      prisma.knowledge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.knowledge.count({ where }),
    ]);

    paginate(res, items, total, pageNum, size);
  } catch (error) {
    next(error);
  }
});

// 知识库搜索（联想）
router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { keyword } = req.query;

    if (!keyword || (keyword as string).length < 2) {
      return success(res, []);
    }

    const items = await prisma.knowledge.findMany({
      where: {
        OR: [
          { title: { contains: keyword as string } },
          { problem: { contains: keyword as string } },
          { problemType: { contains: keyword as string } },
        ],
      },
      select: {
        id: true,
        title: true,
        problemType: true,
        problem: true,
      },
      take: 10,
    });

    success(res, items);
  } catch (error) {
    next(error);
  }
});

// 问题类型列表
router.get('/problem-types', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.knowledge.groupBy({
      by: ['problemType'],
      where: { problemType: { not: null } },
      _count: true,
    });

    const data = types
      .filter(t => t.problemType)
      .map(t => ({
        type: t.problemType,
        count: t._count,
      }))
      .sort((a, b) => b.count - a.count);

    success(res, data);
  } catch (error) {
    next(error);
  }
});

// 知识详情
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const item = await prisma.knowledge.findUnique({
      where: { id },
    });

    if (!item) {
      throw ApiError.notFound('知识条目不存在');
    }

    // 增加浏览次数
    await prisma.knowledge.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    success(res, item);
  } catch (error) {
    next(error);
  }
});

// 手动创建知识条目
router.post('/', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, problemType, problem, solution, tags } = req.body;

    if (!title || !problem || !solution) {
      throw ApiError.badRequest('标题、问题描述、解决方案为必填项');
    }

    const item = await prisma.knowledge.create({
      data: {
        title,
        problemType,
        problem,
        solution,
        tags,
        sourceType: 'manual',
      },
    });

    success(res, item, '知识条目创建成功');
  } catch (error) {
    next(error);
  }
});

// 更新知识条目
router.put('/:id', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, problemType, problem, solution, tags } = req.body;

    const existing = await prisma.knowledge.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('知识条目不存在');
    }

    const item = await prisma.knowledge.update({
      where: { id },
      data: {
        title,
        problemType,
        problem,
        solution,
        tags,
      },
    });

    success(res, item, '知识条目更新成功');
  } catch (error) {
    next(error);
  }
});

// 删除知识条目
router.delete('/:id', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.knowledge.delete({ where: { id } });

    success(res, null, '知识条目删除成功');
  } catch (error) {
    next(error);
  }
});

// 相关知识推荐（根据问题类型）
router.get('/:id/related', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const current = await prisma.knowledge.findUnique({
      where: { id },
      select: { problemType: true },
    });

    if (!current || !current.problemType) {
      return success(res, []);
    }

    const related = await prisma.knowledge.findMany({
      where: {
        problemType: current.problemType,
        id: { not: id },
      },
      select: {
        id: true,
        title: true,
        problemType: true,
      },
      orderBy: { viewCount: 'desc' },
      take: 5,
    });

    success(res, related);
  } catch (error) {
    next(error);
  }
});

export default router;
