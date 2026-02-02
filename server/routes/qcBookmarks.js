/**
 * 书摘管理路由
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取所有书摘
 */
router.get('/', (req, res) => {
  try {
    const { bookId } = req.query;
    let bookmarks;

    if (bookId) {
      // 如果提供了 bookId，只获取该书籍的书摘
      console.log('获取书籍书摘 - bookId:', bookId);
      bookmarks = qcDataService.getBookmarksByBookId(parseInt(bookId));
    } else {
      // 否则获取所有书摘
      bookmarks = qcDataService.getAllBookmarks();
    }

    res.json(bookmarks);
  } catch (error) {
    console.error('获取书摘失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建书摘
 */
router.post('/', (req, res) => {
  try {
    const bookmark = qcDataService.createBookmark(req.body);
    res.status(201).json(bookmark);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取指定书摘
 */
router.get('/:id', (req, res) => {
  try {
    const bookmark = qcDataService.getBookmarkById(parseInt(req.params.id));
    if (!bookmark) {
      return res.status(404).json({ error: '书摘不存在' });
    }
    res.json(bookmark);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新书摘
 */
router.put('/:id', (req, res) => {
  try {
    const bookmark = qcDataService.updateBookmark(parseInt(req.params.id), req.body);
    if (!bookmark) {
      return res.status(404).json({ error: '书摘不存在' });
    }
    res.json(bookmark);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除书摘
 */
router.delete('/:id', (req, res) => {
  try {
    const success = qcDataService.deleteBookmark(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: '书摘不存在' });
    }
    res.json({ message: '书摘删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取指定书籍的所有书摘
 */
router.get('/books/:bookId', (req, res) => {
  try {
    const bookmarks = qcDataService.getBookmarksByBookId(parseInt(req.params.bookId));
    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除指定书籍的所有书摘
 */
router.delete('/books/:bookId', (req, res) => {
  try {
    const deletedCount = qcDataService.deleteBookBookmarks(parseInt(req.params.bookId));
    res.json({
      message: `成功删除 ${deletedCount} 条书摘`,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;