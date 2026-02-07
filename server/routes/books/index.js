/**
 * 书籍路由模块（重构版本）
 * 使用控制器模式，更清晰和可维护
 */

import express from 'express';
import bookController from './controllers/book-controller.js';
import uploadMiddleware from './middleware/upload-middleware.js';

const router = express.Router();

// 书籍 CRUD 路由
router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getBookById);
router.post('/', bookController.createBook);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

// 封面路由
router.post('/:id/cover', uploadMiddleware.single('cover'), bookController.uploadBookCover);
router.delete('/:id/cover', bookController.deleteBookCover);

// 搜索路由
router.get('/search', bookController.searchBooks);

// 阅读状态路由
router.get('/:id/reading-state', bookController.getReadingState);
router.put('/:id/reading-state', bookController.updateReadingState);

export default router;
