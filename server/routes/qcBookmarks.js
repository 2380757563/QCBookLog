/**
 * 书摘管理路由
 */

import express from 'express';
import qcDataService from '../services/legacy/qcDataService.js';
import activityService from '../services/legacy/activityService.js';

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
    console.log('📥 收到创建书摘请求:', JSON.stringify(req.body, null, 2));
    const bookmark = qcDataService.createBookmark(req.body);
    console.log('✅ 书摘创建成功:', bookmark);
    
    // 记录活动日志
    activityService.logActivity({
      type: 'bookmark_added',
      userId: req.body.userId || 0,
      readerId: req.body.readerId || 0,
      bookId: bookmark.bookId || bookmark.book_id,
      bookTitle: bookmark.bookTitle || bookmark.book_title,
      bookAuthor: bookmark.bookAuthor || bookmark.book_author,
      bookCover: bookmark.coverUrl,
      content: bookmark.content || bookmark.text,
      chapter: bookmark.chapter,
      startPage: bookmark.pageNum || bookmark.pos,
      endPage: bookmark.pageNum || bookmark.pos,
      metadata: { bookmarkId: bookmark.id }
    });
    
    res.status(201).json(bookmark);
  } catch (error) {
    console.error('❌ 创建书摘失败:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
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
    
    // 记录活动日志
    activityService.logActivity({
      type: 'bookmark_updated',
      userId: req.body.userId || 0,
      readerId: req.body.readerId || 0,
      bookId: bookmark.bookId || bookmark.book_id,
      bookTitle: bookmark.bookTitle || bookmark.book_title,
      bookAuthor: bookmark.bookAuthor || bookmark.book_author,
      bookCover: bookmark.coverUrl,
      content: bookmark.content || bookmark.text,
      metadata: { bookmarkId: bookmark.id }
    });
    
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
    // 先获取书摘信息用于记录日志
    const bookmark = qcDataService.getBookmarkById(parseInt(req.params.id));
    const success = qcDataService.deleteBookmark(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: '书摘不存在' });
    }
    
    // 记录活动日志
    if (bookmark) {
      activityService.logActivity({
        type: 'bookmark_deleted',
        userId: req.body.userId || 0,
        readerId: req.body.readerId || 0,
        bookId: bookmark.bookId || bookmark.book_id,
        bookTitle: bookmark.bookTitle || bookmark.book_title,
        bookAuthor: bookmark.bookAuthor || bookmark.book_author,
        bookCover: bookmark.coverUrl,
        content: bookmark.content || bookmark.text,
        metadata: { bookmarkId: bookmark.id }
      });
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