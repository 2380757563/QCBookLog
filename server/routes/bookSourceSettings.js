import express from 'express';
import bookSourceSettingsHandler from '../handlers/book-sources-handler.js';

const router = express.Router();

/**
 * 获取书源设置列表
 * GET /api/book-source-settings
 */
router.get('/', bookSourceSettingsHandler.getAll);

/**
 * 批量更新书源 API Key
 * POST /api/book-source-settings
 */
router.post('/', bookSourceSettingsHandler.save);

export default router;
