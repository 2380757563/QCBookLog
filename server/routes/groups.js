/**
 * 分组路由模块
 * 处理分组相关的API请求
 */

import express from 'express';
import qcDataService from '../services/qcDataService.js';

const router = express.Router();

/**
 * 获取所有分组
 */
router.get('/', (req, res) => {
  try {
    const groups = qcDataService.getAllGroups();
    res.json(groups);
  } catch (error) {
    console.error('获取分组失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 根据ID获取分组
 */
router.get('/:id', (req, res) => {
  try {
    const group = qcDataService.getGroupById(parseInt(req.params.id));
    if (!group) {
      return res.status(404).json({ error: '分组不存在' });
    }
    res.json(group);
  } catch (error) {
    console.error('获取分组失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建分组
 */
router.post('/', (req, res) => {
  try {
    const newGroup = qcDataService.createGroup(req.body);
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('创建分组失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新分组
 */
router.put('/:id', (req, res) => {
  try {
    const updatedGroup = qcDataService.updateGroup(parseInt(req.params.id), req.body);
    if (!updatedGroup) {
      return res.status(404).json({ error: '分组不存在' });
    }
    res.json(updatedGroup);
  } catch (error) {
    console.error('更新分组失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除分组
 */
router.delete('/:id', (req, res) => {
  try {
    const success = qcDataService.deleteGroup(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: '分组不存在' });
    }
    res.json({ message: '分组删除成功' });
  } catch (error) {
    console.error('删除分组失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 更新分组排序
 */
router.put('/sort', (req, res) => {
  try {
    // 数据库分组不支持排序，直接返回空数组
    res.json([]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 导入分组数据
 */
router.post('/import', (req, res) => {
  try {
    // 数据库分组不支持导入，直接返回成功
    res.json({ message: '导入成功，共0个分组' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * 导出分组数据
 */
router.get('/export', (req, res) => {
  try {
    const groups = qcDataService.getAllGroups();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="groups_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;