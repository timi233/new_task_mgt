"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const middlewares_1 = require("../middlewares");
const feishuService_1 = require("../feishu/feishuService");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// 飞书OAuth登录
router.post('/feishu/login', async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            throw middlewares_1.ApiError.badRequest('缺少授权码');
        }
        // 通过飞书获取用户信息
        const feishuService = new feishuService_1.FeishuService();
        const feishuUser = await feishuService.getUserByCode(code);
        // 查找或创建用户
        let user = await utils_1.prisma.user.findUnique({
            where: { feishuId: feishuUser.open_id },
        });
        if (!user) {
            // 首次登录，创建用户
            user = await utils_1.prisma.user.create({
                data: {
                    feishuId: feishuUser.open_id,
                    feishuUserId: feishuUser.user_id,
                    name: feishuUser.name,
                    phone: feishuUser.mobile || null,
                    email: feishuUser.email || null,
                    avatar: feishuUser.avatar_url || null,
                    role: types_1.Role.TECHNICIAN, // 默认技术人员角色（旧字段，保持兼容）
                    functionalRole: 'TECHNICIAN', // 功能权限：默认技术人员
                },
            });
        }
        else {
            // 更新用户信息
            user = await utils_1.prisma.user.update({
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
        const token = jsonwebtoken_1.default.sign({ userId: user.id, feishuId: user.feishuId }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        (0, utils_1.success)(res, {
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
    }
    catch (error) {
        next(error);
    }
});
// 刷新Token
router.post('/refresh', async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            throw middlewares_1.ApiError.badRequest('缺少Token');
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await utils_1.prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user || user.status !== types_1.UserStatus.ACTIVE) {
            throw middlewares_1.ApiError.unauthorized('用户不存在或已禁用');
        }
        const newToken = jsonwebtoken_1.default.sign({ userId: user.id, feishuId: user.feishuId }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        (0, utils_1.success)(res, { token: newToken }, 'Token刷新成功');
    }
    catch (error) {
        next(error);
    }
});
// 获取当前用户信息
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw middlewares_1.ApiError.unauthorized('请先登录');
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        const user = await utils_1.prisma.user.findUnique({
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
            throw middlewares_1.ApiError.unauthorized('用户不存在');
        }
        (0, utils_1.success)(res, user);
    }
    catch (error) {
        next(error);
    }
});
// 退出登录（前端清除token即可，这里只是占位）
router.post('/logout', (req, res) => {
    (0, utils_1.success)(res, null, '退出成功');
});
exports.default = router;
//# sourceMappingURL=auth.js.map