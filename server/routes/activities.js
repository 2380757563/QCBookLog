/**
 * 操作记录路由模块
 * 处理操作记录相关的API请求
 */

import express from 'express';
import activityService from '../services/activityService.js';

const router = express.Router();

/**
 * 获取操作记录列表
 */
router.get('/', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      bookId,
      limit
    } = req.query;

    const readerId = parseInt(req.query.readerId) || 1;

    const filters = {
      readerId,
      startDate,
      endDate,
      type,
      bookId,
      limit: limit ? parseInt(limit) : 100
    };

    const activities = await activityService.getActivities(filters);
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ 获取操作记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取操作记录失败'
    });
  }
});

/**
 * 获取某日的操作记录
 */
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const readerId = parseInt(req.query.readerId) || 1;
    const activities = await activityService.getActivitiesByDate(date, readerId);
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ 获取操作记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取操作记录失败'
    });
  }
});

// 注意：不再提供创建操作记录的 POST 接口
// 操作记录应该由业务服务自动创建（书摘、阅读状态、阅读记录、阅读目标等）
// 前端通过查询接口获取聚合的操作记录数据

export default router;
