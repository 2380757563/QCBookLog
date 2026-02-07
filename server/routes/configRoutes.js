/**
 * 配置路由 - 用于配置 Calibre 和 Talebook 书库路径
 */

import express from 'express';
import databaseService, { initPromise } from '../services/database/index.js';
import calibreService from '../services/calibreService.js';
import syncService from '../services/syncService.js';
import ConfigController from './config/controllers/config-controller.js';

const router = express.Router();
const configController = new ConfigController();

// 中间件：确保数据库服务已初始化
router.use(async (req, res, next) => {
  try {
    await initPromise;
    next();
  } catch (error) {
    console.error('❌ 等待数据库服务初始化失败:', error);
    // 继续执行，让具体的路由处理未初始化的情况
    next();
  }
});

/**
 * 获取 Calibre 数据库路径配置
 */
router.get('/calibre-path', (req, res) => {
  configController.getCalibrePath(req, res);
});

/**
 * 设置 Calibre 数据库路径
 */
router.post('/calibre-path', (req, res) => {
  configController.setCalibrePath(req, res);
});

/**
 * 验证 Calibre 数据库
 */
router.post('/validate-calibre', (req, res) => {
  configController.validateCalibre(req, res);
});

/**
 * 检测所有数据库状态
 */
router.get('/check-databases', (req, res) => {
  configController.checkDatabases(req, res);
});

/**
 * 创建新数据库
 */
router.post('/create-database', (req, res) => {
  configController.createDatabase(req, res);
});

/**
 * 获取 Talebook 数据库路径配置
 */
router.get('/talebook-path', (req, res) => {
  configController.getTalebookPath(req, res);
});

/**
 * 设置 Talebook 数据库路径
 */
router.post('/talebook-path', (req, res) => {
  configController.setTalebookPath(req, res);
});

/**
 * 验证 Talebook 数据库
 */
router.post('/validate-talebook', (req, res) => {
  configController.validateTalebook(req, res);
});

/**
 * 设置默认数据库
 */
router.post('/set-default', (req, res) => {
  configController.setDefault(req, res);
});

/**
 * 获取同步状态
 */
router.get('/sync-status', (req, res) => {
  configController.getSyncStatus(req, res);
});

export default router;