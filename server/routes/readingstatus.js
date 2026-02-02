/**
 * 阅读状态路由模块
 * 处理书籍阅读状态相关的API请求
 */

import express from 'express';
import {
  readJsonFile,
  writeJsonFile,
  addJsonItem,
  updateJsonItem,
  deleteJsonItem,
  getJsonItem,
  updateVersionInfo
} from '../services/dataService.js';

const router = express.Router();

/**
 * 获取所有阅读状态
 */
router.get('/', async (req, res) => {
  try {
    const readingStatus = await readJsonFile('readingstatus/readingstatus.json');
    
    // 支持按书籍ID过滤
    const { bookId } = req.query;
    if (bookId) {
      const filteredStatus = readingStatus.filter(status => status.bookId === bookId);
      return res.json(filteredStatus);
    }
    
    res.json(readingStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据ID获取阅读状态
 */
router.get('/:id', async (req, res) => {
  try {
    const status = await getJsonItem('readingstatus/readingstatus.json', req.params.id);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * 创建阅读状态
 */
router.post('/', async (req, res) => {
  try {
    // 检查是否已经存在该书籍的阅读状态
    const allStatus = await readJsonFile('readingstatus/readingstatus.json');
    const existingStatus = allStatus.find(status => status.bookId === req.body.bookId);
    
    if (existingStatus) {
      // 如果已存在，则更新
      const updatedStatus = await updateJsonItem('readingstatus/readingstatus.json', existingStatus.id, req.body);
      await updateVersionInfo();
      return res.json(updatedStatus);
    }
    
    // 如果不存在，则创建
    const newStatus = await addJsonItem('readingstatus/readingstatus.json', req.body);
    await updateVersionInfo();
    res.status(201).json(newStatus);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 更新阅读状态
 */
router.put('/:id', async (req, res) => {
  try {
    const updatedStatus = await updateJsonItem('readingstatus/readingstatus.json', req.params.id, req.body);
    await updateVersionInfo();
    res.json(updatedStatus);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * 删除阅读状态
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteJsonItem('readingstatus/readingstatus.json', req.params.id);
    await updateVersionInfo();
    res.json({ message: 'Reading status deleted successfully' });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * 导入阅读状态数据
 */
router.post('/import', async (req, res) => {
  try {
    const { readingStatus } = req.body;
    
    if (!Array.isArray(readingStatus)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of reading status.' });
    }
    
    await writeJsonFile('readingstatus/readingstatus.json', readingStatus);
    await updateVersionInfo();
    res.json({ message: `导入成功，共${readingStatus.length}条阅读状态` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 导出阅读状态数据
 */
router.get('/export', async (req, res) => {
  try {
    const readingStatus = await readJsonFile('readingstatus/readingstatus.json');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="readingstatus_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(readingStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;