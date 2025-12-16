/**
 * 输入验证工具
 */
/**
 * 验证并截断搜索关键词
 */
export declare function sanitizeKeyword(keyword: string | undefined): string | undefined;
/**
 * 验证并限制天数范围
 */
export declare function sanitizeDays(days: string | number | undefined, defaultValue?: number): number;
/**
 * 验证分页参数
 */
export declare function sanitizePagination(page: string | number | undefined, pageSize: string | number | undefined, maxPageSize?: number): {
    page: number;
    pageSize: number;
};
//# sourceMappingURL=validation.d.ts.map