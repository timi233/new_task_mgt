/**
 * 输入验证工具
 */

const MAX_KEYWORD_LENGTH = 100;
const MAX_DAYS_RANGE = 365;

/**
 * 验证并截断搜索关键词
 */
export function sanitizeKeyword(keyword: string | undefined): string | undefined {
  if (!keyword) return undefined;
  const trimmed = keyword.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.substring(0, MAX_KEYWORD_LENGTH);
}

/**
 * 验证并限制天数范围
 */
export function sanitizeDays(days: string | number | undefined, defaultValue = 30): number {
  if (days === undefined || days === null) return defaultValue;
  const parsed = typeof days === 'string' ? parseInt(days, 10) : days;
  if (isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, MAX_DAYS_RANGE);
}

/**
 * 验证分页参数
 */
export function sanitizePagination(
  page: string | number | undefined,
  pageSize: string | number | undefined,
  maxPageSize = 100
): { page: number; pageSize: number } {
  const parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page || 1);
  const parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : (pageSize || 20);

  return {
    page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
    pageSize: Math.min(maxPageSize, Math.max(1, isNaN(parsedPageSize) ? 20 : parsedPageSize)),
  };
}
