/**
 * 阅读状态同步 API 路由
 */

import express from 'express';
import readingStateSyncService from '../services/readingStateSyncService.js';
import syncScheduler from '../services/syncScheduler.js';

const router = express.Router();

/**
 * 获取同步状态
 */
router.get('/status', (req, res) => {
  try {
    const stats = readingStateSyncService.getSyncStats();
    const schedulerStatus = syncScheduler.getStatus();

    res.json({
      success: true,
      data: {
        syncStats: stats,
        scheduler: schedulerStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 同步单个书籍的阅读状态
 */
router.post('/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { readerId = 0, direction = 'toTalebook' } = req.body;

    let result;
    if (direction === 'toTalebook') {
      result = await readingStateSyncService.syncToTalebook(parseInt(bookId), parseInt(readerId));
    } else if (direction === 'toQcBooklog') {
      result = await readingStateSyncService.syncToQcBooklog(parseInt(bookId), parseInt(readerId));
    } else {
      result = await readingStateSyncService.syncReadingState(parseInt(bookId), parseInt(readerId));
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 批量同步所有阅读状态
 */
router.post('/all', async (req, res) => {
  try {
    const { readerId = 0 } = req.body;
    const result = await readingStateSyncService.syncAllReadingStates(parseInt(readerId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 同步缺失的阅读状态到 Talebook
 * 只同步 QCBookLog 有但 Talebook 没有的记录
 */
router.post('/missing', async (req, res) => {
  try {
    const { readerId = 0 } = req.body;
    const result = await readingStateSyncService.syncMissingToTalebook(parseInt(readerId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取同步失败的记录
 */
router.get('/failed', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const failedSyncs = readingStateSyncService.getFailedSyncs(parseInt(limit));

    res.json({
      success: true,
      data: failedSyncs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 重试失败的同步
 */
router.post('/retry', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const result = await readingStateSyncService.retryFailedSyncs(parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 清理旧的同步错误
 */
router.post('/cleanup', (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const count = readingStateSyncService.cleanupOldSyncErrors(parseInt(daysOld));

    res.json({
      success: true,
      data: {
        deletedCount: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 手动触发同步
 */
router.post('/trigger', async (req, res) => {
  try {
    await syncScheduler.triggerSync();

    res.json({
      success: true,
      message: '同步任务已触发'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 手动触发重试
 */
router.post('/retry-all', async (req, res) => {
  try {
    await syncScheduler.triggerRetry();

    res.json({
      success: true,
      message: '重试任务已触发'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 手动触发清理
 */
router.post('/cleanup-all', (req, res) => {
  try {
    syncScheduler.triggerCleanup();

    res.json({
      success: true,
      message: '清理任务已触发'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新同步调度器配置
 */
router.put('/config', (req, res) => {
  try {
    const { syncInterval, autoSyncEnabled, retryInterval, cleanupInterval, oldErrorDays } = req.body;

    const newConfig = {};
    if (syncInterval !== undefined) newConfig.syncInterval = syncInterval;
    if (autoSyncEnabled !== undefined) newConfig.autoSyncEnabled = autoSyncEnabled;
    if (retryInterval !== undefined) newConfig.retryInterval = retryInterval;
    if (cleanupInterval !== undefined) newConfig.cleanupInterval = cleanupInterval;
    if (oldErrorDays !== undefined) newConfig.oldErrorDays = oldErrorDays;

    syncScheduler.updateConfig(newConfig);

    res.json({
      success: true,
      message: '同步调度器配置已更新',
      data: syncScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取同步调度器配置
 */
router.get('/config', (req, res) => {
  try {
    const status = syncScheduler.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 启动同步调度器
 */
router.post('/scheduler/start', (req, res) => {
  try {
    syncScheduler.start();

    res.json({
      success: true,
      message: '同步调度器已启动',
      data: syncScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 停止同步调度器
 */
router.post('/scheduler/stop', (req, res) => {
  try {
    syncScheduler.stop();

    res.json({
      success: true,
      message: '同步调度器已停止',
      data: syncScheduler.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;