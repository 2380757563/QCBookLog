/**
 * 阅读热力图路由模块
 * 处理阅读热力图相关的API请求
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取指定年份的阅读热力图数据
 */
router.get('/:year', (req, res) => {
  try {
    const { readerId } = req.query;
    const year = parseInt(req.params.year);

    const heatmapData = qcDataService.getReadingHeatmap(
      parseInt(readerId) || 0,
      year
    );

    res.json(heatmapData);
  } catch (error) {
    console.error('获取阅读热力图失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 从书摘重新计算热力图数据
 */
router.post('/recalculate/:year', (req, res) => {
  try {
    const { readerId } = req.query;
    const year = parseInt(req.params.year);

    const count = qcDataService.recalculateHeatmapFromBookmarks(
      parseInt(readerId) || 0,
      year
    );

    res.json({
      success: true,
      message: `已重新计算 ${year} 年的热力图数据，共 ${count} 天有书摘记录`
    });
  } catch (error) {
    console.error('重新计算热力图失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新单日热力图数据
 */
router.put('/:date', (req, res) => {
  try {
    const { readerId, bookmarkCount } = req.body;
    const date = req.params.date; // 格式: YYYY-MM-DD

    qcDataService.upsertReadingHeatmap(
      parseInt(readerId) || 0,
      date,
      parseInt(bookmarkCount)
    );

    res.json({
      success: true,
      message: `已更新 ${date} 的热力图数据`
    });
  } catch (error) {
    console.error('更新热力图数据失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
