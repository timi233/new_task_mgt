"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middlewares_1 = require("../middlewares");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
router.use(middlewares_1.authenticate);
// 知识库列表
router.get('/', async (req, res, next) => {
    try {
        const { page = '1', pageSize = '20', keyword, problemType } = req.query;
        const pageNum = parseInt(page, 10);
        const size = parseInt(pageSize, 10);
        const where = {};
        if (keyword) {
            where.OR = [
                { title: { contains: keyword } },
                { problem: { contains: keyword } },
                { solution: { contains: keyword } },
            ];
        }
        if (problemType) {
            where.problemType = problemType;
        }
        const [items, total] = await Promise.all([
            utils_1.prisma.knowledge.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * size,
                take: size,
            }),
            utils_1.prisma.knowledge.count({ where }),
        ]);
        (0, utils_1.paginate)(res, items, total, pageNum, size);
    }
    catch (error) {
        next(error);
    }
});
// 知识库搜索（联想）
router.get('/search', async (req, res, next) => {
    try {
        const { keyword } = req.query;
        if (!keyword || keyword.length < 2) {
            return (0, utils_1.success)(res, []);
        }
        const items = await utils_1.prisma.knowledge.findMany({
            where: {
                OR: [
                    { title: { contains: keyword } },
                    { problem: { contains: keyword } },
                    { problemType: { contains: keyword } },
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
        (0, utils_1.success)(res, items);
    }
    catch (error) {
        next(error);
    }
});
// 问题类型列表
router.get('/problem-types', async (req, res, next) => {
    try {
        const types = await utils_1.prisma.knowledge.groupBy({
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
        (0, utils_1.success)(res, data);
    }
    catch (error) {
        next(error);
    }
});
// 知识详情
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await utils_1.prisma.knowledge.findUnique({
            where: { id },
        });
        if (!item) {
            throw middlewares_1.ApiError.notFound('知识条目不存在');
        }
        // 增加浏览次数
        await utils_1.prisma.knowledge.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
        (0, utils_1.success)(res, item);
    }
    catch (error) {
        next(error);
    }
});
// 手动创建知识条目
router.post('/', (0, middlewares_1.authorize)('ADMIN', 'MANAGER', 'TECHNICIAN'), async (req, res, next) => {
    try {
        const { title, problemType, problem, solution, tags } = req.body;
        if (!title || !problem || !solution) {
            throw middlewares_1.ApiError.badRequest('标题、问题描述、解决方案为必填项');
        }
        const item = await utils_1.prisma.knowledge.create({
            data: {
                title,
                problemType,
                problem,
                solution,
                tags,
                sourceType: 'manual',
            },
        });
        (0, utils_1.success)(res, item, '知识条目创建成功');
    }
    catch (error) {
        next(error);
    }
});
// 更新知识条目
router.put('/:id', (0, middlewares_1.authorize)('ADMIN', 'MANAGER', 'TECHNICIAN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, problemType, problem, solution, tags } = req.body;
        const existing = await utils_1.prisma.knowledge.findUnique({ where: { id } });
        if (!existing) {
            throw middlewares_1.ApiError.notFound('知识条目不存在');
        }
        const item = await utils_1.prisma.knowledge.update({
            where: { id },
            data: {
                title,
                problemType,
                problem,
                solution,
                tags,
            },
        });
        (0, utils_1.success)(res, item, '知识条目更新成功');
    }
    catch (error) {
        next(error);
    }
});
// 删除知识条目
router.delete('/:id', (0, middlewares_1.authorize)('ADMIN', 'MANAGER'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await utils_1.prisma.knowledge.delete({ where: { id } });
        (0, utils_1.success)(res, null, '知识条目删除成功');
    }
    catch (error) {
        next(error);
    }
});
// 相关知识推荐（根据问题类型）
router.get('/:id/related', async (req, res, next) => {
    try {
        const { id } = req.params;
        const current = await utils_1.prisma.knowledge.findUnique({
            where: { id },
            select: { problemType: true },
        });
        if (!current || !current.problemType) {
            return (0, utils_1.success)(res, []);
        }
        const related = await utils_1.prisma.knowledge.findMany({
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
        (0, utils_1.success)(res, related);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=knowledge.js.map