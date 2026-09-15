/**
 * 豆列抓取编排服务
 * preview：从 start 偏移开始抓取最多 maxPages 页（每页 25 本），
 * 由前端逐页循环调用以实现实时进度与断点续跑，后端不做长循环。
 */
import { DoulistCrawler, DoulistBlockedError, DoulistFetchError } from './doulist-crawler.js';
import { parseDoulistPage, looksBlocked } from './doulist-parser.js';
import { getDoulistSettings } from './doulist-settings.js';

const DOULIST_ID_RE = /^\d{4,}$/;

/**
 * 解析用户输入：支持完整豆列 URL 或纯数字 ID
 * @returns {string} 豆列数字 ID
 */
export function parseDoulistInput(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new DoulistFetchError('请输入豆列链接或数字 ID');
  if (DOULIST_ID_RE.test(raw)) return raw;

  const match = raw.match(/doulist\/(\d+)/);
  if (match) return match[1];
  throw new DoulistFetchError('无法识别的豆列链接，请输入如 https://www.douban.com/doulist/163262035/ 或纯数字 ID');
}

function buildPageUrl(doulistId, start) {
  return `https://www.douban.com/doulist/${doulistId}/?start=${start}`;
}

/**
 * 抓取预览（不落库）
 * @param {string} input  豆列 URL 或数字 ID
 * @param {object} opts   { start=0, maxPages=1, delay? }
 */
export async function previewDoulist(input, opts = {}) {
  const doulistId = parseDoulistInput(input);
  const settings = await getDoulistSettings();
  const start = Math.max(0, Number(opts.start) || 0);
  let maxPages = opts.maxPages !== undefined ? Number(opts.maxPages) : 1;
  if (isNaN(maxPages) || maxPages < 0) maxPages = 1;
  maxPages = Math.min(maxPages, 20); // 单请求上限保护
  if (maxPages === 0) maxPages = 20;

  const delay = opts.delay !== undefined ? Math.max(2, Number(opts.delay) || 5) : settings.doulistDelay;
  const crawler = new DoulistCrawler({ delay });

  const books = [];
  let meta = { id: doulistId, title: null, owner: null, ownerUrl: null, totalPages: 0 };
  let nextStart = start;
  let blocked = false;
  let pagesFetched = 0;
  let reachedEnd = false;

  try {
    while (pagesFetched < maxPages && nextStart !== null) {
      const url = buildPageUrl(doulistId, nextStart);
      const { html, finalUrl } = await crawler.fetch(url);
      const result = parseDoulistPage(html, finalUrl);

      if (result.meta.title) meta.title = result.meta.title;
      if (result.meta.owner) meta.owner = result.meta.owner;
      if (result.meta.ownerUrl) meta.ownerUrl = result.meta.ownerUrl;
      if (result.meta.totalPages) meta.totalPages = result.meta.totalPages;

      // 空页视为到尾
      if (!result.books.length) {
        reachedEnd = true;
        nextStart = null;
        break;
      }

      books.push(...result.books);
      pagesFetched++;
      nextStart = result.nextStart;
      if (nextStart === null) reachedEnd = true;
    }
  } catch (err) {
    if (err instanceof DoulistBlockedError) {
      blocked = true;
    } else if (books.length === 0) {
      throw err;
    } else {
      // 已抓到部分数据时，返回部分结果并标注错误
      return {
        doulist: { ...meta, totalPages: meta.totalPages || 1 },
        books,
        nextStart,
        blocked: false,
        reachedEnd: false,
        pagesFetched,
        partialError: err.message
      };
    }
  }

  return {
    doulist: { ...meta, totalPages: meta.totalPages || 1 },
    books,
    nextStart,
    blocked,
    reachedEnd,
    pagesFetched
  };
}

export { looksBlocked, DoulistBlockedError, DoulistFetchError };
export default { parseDoulistInput, previewDoulist };
