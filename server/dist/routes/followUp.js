"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const middlewares_1 = require("../middlewares");
const upload_1 = require("../middlewares/upload");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
// 检查用户是否有权限操作该工单的跟进记录
async function checkFollowUpAccess(userId, workOrderId) {
    const workOrder = await utils_1.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { technicians: true },
    });
    if (!workOrder)
        return false;
    const isSubmitter = workOrder.submitterId === userId;
    const isRelatedSales = workOrder.relatedSalesId === userId;
    const isTechnician = workOrder.technicians.some(t => t.technicianId === userId);
    return isSubmitter || isRelatedSales || isTechnician;
}
// 权限检查中间件（在 Multer 之前运行）
async function requireFollowUpAccess(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // 验证工单存在且用户有权限
        const hasAccess = await checkFollowUpAccess(userId, id);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权操作该工单的跟进记录', 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
// 格式化附件（不暴露服务器路径）
function formatAttachment(att) {
    return {
        id: att.id,
        type: att.type,
        originalName: att.originalName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        createdAt: att.createdAt,
        url: `/api/follow-ups/attachments/${att.id}`,
    };
}
// 获取跟进记录列表
router.get('/:id/follow-ups', middlewares_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const hasAccess = await checkFollowUpAccess(userId, id);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权查看该工单的跟进记录', 403);
        }
        const followUps = await utils_1.prisma.workOrderFollowUp.findMany({
            where: { workOrderId: id, deletedAt: null },
            include: {
                author: { select: { id: true, name: true, avatar: true, functionalRole: true } },
                attachments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const result = followUps.map(f => ({
            ...f,
            attachments: f.attachments.map(formatAttachment),
        }));
        (0, utils_1.success)(res, result);
    }
    catch (error) {
        next(error);
    }
});
// 添加跟进记录（权限检查在 Multer 之前）
router.post('/:id/follow-ups', middlewares_1.authenticate, requireFollowUpAccess, upload_1.followUpUpload.array('attachments'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        const files = req.files;
        if (!content?.trim() && (!files || files.length === 0)) {
            throw new middlewares_1.ApiError('请输入内容或上传附件', 400);
        }
        const followUp = await utils_1.prisma.$transaction(async (tx) => {
            const newFollowUp = await tx.workOrderFollowUp.create({
                data: {
                    workOrderId: id,
                    authorId: userId,
                    content: content?.trim() || null,
                },
            });
            if (files && files.length > 0) {
                await tx.workOrderFollowUpAttachment.createMany({
                    data: files.map(file => ({
                        followUpId: newFollowUp.id,
                        type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE',
                        originalName: file.originalname,
                        storagePath: file.path,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                    })),
                });
            }
            return tx.workOrderFollowUp.findUnique({
                where: { id: newFollowUp.id },
                include: {
                    author: { select: { id: true, name: true, avatar: true, functionalRole: true } },
                    attachments: true,
                },
            });
        });
        const result = {
            ...followUp,
            attachments: followUp.attachments.map(formatAttachment),
        };
        (0, utils_1.success)(res, result, '添加成功');
    }
    catch (error) {
        next(error);
    }
});
// 删除跟进记录（软删除）
router.delete('/:id/follow-ups/:noteId', middlewares_1.authenticate, async (req, res, next) => {
    try {
        const { id, noteId } = req.params;
        const userId = req.user.id;
        const followUp = await utils_1.prisma.workOrderFollowUp.findUnique({
            where: { id: noteId },
        });
        if (!followUp || followUp.workOrderId !== id) {
            throw new middlewares_1.ApiError('跟进记录不存在', 404);
        }
        if (followUp.authorId !== userId) {
            throw new middlewares_1.ApiError('只能删除自己的跟进记录', 403);
        }
        await utils_1.prisma.workOrderFollowUp.update({
            where: { id: noteId },
            data: { deletedAt: new Date() },
        });
        (0, utils_1.success)(res, null, '删除成功');
    }
    catch (error) {
        next(error);
    }
});
// 下载/查看附件（通过认证的 API 端点）
router.get('/attachments/:attachmentId', middlewares_1.authenticate, async (req, res, next) => {
    try {
        const { attachmentId } = req.params;
        const userId = req.user.id;
        const attachment = await utils_1.prisma.workOrderFollowUpAttachment.findUnique({
            where: { id: attachmentId },
            include: { followUp: true },
        });
        if (!attachment) {
            throw new middlewares_1.ApiError('附件不存在', 404);
        }
        const hasAccess = await checkFollowUpAccess(userId, attachment.followUp.workOrderId);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权下载该附件', 403);
        }
        if (!fs_1.default.existsSync(attachment.storagePath)) {
            throw new middlewares_1.ApiError('文件不存在', 404);
        }
        // 设置正确的 Content-Type
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        const fileStream = fs_1.default.createReadStream(attachment.storagePath);
        fileStream.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=followUp.js.map