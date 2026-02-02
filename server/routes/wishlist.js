/**
 * 愿望清单路由模块
 * 处理愿望清单相关的API请求
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取愿望清单
 */
router.get('/', (req, res) => {
  try {
    const { readerId } = req.query;

    const wishlist = qcDataService.getWishlist(parseInt(readerId) || 0);

    res.json(wishlist);
  } catch (error) {
    console.error('获取愿望清单失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 添加到愿望清单
 */
router.post('/', (req, res) => {
  try {
    const { readerId, isbn, title, author, notes } = req.body;

    if (!isbn) {
      return res.status(400).json({ error: 'ISBN 是必填项' });
    }

    const newItem = qcDataService.addToWishlist(
      parseInt(readerId) || 0,
      { isbn, title, author, notes }
    );

    res.status(201).json(newItem);
  } catch (error) {
    console.error('添加到愿望清单失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新愿望清单项
 */
router.put('/:id', (req, res) => {
  try {
    const wishlistId = parseInt(req.params.id);
    const { title, author, notes } = req.body;

    const updatedItem = qcDataService.updateWishlistItem(wishlistId, {
      title,
      author,
      notes
    });

    if (!updatedItem) {
      return res.status(404).json({ error: '愿望清单项不存在' });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('更新愿望清单项失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 从愿望清单中移除
 */
router.delete('/:isbn', (req, res) => {
  try {
    const { readerId } = req.query;
    const isbn = req.params.isbn;

    const success = qcDataService.removeFromWishlist(
      parseInt(readerId) || 0,
      isbn
    );

    if (!success) {
      return res.status(404).json({ error: '愿望清单项不存在' });
    }

    res.json({ success: true, message: '已从愿望清单移除' });
  } catch (error) {
    console.error('从愿望清单移除失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
