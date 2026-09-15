/**
 * 豆列路由
 * POST /api/doulist/preview  抓取预览（不落库），支持分页断点
 * GET  /api/doulist/settings 读取豆列设置
 * POST /api/doulist/settings 保存豆列设置
 * POST /api/doulist/enrich   可选补全（内置 DBR，免 Key）
 * POST /api/doulist/import   写入 qc_doulist_books（按 douban_id 唯一键 upsert）
 */
import express from 'express';
import {
  previewDoulist,
  parseDoulistInput,
  DoulistBlockedError
} from '../services/doulist/doulist-service.js';
import { getDoulistSettings, saveDoulistSettings } from '../services/doulist/doulist-settings.js';
import doulistRepository from '../repositories/qcbooklog/qc-doulist-repository.js';
import doulistEnrichService from '../services/doulist/doulist-enrich.js';

const router = express.Router();

/**
 * 抓取预览
 * body: { input, start=0, maxPages=1 }
 * 每页 25 本；前端从 start=0 开始循环调用直到 reachedEnd/blocked，实现实时进度。
 */
router.post('/preview', async (req, res) => {
  try {
    const { input, start = 0, maxPages = 1 } = req.body || {};
    const result = await previewDoulist(input, { start, maxPages });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 豆列预览失败:', error.message);
    const blocked = error instanceof DoulistBlockedError;
    res.status(blocked ? 429 : 400).json({
      ok: false,
      blocked,
      error: blocked
        ? '豆瓣暂时限制了访问，请稍后再试'
        : (error.message || '豆列抓取失败')
    });
  }
});

/**
 * 豆列设置
 */
router.get('/settings', async (req, res) => {
  try {
    res.json({ ok: true, data: await getDoulistSettings() });
  } catch (error) {
    console.error('❌ 读取豆列设置失败:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const data = await saveDoulistSettings(req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    console.error('❌ 保存豆列设置失败:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * 补全（可选，默认 none 不发请求）
 * body: { doubanIds: [...], mode?, source? }
 */
router.post('/enrich', async (req, res) => {
  try {
    const { doubanIds, mode, source } = req.body || {};
    if (!Array.isArray(doubanIds) || doubanIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'doubanIds 不能为空' });
    }
    if (doubanIds.length > 50) {
      return res.status(400).json({ ok: false, error: '单次补全最多 50 本，请分批调用' });
    }
    const result = await doulistEnrichService.enrich(doubanIds, { mode, source });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 豆列补全失败:', error.message);
    const blocked = error instanceof DoulistBlockedError;
    res.status(blocked ? 429 : 500).json({ ok: false, blocked, error: error.message });
  }
});

/**
 * 导入：写入独立豆列表，以 douban_id 为唯一键 upsert，不经过 POST /api/books
 * body: { books: [...], doulist: { id, title, owner, ownerUrl }, incremental? }
 * incremental=true 为增量刷新：已在该书单里的书不做任何更改
 */
router.post('/import', async (req, res) => {
  try {
    const { books, doulist, incremental } = req.body || {};
    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ ok: false, error: 'books 不能为空' });
    }
    if (!doulist || !doulist.id) {
      return res.status(400).json({ ok: false, error: 'doulist.id 不能为空' });
    }
    parseDoulistInput(doulist.id); // 校验 ID 合法性

    const result = doulistRepository.importBooks(books, {
      doulistId: String(doulist.id),
      doulistTitle: doulist.title || null,
      owner: doulist.owner || null,
      ownerUrl: doulist.ownerUrl || null,
      incrementalOnly: Boolean(incremental)
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 豆列导入失败:', error.message);
    res.status(500).json({ ok: false, error: error.message || '导入失败' });
  }
});

/**
 * 豆列书单列表（前端书单页读取）
 * GET /api/doulist/books?doulistId=&category=&status=&hideShelved=&page=&pageSize=&keyword=
 * 默认按加入书单的时间倒序排列
 */
router.get('/books', async (req, res) => {
  try {
    const { doulistId, category, status, hideShelved, page = 1, pageSize = 50, keyword } = req.query;
    const result = doulistRepository.listBooks({
      doulistId: doulistId || null,
      category: ['buy', 'read'].includes(category) ? category : null,
      status: ['pending', 'shelf'].includes(status) ? status : null,
      hideShelved: hideShelved === '1' || hideShelved === 'true',
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(200, Math.max(1, Number(pageSize) || 50)),
      keyword: keyword || null
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 读取豆列书单失败:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * 手动添加一本书到书单（不来自豆列抓取）
 * body: { title, author?, publisher?, publishYear?, doubanRef?, doulistId?, doulistTitle?, category? }
 * 书籍必须归属一个书单：doulistId 选已有书单，或 doulistTitle 新建本地书单
 */
router.post('/books', async (req, res) => {
  try {
    const { title, author, publisher, publishYear, isbn13, doubanRef, doulistId, doulistTitle, category } = req.body || {};
    const result = doulistRepository.createBook({
      title, author, publisher, publishYear, isbn13, doubanRef, doulistId, doulistTitle, category
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 手动添加书单书籍失败:', error.message);
    res.status(400).json({ ok: false, error: error.message || '添加失败' });
  }
});

/**
 * 加入 / 撤回书架
 * body: { status: 'shelf' | 'pending' }
 */
router.post('/books/:doubanId/shelf', async (req, res) => {
  try {
    const { status } = req.body || {};
    const result = doulistRepository.setShelfStatus(req.params.doubanId, status);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 更新书架状态失败:', error.message);
    res.status(400).json({ ok: false, error: error.message || '更新失败' });
  }
});

/**
 * 检查某本豆列书在本地书库是否已存在（按 ISBN）
 * 用于「加入书架」按钮置灰判断
 */
router.get('/books/:doubanId/shelf-check', async (req, res) => {
  try {
    const book = doulistRepository.findByDoubanId(req.params.doubanId);
    if (!book) {
      return res.json({ ok: true, exists: false });
    }
    const result = doulistRepository.isBookOnShelfByIsbn(book.isbn13, book.isbn10);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 检查书架存在失败:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * 设置阅读状态（阅读清单用：未读 / 在读 / 已读）
 * body: { status: 'unread' | 'reading' | 'read' }
 */
router.post('/books/:doubanId/read-status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const result = doulistRepository.setReadStatus(req.params.doubanId, status);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 更新阅读状态失败:', error.message);
    res.status(400).json({ ok: false, error: error.message || '更新失败' });
  }
});

/**
 * 保存抓取进度（断点续跑）
 * body: { lastStart, fetchedItems, title?, owner?, ownerUrl? }
 * lastStart > 0 标记为进行中；导入完成或放弃后传 lastStart=0 清除续传标记。
 */
router.post('/imports/:doulistId/progress', async (req, res) => {
  try {
    const { lastStart, fetchedItems, title, owner, ownerUrl } = req.body || {};
    const result = doulistRepository.saveCrawlProgress({
      doulistId: req.params.doulistId,
      lastStart,
      fetchedItems,
      title,
      owner,
      ownerUrl
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 保存抓取进度失败:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * 更新书单分类（buy 买书 / read 读书）
 * body: { category }
 */
router.put('/imports/:doulistId', async (req, res) => {
  try {
    const { category } = req.body || {};
    const result = doulistRepository.setDoulistCategory(req.params.doulistId, category);
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('❌ 更新书单分类失败:', error.message);
    res.status(400).json({ ok: false, error: error.message || '更新失败' });
  }
});

/**
 * 豆列导入记录列表
 */
router.get('/imports', async (req, res) => {
  try {
    const rows = doulistRepository.listImports();
    res.json({ ok: true, data: rows });
  } catch (error) {
    console.error('❌ 读取豆列导入记录失败:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
