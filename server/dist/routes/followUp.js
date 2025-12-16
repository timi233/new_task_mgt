"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middlewares_1 = require("../middlewares");
const upload_1 = require("../middlewares/upload");
const utils_1 = require("../utils");
const types_1 = require("../types");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// 附件 Token 配置
const ATTACHMENT_TOKEN_SCOPE = 'FOLLOW_UP_ATTACHMENT';
const ATTACHMENT_TOKEN_TTL = '5m'; // 5分钟有效期
// 生成附件访问的签名 URL
function buildAttachmentUrl(attachmentId, userId) {
    const token = jsonwebtoken_1.default.sign({ scope: ATTACHMENT_TOKEN_SCOPE, attachmentId, userId }, config_1.config.jwt.secret, { expiresIn: ATTACHMENT_TOKEN_TTL });
    return `/api/follow-ups/attachments/${attachmentId}?downloadToken=${token}`;
}
// 检查用户是否有权限操作该工单的跟进记录
async function checkFollowUpAccess(user, workOrderId) {
    // 管理员可以查看所有工单的跟进记录
    if ((0, types_1.hasManagementRole)(user))
        return true;
    const workOrder = await utils_1.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { technicians: true },
    });
    if (!workOrder)
        return false;
    const userId = user.id;
    const isSubmitter = workOrder.submitterId === userId;
    const isRelatedSales = workOrder.relatedSalesId === userId;
    const isTechnician = workOrder.technicians.some(t => t.technicianId === userId);
    return isSubmitter || isRelatedSales || isTechnician;
}
// 权限检查中间件（在 Multer 之前运行）
async function requireFollowUpAccess(req, res, next) {
    try {
        const { id } = req.params;
        const user = req.user;
        // 验证工单存在且用户有权限
        const hasAccess = await checkFollowUpAccess(user, id);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权操作该工单的跟进记录', 403);
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
// 格式化附件（不暴露服务器路径，生成签名URL）
function formatAttachment(att, userId) {
    return {
        id: att.id,
        type: att.type,
        originalName: att.originalName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        createdAt: att.createdAt,
        url: buildAttachmentUrl(att.id, userId),
    };
}
// 获取跟进记录列表
router.get('/:id/follow-ups', middlewares_1.authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const hasAccess = await checkFollowUpAccess(user, id);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权查看该工单的跟进记录', 403);
        }
        // 系统管理员可以看到已删除的记录
        const whereClause = (0, types_1.isSystemAdmin)(user)
            ? { workOrderId: id }
            : { workOrderId: id, deletedAt: null };
        const followUps = await utils_1.prisma.workOrderFollowUp.findMany({
            where: whereClause,
            include: {
                author: { select: { id: true, name: true, avatar: true, functionalRole: true } },
                attachments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const result = followUps.map(f => ({
            ...f,
            attachments: f.attachments.map(att => formatAttachment(att, user.id)),
        }));
        (0, utils_1.success)(res, result);
    }
    catch (error) {
        next(error);
    }
});
// 添加跟进记录（权限检查在 Multer 之前，签名校验在 Multer 之后）
router.post('/:id/follow-ups', middlewares_1.authenticate, requireFollowUpAccess, upload_1.followUpUpload.array('attachments'), upload_1.validateFileSignatures, async (req, res, next) => {
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
            attachments: followUp.attachments.map(att => formatAttachment(att, userId)),
        };
        (0, utils_1.success)(res, result, '添加成功');
    }
    catch (error) {
        next(error);
    }
});
// 修改跟进记录（工单关联人员可修改）
router.put('/:id/follow-ups/:noteId', middlewares_1.authenticate, async (req, res, next) => {
    try {
        const { id, noteId } = req.params;
        const { content } = req.body;
        const user = req.user;
        const hasAccess = await checkFollowUpAccess(user, id);
        if (!hasAccess) {
            throw new middlewares_1.ApiError('无权修改该工单的跟进记录', 403);
        }
        const followUp = await utils_1.prisma.workOrderFollowUp.findUnique({
            where: { id: noteId },
        });
        if (!followUp || followUp.workOrderId !== id || followUp.deletedAt) {
            throw new middlewares_1.ApiError('跟进记录不存在', 404);
        }
        const updated = await utils_1.prisma.workOrderFollowUp.update({
            where: { id: noteId },
            data: { content: content?.trim() || null, updatedAt: new Date(), updatedById: user.id },
            include: {
                author: { select: { id: true, name: true, avatar: true, functionalRole: true } },
                attachments: true,
            },
        });
        (0, utils_1.success)(res, { ...updated, attachments: updated.attachments.map(att => formatAttachment(att, user.id)) }, '修改成功');
    }
    catch (error) {
        next(error);
    }
});
// 删除跟进记录（软删除，仅作者可删除）
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
// 验证附件下载 Token
async function verifyAttachmentToken(req, attachmentId) {
    // 优先使用 downloadToken（短期签名 Token）
    const downloadToken = req.query.downloadToken;
    if (downloadToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(downloadToken, config_1.config.jwt.secret);
            // 验证 Token 范围和附件 ID
            if (payload.scope !== ATTACHMENT_TOKEN_SCOPE) {
                throw new Error('invalid scope');
            }
            if (payload.attachmentId !== attachmentId) {
                throw new Error('attachment mismatch');
            }
            if (!payload.userId) {
                throw new Error('missing userId');
            }
            return payload.userId;
        }
        catch {
            throw middlewares_1.ApiError.unauthorized('下载链接已失效，请刷新页面后重试');
        }
    }
    // 回退到 Authorization Header 或旧的 token 参数（兼容性）
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    let token;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    else if (queryToken) {
        token = queryToken;
    }
    if (!token) {
        throw middlewares_1.ApiError.unauthorized('请先登录');
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        if (!decoded.userId) {
            throw new Error('missing userId');
        }
        return decoded.userId;
    }
    catch {
        throw middlewares_1.ApiError.unauthorized('登录已过期，请重新登录');
    }
}
// 下载/查看附件（支持短期签名 Token 和普通认证）
router.get('/attachments/:attachmentId', async (req, res, next) => {
    try {
        const { attachmentId } = req.params;
        // 验证访问权限，获取用户 ID
        const userId = await verifyAttachmentToken(req, attachmentId);
        const attachment = await utils_1.prisma.workOrderFollowUpAttachment.findUnique({
            where: { id: attachmentId },
            include: { followUp: true },
        });
        if (!attachment) {
            throw middlewares_1.ApiError.notFound('附件不存在');
        }
        // 查询用户信息以检查工单访问权限
        const user = await utils_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, functionalRole: true, responsibilityRole: true },
        });
        if (!user) {
            throw middlewares_1.ApiError.unauthorized('用户不存在');
        }
        const hasAccess = await checkFollowUpAccess(user, attachment.followUp.workOrderId);
        if (!hasAccess) {
            throw middlewares_1.ApiError.forbidden('无权下载该附件');
        }
        if (!fs_1.default.existsSync(attachment.storagePath)) {
            throw middlewares_1.ApiError.notFound('文件不存在');
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