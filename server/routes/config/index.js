/**
 * 配置路由模块（重构版本）
 * 使用控制器模式，更清晰和可维护
 */

import express from 'express';
import configController from './controllers/config-controller.js';

const router = express.Router();

// Calibre 配置路由
router.get('/calibre-path', configController.getCalibrePath.bind(configController));
router.post('/calibre-path', configController.setCalibrePath.bind(configController));
router.post('/validate-calibre', configController.validateCalibre.bind(configController));

// Talebook 配置路由
router.get('/talebook-path', configController.getTalebookPath.bind(configController));
router.post('/talebook-path', configController.setTalebookPath.bind(configController));
router.post('/validate-talebook', configController.validateTalebook.bind(configController));

// 共同路由
router.get('/check-databases', configController.checkDatabases.bind(configController));
router.get('/system-status', configController.getSystemStatus.bind(configController));
router.get('/sync-status', configController.getSyncStatus.bind(configController));

export default router;
