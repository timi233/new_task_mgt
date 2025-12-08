"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHours = exports.formatDateTime = exports.formatDate = exports.generateOrderNo = void 0;
const prisma_1 = require("./prisma");
// 生成工单编号：类型 + 日期 + 序号
// 例如：CF20250115001
const generateOrderNo = async (orderType) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `${orderType}${dateStr}`;
    // 查询今天该类型的最大编号
    const lastOrder = await prisma_1.prisma.workOrder.findFirst({
        where: {
            orderNo: {
                startsWith: prefix,
            },
        },
        orderBy: {
            orderNo: 'desc',
        },
        select: {
            orderNo: true,
        },
    });
    let sequence = 1;
    if (lastOrder) {
        const lastSeq = parseInt(lastOrder.orderNo.slice(-3), 10);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(3, '0')}`;
};
exports.generateOrderNo = generateOrderNo;
// 格式化日期
const formatDate = (date) => {
    return date.toISOString().slice(0, 10);
};
exports.formatDate = formatDate;
// 格式化日期时间
const formatDateTime = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
};
exports.formatDateTime = formatDateTime;
// 计算工时差
const calculateHours = (start, end) => {
    const diff = end.getTime() - start.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
};
exports.calculateHours = calculateHours;
//# sourceMappingURL=helpers.js.map