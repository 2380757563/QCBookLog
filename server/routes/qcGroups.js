/**
 * 分组管理路由
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
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建分组
 */
router.post('/', (req, res) => {
  try {
    const group = qcDataService.createGroup(req.body);
    res.status(201).json({
      success: true,
      data: group,
      message: '分组创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取指定分组
 */
router.get('/:id', (req, res) => {
  try {
    const group = qcDataService.getGroupById(parseInt(req.params.id));
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }
    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新分组
 */
router.put('/:id', (req, res) => {
  try {
    const group = qcDataService.updateGroup(parseInt(req.params.id), req.body);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }
    res.json({
      success: true,
      data: group,
      message: '分组更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除分组
 */
router.delete('/:id', (req, res) => {
  try {
    const success = qcDataService.deleteGroup(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }
    res.json({
      success: true,
      message: '分组删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取分组中的书籍
 */
router.get('/:id/books', (req, res) => {
  try {
    const bookIds = qcDataService.getGroupBooks(parseInt(req.params.id));
    res.json({
      success: true,
      data: bookIds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 添加书籍到分组
 */
router.post('/:groupId/books/:bookId', (req, res) => {
  try {
    const success = qcDataService.addBookToGroup(
      parseInt(req.params.bookId),
      parseInt(req.params.groupId)
    );
    res.json({
      success: true,
      message: success ? '书籍添加到分组成功' : '书籍已在分组中'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 从分组中移除书籍
 */
router.delete('/:groupId/books/:bookId', (req, res) => {
  try {
    const success = qcDataService.removeBookFromGroup(
      parseInt(req.params.bookId),
      parseInt(req.params.groupId)
    );
    res.json({
      success: true,
      message: success ? '书籍从分组中移除成功' : '书籍不在分组中'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取书籍的所有分组
 */
router.get('/books/:bookId', (req, res) => {
  try {
    const groups = qcDataService.getBookGroups(parseInt(req.params.bookId));
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;