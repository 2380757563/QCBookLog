/**
 * 豆列抓取客户端
 * 单线程 + 限速（默认 5 秒 + 随机抖动 2 秒）+ 重试退避 + 风控熔断。
 * 移植自 External/douban-books-ranking-main/src/douban_books/client.py 的 PoliteHttpClient。
 * 约束：只允许 www.douban.com / book.douban.com 的 HTTPS 地址。
 */
import axios from 'axios';
import { looksBlocked } from './doulist-parser.js';

const ALLOWED_HOSTS = new Set(['www.douban.com', 'book.douban.com']);

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5'
};

export class DoulistFetchError extends Error {}
export class DoulistBlockedError extends DoulistFetchError {
  constructor(message, { statusCode = null, url = null } = {}) {
    super(message);
    this.name = 'DoulistBlockedError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DoulistCrawler {
  /**
   * @param {object} opts
   * @param {number} opts.delay    请求间隔（秒），默认 5
   * @param {number} opts.jitter   随机抖动上限（秒），默认 2
   * @param {number} opts.timeout  单请求超时（毫秒），默认 20000
   * @param {number} opts.retries  429/5xx 重试次数，默认 2
   */
  constructor({ delay = 5, jitter = 2, timeout = 20000, retries = 2 } = {}) {
    this.delay = Math.max(2, delay);   // 下限保护 2 秒
    this.jitter = Math.max(0, jitter);
    this.timeout = timeout;
    this.retries = retries;
    this._lastRequestAt = 0;
    this.client = axios.create({
      headers: DEFAULT_HEADERS,
      timeout,
      maxRedirects: 5,
      validateStatus: () => true  // 由这里统一处理状态码
    });
  }

  /**
   * 抓取一个页面，返回 { html, finalUrl, status }
   * 403/418 或验证码页 → DoulistBlockedError（立即停止，不重试）
   */
  async fetch(url) {
    this._validateUrl(url);

    let lastError = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this._pace();

      let response;
      try {
        response = await this.client.get(url);
      } catch (err) {
        lastError = err;
        if (attempt >= this.retries) break;
        await sleep(this._backoffSeconds(attempt, null));
        continue;
      }

      const status = response.status;
      if (status === 403 || status === 418) {
        throw new DoulistBlockedError(`豆瓣返回 HTTP ${status}，已停止以避免加重风控`, { statusCode: status, url });
      }
      if (status === 429 || status >= 500) {
        lastError = new DoulistFetchError(`HTTP ${status}: ${url}`);
        if (attempt >= this.retries) break;
        await sleep(this._backoffSeconds(attempt, response.headers?.['retry-after']));
        continue;
      }
      if (status !== 200) {
        throw new DoulistFetchError(`HTTP ${status}: ${url}`);
      }

      const html = String(response.data || '');
      if (looksBlocked(html, response.request?.responseURL || url)) {
        throw new DoulistBlockedError('检测到验证码或异常请求提示页，已停止', { statusCode: status, url });
      }
      return { html, finalUrl: response.request?.responseURL || url, status };
    }

    throw new DoulistFetchError(`请求重试耗尽: ${url}; ${lastError?.message || ''}`);
  }

  _validateUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new DoulistFetchError(`非法地址: ${url}`);
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new DoulistFetchError(`拒绝访问非豆瓣 HTTPS 地址: ${url}`);
    }
  }

  async _pace() {
    const target = (this.delay + Math.random() * this.jitter) * 1000;
    const elapsed = Date.now() - this._lastRequestAt;
    if (elapsed < target) {
      await sleep(target - elapsed);
    }
    this._lastRequestAt = Date.now();
  }

  _backoffSeconds(attempt, retryAfter) {
    if (retryAfter) {
      const n = parseFloat(retryAfter);
      if (!isNaN(n)) return Math.min(300, Math.max(0, n));
    }
    return Math.min(60, 2 ** attempt + Math.random());
  }
}

export default DoulistCrawler;
