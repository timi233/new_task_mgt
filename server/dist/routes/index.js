"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const workOrder_1 = __importDefault(require("./workOrder"));
const workbench_1 = __importDefault(require("./workbench"));
const statistics_1 = __importDefault(require("./statistics"));
const knowledge_1 = __importDefault(require("./knowledge"));
const user_1 = __importDefault(require("./user"));
const customer_1 = __importDefault(require("./customer"));
const channel_1 = __importDefault(require("./channel"));
const schedule_1 = __importDefault(require("./schedule"));
const feishuCallback_1 = __importDefault(require("./feishuCallback"));
const followUp_1 = __importDefault(require("./followUp"));
const router = (0, express_1.Router)();
// 认证路由（无需登录）
router.use('/auth', auth_1.default);
// 飞书回调路由（无需登录）
router.use('/feishu/callback', feishuCallback_1.default);
// 以下路由需要登录
router.use('/workorders', workOrder_1.default);
router.use('/workbench', workbench_1.default);
router.use('/statistics', statistics_1.default);
router.use('/knowledge', knowledge_1.default);
router.use('/users', user_1.default);
router.use('/customers', customer_1.default);
router.use('/channels', channel_1.default);
router.use('/schedule', schedule_1.default);
router.use('/workorders', followUp_1.default); // 跟进记录（挂载在 /workorders 下）
router.use('/follow-ups', followUp_1.default); // 附件下载
exports.default = router;
//# sourceMappingURL=index.js.map