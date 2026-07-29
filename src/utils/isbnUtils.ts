/**
 * ISBN 工具函数
 * 用于添加书籍前的重复检测
 */

/**
 * 归一化 ISBN：
 * - 去除连字符和空格
 * - 全部转大写（用于 ISBN-10 末尾 'X' 的处理）
 */
export function normalizeIsbn(isbn: string | null | undefined): string {
  if (!isbn) return '';
  return String(isbn).replace(/[-\s]/g, '').toUpperCase();
}

/**
 * 校验 ISBN 是否合法（10 位或 13 位数字，ISBN-10 末尾可为 X）
 */
export function isValidIsbn(isbn: string | null | undefined): boolean {
  if (!isbn) return false;
  const cleaned = normalizeIsbn(isbn);
  if (cleaned.length === 10) {
    // ISBN-10: 9 位数字 + 1 位数字或 'X'
    return /^[0-9]{9}[0-9X]$/.test(cleaned);
  }
  if (cleaned.length === 13) {
    // ISBN-13: 13 位数字
    return /^[0-9]{13}$/.test(cleaned);
  }
  return false;
}
