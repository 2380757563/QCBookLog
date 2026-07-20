/**
 * useSyncStatus - 同步状态 Composable
 *
 * 负责同步状态（Calibre <-> Talebook）数据的获取与执行同步。
 */

import { ref } from 'vue';
import {
  fetchSyncStatus,
  executeCalibreToTalebook
} from '@/api/config/syncStatusService';

export function useSyncStatus() {
  // 总体同步状态
  const overallSyncStatus = ref<'synced' | 'syncing' | 'failed' | 'conflicted' | 'pending'>('synced');
  const overallSyncStatusText = ref('已同步');
  const lastSyncTime = ref('');
  const lastSyncResult = ref('');
  const syncMode = ref('双向同步');

  // Calibre → Talebook
  const calibreToTalebookStatus = ref('synced');
  const calibreToTalebookStatusText = ref('已同步');
  const calibreToTalebookProgress = ref(0);
  const calibreToTalebookSyncedBooks = ref(0);
  const calibreToTalebookTotalBooks = ref(0);
  const calibreToTalebookDuration = ref('00:00:00');

  // Talebook → Calibre
  const talebookToCalibreStatus = ref('synced');
  const talebookToCalibreStatusText = ref('已同步');
  const talebookToCalibreProgress = ref(0);
  const talebookToCalibreSyncedBooks = ref(0);
  const talebookToCalibreTotalBooks = ref(0);
  const talebookToCalibreDuration = ref('00:00:00');

  const syncing = ref(false);

  // 日志
  const syncLogs = ref<Array<{ time: string; message: string }>>([
    { time: new Date().toLocaleString(), message: '系统初始化，正在获取同步状态...' }
  ]);

  const syncStatusData = ref<any>(null);

  function pushLog(message: string) {
    syncLogs.value.unshift({ time: new Date().toLocaleString(), message });
    if (syncLogs.value.length > 20) {
      syncLogs.value = syncLogs.value.slice(0, 20);
    }
  }

  async function refreshSyncStatus() {
    try {
      const result = await fetchSyncStatus();
      if (result.success && result.data) {
        const syncData = result.data;
        syncStatusData.value = syncData;

        if (syncData.conflicted && syncData.conflicted > 0) {
          overallSyncStatus.value = 'conflicted';
          overallSyncStatusText.value = '存在冲突';
        } else if (
          (syncData.onlyInCalibre && syncData.onlyInCalibre.length > 0) ||
          (syncData.onlyInTalebook && syncData.onlyInTalebook.length > 0)
        ) {
          overallSyncStatus.value = 'pending';
          overallSyncStatusText.value = '需要同步';
        } else {
          overallSyncStatus.value = 'synced';
          overallSyncStatusText.value = '已同步';
        }

        lastSyncTime.value = new Date().toLocaleString();
        lastSyncResult.value = result.status === 'success' ? '成功' : '失败';

        calibreToTalebookSyncedBooks.value = syncData.calibre?.inBoth || 0;
        calibreToTalebookTotalBooks.value = syncData.calibre?.total || 0;
        calibreToTalebookProgress.value = syncData.calibre?.total
          ? Math.round((syncData.calibre.inBoth / syncData.calibre.total) * 100)
          : 100;

        talebookToCalibreSyncedBooks.value = syncData.talebook?.inBoth || 0;
        talebookToCalibreTotalBooks.value = syncData.talebook?.total || 0;
        talebookToCalibreProgress.value = syncData.talebook?.total
          ? Math.round((syncData.talebook.inBoth / syncData.talebook.total) * 100)
          : 100;

        pushLog(
          `同步状态更新: Calibre ${syncData.calibre?.total || 0} 本，Talebook ${syncData.talebook?.total || 0} 本，冲突 ${syncData.conflicted || 0} 本`
        );
      } else {
        pushLog(`获取同步状态失败: ${result.message || '未知错误'}`);
      }
    } catch (err) {
      console.error('获取同步状态失败:', err);
      pushLog(`获取同步状态失败: ${(err as Error).message}`);
    }
  }

  async function executeSync() {
    if (syncing.value) return;
    syncing.value = true;
    pushLog('开始执行同步...');
    try {
      const result = await executeCalibreToTalebook();
      if (result.status === 'success' || result.status === 'SUCCESS') {
        pushLog(`同步完成: ${result.message}`);
        lastSyncResult.value = '成功';
        lastSyncTime.value = new Date().toLocaleString();
      } else {
        pushLog(`同步失败: ${result.message}`);
        lastSyncResult.value = '失败';
      }
      await refreshSyncStatus();
    } catch (err) {
      console.error('执行同步失败:', err);
      pushLog(`同步失败: ${(err as Error).message}`);
      lastSyncResult.value = '失败';
    } finally {
      syncing.value = false;
    }
  }

  return {
    // state
    overallSyncStatus,
    overallSyncStatusText,
    lastSyncTime,
    lastSyncResult,
    syncMode,
    calibreToTalebookStatus,
    calibreToTalebookStatusText,
    calibreToTalebookProgress,
    calibreToTalebookSyncedBooks,
    calibreToTalebookTotalBooks,
    calibreToTalebookDuration,
    talebookToCalibreStatus,
    talebookToCalibreStatusText,
    talebookToCalibreProgress,
    talebookToCalibreSyncedBooks,
    talebookToCalibreTotalBooks,
    talebookToCalibreDuration,
    syncing,
    syncLogs,
    syncStatusData,
    // actions
    refreshSyncStatus,
    executeSync,
    pushLog
  };
}
