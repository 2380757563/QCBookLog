/**
 * 标签路由模块
 * 处理标签相关的API请求
 * 注意：不再使用 qc_tags 表，标签直接存储在 qc_bookmark_tags 表中
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取所有书摘标签
 */
router.get('/', (req, res) => {
  try {
    const tags = qcDataService.getAllBookmarkTags();
    res.json(tags);
  } catch (error) {
    console.error('获取书摘标签失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取指定书摘的标签
 */
router.get('/bookmark/:bookmarkId', (req, res) => {
  try {
    const tags = qcDataService.getBookmarkTags(parseInt(req.params.bookmarkId));
    res.json(tags);
  } catch (error) {
    console.error('获取书摘标签失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除指定标签（从所有书摘中移除该标签）
 */
router.delete('/:tagName', (req, res) => {
  try {
    const tagName = decodeURIComponent(req.params.tagName);
    const deletedCount = qcDataService.deleteTag(tagName);
    res.json({
      message: `成功从 ${deletedCount} 条书摘中删除标签 "${tagName}"`,
      deletedCount
    });
  } catch (error) {
    console.error('删除标签失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
