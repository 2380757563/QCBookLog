/**
 * 阅读目标路由模块
 * 处理阅读目标相关的API请求
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取指定年份的阅读目标
 */
router.get('/:year', (req, res) => {
  try {
    const { readerId } = req.query;
    const year = parseInt(req.params.year);

    const goal = qcDataService.getOrCreateReadingGoal(
      parseInt(readerId) || 0,
      year
    );

    res.json(goal);
  } catch (error) {
    console.error('获取阅读目标失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新阅读目标
 */
router.put('/:id', (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const { target, completed } = req.body;

    const updatedGoal = qcDataService.updateReadingGoal(goalId, {
      target: parseInt(target),
      completed: parseInt(completed)
    });

    if (!updatedGoal) {
      return res.status(404).json({ error: '阅读目标不存在' });
    }

    res.json(updatedGoal);
  } catch (error) {
    console.error('更新阅读目标失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 增加已完成数量
 */
router.post('/:id/increment', (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const success = qcDataService.incrementReadingGoalCompleted(goalId);

    if (!success) {
      return res.status(404).json({ error: '阅读目标不存在' });
    }

    res.json({ success: true, message: '已完成数量已增加' });
  } catch (error) {
    console.error('增加已完成数量失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
