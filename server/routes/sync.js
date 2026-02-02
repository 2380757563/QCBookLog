/**
 * 数据同步路由
 * 处理文件系统和数据库之间的同步请求
 */

import express from 'express';
import syncService from '../services/syncService.js';

const router = express.Router();

/**
 * 获取同步状态
 */
router.get('/status', async (req, res) => {
  try {
    console.log('\n📊 获取同步状态...');
    const status = await syncService.getSyncStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ 获取同步状态失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 从数据库同步到文件系统
 */
router.post('/db-to-fs', async (req, res) => {
  try {
    console.log('\n🔄 从数据库同步到文件系统...');
    const result = await syncService.syncDBToFileSystem();
    res.json(result);
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 从文件系统同步到数据库
 */
router.post('/fs-to-db', async (req, res) => {
  try {
    console.log('\n🔄 从文件系统同步到数据库...');
    const result = await syncService.syncFileSystemToDB();
    res.json(result);
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 双向同步
 */
router.post('/both', async (req, res) => {
  try {
    console.log('\n🔄 双向同步...');
    const result = await syncService.syncBothWays();
    res.json(result);
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 从Calibre数据库同步到Talebook数据库
 */
router.post('/calibre-to-talebook', async (req, res) => {
  try {
    console.log('\n🔄 从Calibre数据库同步到Talebook数据库...');
    const result = await syncService.syncCalibreToTalebook();
    res.json(result);
  } catch (error) {
    console.error('❌ 同步失败:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
