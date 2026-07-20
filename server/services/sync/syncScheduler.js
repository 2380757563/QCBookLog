/**
 * 定时同步调度器
 * 定期执行阅读状态同步任务
 */

import readingStateSyncService from '../reading/readingStateSyncService.js';

/**
 * 同步调度器配置
 */
const SYNC_CONFIG = {
  // 同步间隔（毫秒）
  syncInterval: 5 * 60 * 1000, // 5分钟

  // 是否启用自动同步
  autoSyncEnabled: true,

  // 重试失败的同步的间隔（毫秒）
  retryInterval: 30 * 60 * 1000, // 30分钟

  // 清理旧同步错误的间隔（毫秒）
  cleanupInterval: 24 * 60 * 60 * 1000, // 24小时

  // 旧同步错误保留天数
  oldErrorDays: 30
};

/**
 * 同步调度器类
 */
class SyncScheduler {
  constructor() {
    this.syncTimer = null;
    this.retryTimer = null;
    this.cleanupTimer = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncCount = 0;
    this.errorCount = 0;
  }

  /**
   * 启动同步调度器
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ 同步调度器已经在运行');
      return;
    }

    this.isRunning = true;
    console.log('🚀 启动同步调度器...');

    // 立即执行一次同步
    this.runSync();

    // 设置定时同步
    this.syncTimer = setInterval(() => {
      this.runSync();
    }, SYNC_CONFIG.syncInterval);

    // 设置重试失败的同步
    this.retryTimer = setInterval(() => {
      this.runRetry();
    }, SYNC_CONFIG.retryInterval);

    // 设置清理旧同步错误
    this.cleanupTimer = setInterval(() => {
      this.runCleanup();
    }, SYNC_CONFIG.cleanupInterval);

    console.log(`✅ 同步调度器已启动`);
    console.log(`   - 定时同步间隔: ${SYNC_CONFIG.syncInterval / 1000 / 60} 分钟`);
    console.log(`   - 重试间隔: ${SYNC_CONFIG.retryInterval / 1000 / 60} 分钟`);
    console.log(`   - 清理间隔: ${SYNC_CONFIG.cleanupInterval / 1000 / 60 / 60} 小时`);
  }

  /**
   * 停止同步调度器
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ 同步调度器未在运行');
      return;
    }

    console.log('🛑 停止同步调度器...');

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.isRunning = false;
    console.log('✅ 同步调度器已停止');
  }

  /**
   * 执行同步任务
   */
  async runSync() {
    if (!SYNC_CONFIG.autoSyncEnabled) {
      console.log('ℹ️ 自动同步已禁用，跳过同步');
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 开始执行定时同步任务 - ${new Date().toLocaleString('zh-CN')}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // 批量同步所有阅读状态
      const result = await readingStateSyncService.syncAllReadingStates(0);

      if (result.success) {
        this.syncCount++;
        this.lastSyncTime = new Date();
        console.log(`✅ 定时同步任务完成`);
        console.log(`   - 成功: ${result.successCount} 条`);
        console.log(`   - 失败: ${result.failCount} 条`);
      } else {
        this.errorCount++;
        console.error(`❌ 定时同步任务失败: ${result.message}`);
      }

      // 显示同步统计
      const stats = readingStateSyncService.getSyncStats();
      if (stats) {
        console.log(`\n📊 同步统计:`);
        console.log(`   - 总记录数: ${stats.total}`);
        console.log(`   - 已同步: ${stats.synced}`);
        console.log(`   - 未同步: ${stats.notSynced}`);
        console.log(`   - 同步中: ${stats.syncing}`);
        console.log(`   - 同步失败: ${stats.failed}`);
      }
    } catch (error) {
      this.errorCount++;
      console.error(`❌ 定时同步任务执行失败:`, error.message);
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 重试失败的同步
   */
  async runRetry() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 开始重试失败的同步 - ${new Date().toLocaleString('zh-CN')}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const result = await readingStateSyncService.retryFailedSyncs(10);

      if (result.success) {
        console.log(`✅ 重试完成`);
        console.log(`   - 成功: ${result.successCount} 条`);
        console.log(`   - 失败: ${result.failCount} 条`);
      } else {
        console.error(`❌ 重试失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ 重试任务执行失败:`, error.message);
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 清理旧的同步错误
   */
  runCleanup() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧹 开始清理旧的同步错误 - ${new Date().toLocaleString('zh-CN')}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const count = readingStateSyncService.cleanupOldSyncErrors(SYNC_CONFIG.oldErrorDays);
      console.log(`✅ 清理完成，删除了 ${count} 条旧记录`);
    } catch (error) {
      console.error(`❌ 清理任务执行失败:`, error.message);
    }

    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 手动触发同步
   */
  async triggerSync() {
    console.log(`🎯 手动触发同步 - ${new Date().toLocaleString('zh-CN')}`);
    await this.runSync();
  }

  /**
   * 手动触发重试
   */
  async triggerRetry() {
    console.log(`🎯 手动触发重试 - ${new Date().toLocaleString('zh-CN')}`);
    await this.runRetry();
  }

  /**
   * 手动触发清理
   */
  triggerCleanup() {
    console.log(`🎯 手动触发清理 - ${new Date().toLocaleString('zh-CN')}`);
    this.runCleanup();
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncCount: this.syncCount,
      errorCount: this.errorCount,
      config: SYNC_CONFIG
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    Object.assign(SYNC_CONFIG, newConfig);

    // 如果正在运行，需要重启定时器
    if (this.isRunning) {
      this.stop();
      this.start();
    }

    console.log('✅ 同步调度器配置已更新');
  }
}

export default new SyncScheduler();