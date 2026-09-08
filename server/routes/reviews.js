/**
 * 书评管理路由
 */

import express from 'express';
import reviewService from '../services/legacy/reviewService.js';
import activityService from '../services/legacy/activityService.js';

const router = express.Router();

/**
 * 获取所有书评
 */
router.get('/', (req, res) => {
  try {
    const { bookId } = req.query;
    let reviews;

    if (bookId) {
      reviews = reviewService.getReviewsByBookId(parseInt(bookId));
    } else {
      reviews = reviewService.getAllReviews();
    }

    res.json(reviews);
  } catch (error) {
    console.error('获取书评失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建书评
 */
router.post('/', (req, res) => {
  try {
    const review = reviewService.createReview(req.body);

    activityService.logActivity({
      type: 'review_added',
      userId: req.body.userId || 0,
      bookId: review.bookId || review.book_id,
      bookTitle: review.bookTitle || review.book_title,
      bookAuthor: review.bookAuthor || review.book_author,
      bookCover: review.coverUrl,
      content: review.title || '无标题书评',
      metadata: { reviewId: review.id }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('创建书评失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取指定书评
 */
router.get('/:id', (req, res) => {
  try {
    const review = reviewService.getReviewById(parseInt(req.params.id));
    if (!review) {
      return res.status(404).json({ error: '书评不存在' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新书评
 */
router.put('/:id', (req, res) => {
  try {
    const review = reviewService.updateReview(parseInt(req.params.id), req.body);
    if (!review) {
      return res.status(404).json({ error: '书评不存在' });
    }

    activityService.logActivity({
      type: 'review_updated',
      userId: req.body.userId || 0,
      bookId: review.bookId || review.book_id,
      bookTitle: review.bookTitle || review.book_title,
      bookAuthor: review.bookAuthor || review.book_author,
      bookCover: review.coverUrl,
      content: review.title || '无标题书评',
      metadata: { reviewId: review.id }
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除书评
 */
router.delete('/:id', (req, res) => {
  try {
    const review = reviewService.getReviewById(parseInt(req.params.id));
    const success = reviewService.deleteReview(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: '书评不存在' });
    }

    if (review) {
      activityService.logActivity({
        type: 'review_deleted',
        userId: req.body.userId || 0,
        bookId: review.bookId || review.book_id,
        bookTitle: review.bookTitle || review.book_title,
        bookAuthor: review.bookAuthor || review.book_author,
        bookCover: review.coverUrl,
        content: review.title || '无标题书评',
        metadata: { reviewId: review.id }
      });
    }

    res.json({ message: '书评删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取指定书籍的所有书评
 */
router.get('/books/:bookId', (req, res) => {
  try {
    const reviews = reviewService.getReviewsByBookId(parseInt(req.params.bookId));
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
