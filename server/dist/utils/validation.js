"use strict";
/**
 * 输入验证工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeKeyword = sanitizeKeyword;
exports.sanitizeDays = sanitizeDays;
exports.sanitizePagination = sanitizePagination;
const MAX_KEYWORD_LENGTH = 100;
const MAX_DAYS_RANGE = 365;
/**
 * 验证并截断搜索关键词
 */
function sanitizeKeyword(keyword) {
    if (!keyword)
        return undefined;
    const trimmed = keyword.trim();
    if (trimmed.length === 0)
        return undefined;
    return trimmed.substring(0, MAX_KEYWORD_LENGTH);
}
/**
 * 验证并限制天数范围
 */
function sanitizeDays(days, defaultValue = 30) {
    if (days === undefined || days === null)
        return defaultValue;
    const parsed = typeof days === 'string' ? parseInt(days, 10) : days;
    if (isNaN(parsed) || parsed < 1)
        return defaultValue;
    return Math.min(parsed, MAX_DAYS_RANGE);
}
/**
 * 验证分页参数
 */
function sanitizePagination(page, pageSize, maxPageSize = 100) {
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page || 1);
    const parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : (pageSize || 20);
    return {
        page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
        pageSize: Math.min(maxPageSize, Math.max(1, isNaN(parsedPageSize) ? 20 : parsedPageSize)),
    };
}
//# sourceMappingURL=validation.js.map