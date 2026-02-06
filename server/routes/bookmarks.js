/**
 * 书摘路由模块
 * 处理书摘相关的API请求
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';
import activityService from '../services/activityService.js';

const router = express.Router();

/**
 * 获取所有书摘
 */
router.get('/', (req, res) => {
  try {
    const { bookId } = req.query;
    let bookmarks;
    
    // 支持按书籍ID过滤
    if (bookId) {
      bookmarks = qcDataService.getBookmarksByBookId(parseInt(bookId));
    } else {
      bookmarks = qcDataService.getAllBookmarks();
    }
    
    // 转换字段名，前端使用bookId、pageNum、createTime、updateTime
    const responseBookmarks = bookmarks.map(bookmark => ({
      ...bookmark,
      bookId: bookmark.book_id,
      pageNum: bookmark.page_num,
      id: bookmark.id,
      createTime: bookmark.created_at,
      updateTime: bookmark.updated_at
    }));
    
    res.json(responseBookmarks);
  } catch (error) {
    console.error('获取书摘失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据ID获取书摘
 */
router.get('/:id', (req, res) => {
  try {
    const bookmark = qcDataService.getBookmarkById(parseInt(req.params.id));
    if (!bookmark) {
      return res.status(404).json({ error: '书摘不存在' });
    }
    
    console.log('🔍 后端获取到的书摘数据:', bookmark);
    console.log('🔍 后端获取到的created_at:', bookmark.created_at);
    console.log('🔍 后端获取到的updated_at:', bookmark.updated_at);
    
    // 转换字段名，前端使用bookId、pageNum、createTime、updateTime
    const responseBookmark = {
      ...bookmark,
      bookId: bookmark.book_id,
      pageNum: bookmark.page_num,
      id: bookmark.id,
      createTime: bookmark.created_at,
      updateTime: bookmark.updated_at
    };
    delete responseBookmark.book_id;
    delete responseBookmark.page_num;
    delete responseBookmark.created_at;
    delete responseBookmark.updated_at;
    
    console.log('🔍 后端返回的书摘数据:', responseBookmark);
    console.log('🔍 后端返回的createTime:', responseBookmark.createTime);
    console.log('🔍 后端返回的updateTime:', responseBookmark.updateTime);
    
    res.json(responseBookmark);
  } catch (error) {
    console.error('获取书摘失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建书摘
 */
router.post('/', async (req, res) => {
  try {
    // 检查是否有items表，确保数据库连接正确
    const tables = qcDataService.db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    console.log('数据库表:', tables.map(t => t.name));
    
    // 转换字段名，前端使用bookId、pageNum，数据库使用book_id、page_num
    const bookmarkData = {
      ...req.body,
      book_id: req.body.bookId,
      page_num: req.body.pageNum
    };
    
    console.log('创建书摘数据:', bookmarkData);

    const newBookmark = qcDataService.createBookmark(bookmarkData);

    // 转换返回结果的字段名，前端使用bookId、pageNum
    const responseBookmark = {
      ...newBookmark,
      bookId: newBookmark.book_id,
      pageNum: newBookmark.page_num,
      id: newBookmark.id,
      createTime: newBookmark.created_at,
      updateTime: newBookmark.updated_at
    };
    delete responseBookmark.book_id;
    delete responseBookmark.page_num;
    delete responseBookmark.created_at;
    delete responseBookmark.updated_at;
    
    res.status(201).json(responseBookmark);
  } catch (error) {
    console.error('创建书摘失败:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(400).json({ error: error.message });
  }
});

/**
 * 更新书摘
 */
router.put('/:id', async (req, res) => {
  try {
    // 转换字段名，前端使用bookId、pageNum，数据库使用book_id、page_num
    const bookmarkData = {
      ...req.body,
      book_id: req.body.bookId,
      page_num: req.body.pageNum
    };
    
    const updatedBookmark = qcDataService.updateBookmark(parseInt(req.params.id), bookmarkData);
    if (!updatedBookmark) {
      return res.status(404).json({ error: '书摘不存在' });
    }

    // 转换返回结果的字段名，前端使用bookId、pageNum
    const responseBookmark = {
      ...updatedBookmark,
      bookId: updatedBookmark.book_id,
      pageNum: updatedBookmark.page_num,
      id: updatedBookmark.id,
      createTime: updatedBookmark.created_at,
      updateTime: updatedBookmark.updated_at
    };
    delete responseBookmark.book_id;
    delete responseBookmark.page_num;
    delete responseBookmark.created_at;
    delete responseBookmark.updated_at;
    
    res.json(responseBookmark);
  } catch (error) {
    console.error('更新书摘失败:', error.message);
    res.status(404).json({ error: error.message });
  }
});

/**
 * 删除书摘
 */
router.delete('/:id', async (req, res) => {
  try {
    const bookmark = qcDataService.getBookmarkById(parseInt(req.params.id));
    const success = qcDataService.deleteBookmark(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: '书摘不存在' });
    }

    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('删除书摘失败:', error.message);
    res.status(404).json({ error: error.message });
  }
});

/**
 * 导入书摘数据
 */
router.post('/import', (req, res) => {
  try {
    const { bookmarks } = req.body;
    
    if (!Array.isArray(bookmarks)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of bookmarks.' });
    }
    
    // 批量导入书摘
    let importedCount = 0;
    for (const bookmark of bookmarks) {
      try {
        // 转换字段名
        const bookmarkData = {
          ...bookmark,
          book_id: bookmark.bookId
        };
        qcDataService.createBookmark(bookmarkData);
        importedCount++;
      } catch (importError) {
        // 跳过单个导入失败的书摘，继续导入其他
        console.warn(`导入书摘失败: ${importError.message}`);
      }
    }
    
    res.json({ message: `导入成功，共${importedCount}个书摘` });
  } catch (error) {
    console.error('导入书摘失败:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * 导出书摘数据
 */
router.get('/export', (req, res) => {
  try {
    const bookmarks = qcDataService.getAllBookmarks();
    
    // 转换字段名，前端使用bookId、pageNum、createTime、updateTime
    const exportBookmarks = bookmarks.map(bookmark => ({
      ...bookmark,
      bookId: bookmark.book_id,
      pageNum: bookmark.page_num,
      createTime: bookmark.created_at,
      updateTime: bookmark.updated_at
    }));
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bookmarks_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportBookmarks);
  } catch (error) {
    console.error('导出书摘失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;