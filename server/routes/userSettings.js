import express from 'express';
import userSettingsService from '../services/userSettingsService.js';
import userImagesService from '../services/userImagesService.js';

const router = express.Router();

/**
 * 获取用户设置
 * GET /api/user-settings
 * Query: userId, priority
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;
    const priority = req.query.priority || null;

    const settings = await userSettingsService.getSettings(userId, priority);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ 获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个用户设置
 * GET /api/user-settings/:key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;

    const value = await userSettingsService.getSetting(userId, key);

    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('❌ 获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 保存单个用户设置
 * POST /api/user-settings/:key
 * Body: { value, priority, type }
 */
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, priority, type } = req.body;
    const userId = req.body.userId || 0;

    await userSettingsService.saveSetting(userId, key, value, priority, type);

    res.json({
      success: true,
      message: '设置保存成功'
    });
  } catch (error) {
    console.error('❌ 保存用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量保存用户设置
 * POST /api/user-settings
 * Body: { settings, priority }
 */
router.post('/', async (req, res) => {
  try {
    const { settings, priority } = req.body;
    const userId = req.body.userId || 0;

    await userSettingsService.saveSettings(userId, settings, priority);

    res.json({
      success: true,
      message: '设置保存成功'
    });
  } catch (error) {
    console.error('❌ 批量保存用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除单个用户设置
 * DELETE /api/user-settings/:key
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;

    await userSettingsService.deleteSetting(userId, key);

    res.json({
      success: true,
      message: '设置删除成功'
    });
  } catch (error) {
    console.error('❌ 删除用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量删除用户设置
 * DELETE /api/user-settings
 * Query: priority
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;
    const priority = req.query.priority || null;

    await userSettingsService.deleteSettings(userId, priority);

    res.json({
      success: true,
      message: '设置删除成功'
    });
  } catch (error) {
    console.error('❌ 批量删除用户设置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
