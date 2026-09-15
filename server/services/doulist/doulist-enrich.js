/**
 * 豆列元数据补全服务
 * 默认模式 none：不发任何请求，原样返回。
 * source=dbr（默认）：调内置 dbrService.getBookById()（免 API Key，1 请求/本，抓豆瓣详情页）。
 * source=doubanapi：调 api.douban.com/v2/book/{id}（需用户已配 apikey），失败自动回落 DBR。
 * source=booksource：先经 DBR 拿 ISBN，再调已配 Key 的书源 searchByIsbn 交叉校验（豆瓣字段优先）。
 * 串行 + 限速（读 doulistDelay，下限 2 秒），与豆列抓取共用豆瓣风控约束。
 */
import dbrService from '../legacy/dbrService.js';
import bookSourceSettingsService from '../settings/book-source-settings-service.js';
import { getDoulistSettings } from './doulist-settings.js';
import doulistRepository from '../../repositories/qcbooklog/qc-doulist-repository.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toArray(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? value : null;
  const s = String(value).trim();
  return s ? s : null;
}

/**
 * DBR 结果 → 豆列补全字段
 */
function mapDbrBook(book) {
  if (!book) return null;
  return {
    subtitle: toArray(book.subtitle),
    translator: toArray(book.translators ?? book.translator),
    publisher: toArray(book.publisher),
    publishYear: toArray(book.pubdate),
    isbn13: toArray(book.isbn13),
    isbn10: toArray(book.isbn10),
    pages: book.pages ? parseInt(book.pages, 10) || null : null,
    price: book.price ? parseFloat(book.price) || null : null,
    binding: toArray(book.binding),
    producer: toArray(book.producer),
    series: toArray(book.serials ?? book.series),
    tags: book.tags ? (Array.isArray(book.tags) ? book.tags : String(book.tags).split(/[,，]/).map(t => t.trim()).filter(Boolean)) : null,
    summary: toArray(book.summary)
  };
}

/**
 * 豆瓣 v2 API 结果 → 补全字段
 */
function mapDoubanApiBook(data) {
  if (!data) return null;
  return {
    subtitle: toArray(data.subtitle),
    translator: toArray(data.translator),
    publisher: toArray(data.publisher),
    publishYear: toArray(data.pubdate),
    isbn13: toArray(data.isbn13),
    isbn10: toArray(data.isbn10),
    pages: data.pages ? parseInt(data.pages, 10) || null : null,
    price: data.price ? parseFloat(data.price) || null : null,
    binding: toArray(data.binding),
    producer: toArray(data.producer),
    series: toArray(data.series),
    tags: Array.isArray(data.tags) ? data.tags.map(t => t.name || t) : null,
    summary: toArray(data.summary)
  };
}

class DoulistEnrichService {
  /**
   * 补全一批书籍
   * @param {string[]} doubanIds
   * @param {object} opts { mode, source, delay } 不传则读豆列设置
   * @returns {{ mode, source, items: Array<{doubanId, ok, fields?, error?}>, failed: number }}
   */
  async enrich(doubanIds, opts = {}) {
    const settings = await getDoulistSettings();
    const mode = opts.mode || settings.doulistEnrichMode || 'none';
    const source = opts.source || settings.doulistEnrichSource || 'dbr';
    const delay = Math.max(2, Number(opts.delay ?? settings.doulistDelay) || 5) * 1000;

    // 默认模式：直接返回，不发任何请求
    if (mode === 'none') {
      return { mode, source, items: doubanIds.map((id) => ({ doubanId: id, ok: true, fields: null })), failed: 0 };
    }

    const items = [];
    let failed = 0;
    let skipped = 0;
    let first = true;

    for (const doubanId of doubanIds) {
      // 智能补全：只补库里缺 ISBN 的书，已有 ISBN 的直接跳过（省请求）
      if (mode === 'smart') {
        const row = doulistRepository.findByDoubanId(doubanId);
        if (row && row.isbn13) {
          skipped++;
          items.push({ doubanId, ok: true, skipped: true, fields: null });
          continue;
        }
      }

      if (!first) await sleep(delay); // 限速（首条不等待）
      first = false;

      try {
        const fields = await this._enrichOne(String(doubanId), source);
        if (fields) {
          // 持久化补全字段（仅覆盖非空字段）
          try {
            doulistRepository.saveEnriched(doubanId, { ...fields, enrichStatus: 'done' });
          } catch (persistErr) {
            console.warn(`⚠️ 补全结果落库失败(${doubanId}): ${persistErr.message}`);
          }
          items.push({ doubanId, ok: true, fields });
        } else {
          failed++;
          items.push({ doubanId, ok: false, error: '查询失败' });
        }
      } catch (err) {
        failed++;
        items.push({ doubanId, ok: false, error: err.message });
        try {
          doulistRepository.saveEnriched(doubanId, { enrichStatus: 'failed' });
        } catch { /* 忽略落库失败 */ }
      }
    }

    return { mode, source, items, failed, skipped };
  }

  async _enrichOne(doubanId, source) {
    // A. 内置 DBR（免 Key，默认）
    let dbrFields = null;
    const dbrBook = await dbrService.getBookById(doubanId, false);
    dbrFields = mapDbrBook(dbrBook);

    if (source === 'doubanapi') {
      // B. 豆瓣 v2 API（需 Key），失败自动回落 DBR
      try {
        const apiFields = await this._viaDoubanApi(doubanId);
        if (apiFields) return this._merge(dbrFields, apiFields, { preferApi: true });
      } catch (err) {
        console.warn(`⚠️ 豆瓣 v2 API 补全失败(${doubanId})，回落 DBR: ${err.message}`);
      }
      return dbrFields;
    }

    if (source === 'booksource') {
      // C. 先经 DBR 拿 ISBN，再调书源交叉校验（豆瓣优先）
      const isbn = dbrFields?.isbn13 || dbrFields?.isbn10;
      if (!isbn) return dbrFields;
      const sourceFields = await this._viaBookSource(isbn);
      return this._merge(dbrFields, sourceFields, { preferApi: false });
    }

    return dbrFields;
  }

  async _viaDoubanApi(doubanId) {
    const config = bookSourceSettingsService.getByKey('douban');
    if (!config?.apiKey) {
      throw new Error('豆瓣 v2 API 未配置 apikey');
    }
    const { default: axios } = await import('axios');
    const { data } = await axios.get(`https://api.douban.com/v2/book/${doubanId}`, {
      params: { apikey: config.apiKey },
      timeout: 15000
    });
    if (!data || data.code === 400) throw new Error('豆瓣 v2 API 返回异常');
    return mapDoubanApiBook(data);
  }

  async _viaBookSource(isbn) {
    // 按已配置 Key 的书源依次尝试（tanshu / isbnWork / douban）
    const candidates = ['tanshu', 'isbnWork', 'douban'];
    for (const key of candidates) {
      try {
        const data = await bookSourceSettingsService.searchByIsbn(key, isbn);
        if (data) {
          return {
            subtitle: toArray(data.subtitle),
            translator: toArray(data.translator),
            publisher: toArray(data.press ?? data.publisher),
            publishYear: toArray(data.pubdate),
            pages: data.pages ? parseInt(data.pages, 10) || null : null,
            price: data.price ? parseFloat(data.price) || null : null,
            binding: toArray(data.binding),
            summary: toArray(data.summary ?? data.bookDesc)
          };
        }
      } catch (err) {
        console.warn(`⚠️ 书源 ${key} 按 ISBN ${isbn} 查询失败: ${err.message}`);
      }
    }
    return null;
  }

  /**
   * 合并：豆瓣详情页字段优先（preferApi=false），或 v2 API 优先（preferApi=true）
   */
  _merge(base, extra, { preferApi = false }) {
    if (!extra) return base;
    const primary = preferApi ? extra : base;
    const secondary = preferApi ? base : extra;
    const merged = { ...secondary };
    for (const [k, v] of Object.entries(primary)) {
      if (v !== null && v !== undefined) merged[k] = v;
    }
    return merged;
  }
}

export default new DoulistEnrichService();
