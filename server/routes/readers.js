/**
 * 读者路由模块
 * 处理读者相关的API请求
 */

import express from 'express';
import databaseService from '../services/database/index.js';

const router = express.Router();

/**
 * 获取所有读者列表
 */
router.get('/', async (req, res) => {
  try {
    const readers = databaseService.getAllReaders();
    res.json(readers);
  } catch (error) {
    console.error('❌ 获取读者列表失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据ID获取读者信息
 */
router.get('/:id', async (req, res) => {
  try {
    const readerId = parseInt(req.params.id);

    if (isNaN(readerId)) {
      return res.status(400).json({ error: 'Invalid reader ID' });
    }

    const reader = databaseService.getReaderById(readerId);
    res.json(reader);
  } catch (error) {
    console.error('❌ 获取读者信息失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
