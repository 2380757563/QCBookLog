import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { gitSyncService, GitSyncStatus, PendingReview, UnpushedInfo, GitPullResult, GitHistoryDeleteResult } from '@/api/gitSync';

export const useGitSyncStore = defineStore('gitSync', () => {
  const status = ref<GitSyncStatus | null>(null);
  const loading = ref(false);
  const syncing = ref(false);
  const pulling = ref(false);
  const error = ref<string | null>(null);
  const pendingReviews = ref<PendingReview[]>([]);
  const unpushedInfo = ref<UnpushedInfo | null>(null);

  const configured = computed(() => !!status.value?.configured);
  const ready = computed(() => !!status.value?.ready);

  async function fetchStatus() {
    loading.value = true;
    error.value = null;
    try {
      status.value = await gitSyncService.getStatus();
    } catch (err: any) {
      error.value = err?.message || '获取同步状态失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function configure(config: any) {
    loading.value = true;
    error.value = null;
    try {
      status.value = await gitSyncService.configure(config);
    } catch (err: any) {
      error.value = err?.message || '配置失败';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPending() {
    error.value = null;
    try {
      const result = await gitSyncService.getPending();
      pendingReviews.value = result.reviews || [];
      unpushedInfo.value = result.unpushed || null;
      return result;
    } catch (err: any) {
      error.value = err?.message || '获取待推送列表失败';
      throw err;
    }
  }

  async function syncAll() {
    syncing.value = true;
    error.value = null;
    try {
      const result = await gitSyncService.syncAll();
      await fetchStatus();
      await fetchPending().catch(() => {});
      return result;
    } catch (err: any) {
      error.value = err?.message || '同步失败';
      throw err;
    } finally {
      syncing.value = false;
    }
  }

  async function syncReview(id: number | string) {
    syncing.value = true;
    error.value = null;
    try {
      const result = await gitSyncService.syncReview(id);
      await fetchStatus();
      return result;
    } catch (err: any) {
      error.value = err?.message || '同步失败';
      throw err;
    } finally {
      syncing.value = false;
    }
  }

  async function pull(force = false): Promise<GitPullResult> {
    pulling.value = true;
    error.value = null;
    try {
      const result = await gitSyncService.pull(force);
      await fetchStatus();
      await fetchPending().catch(() => {});
      return result;
    } catch (err: any) {
      error.value = err?.message || '拉取失败';
      throw err;
    } finally {
      pulling.value = false;
    }
  }

  async function deleteHistory(reviewId: number | string, commitHash: string): Promise<GitHistoryDeleteResult> {
    syncing.value = true;
    error.value = null;
    try {
      const result = await gitSyncService.deleteHistory(reviewId, commitHash);
      await fetchStatus();
      return result;
    } catch (err: any) {
      error.value = err?.message || '删除历史失败';
      throw err;
    } finally {
      syncing.value = false;
    }
  }

  async function clearHistory(reviewId: number | string): Promise<GitHistoryDeleteResult> {
    syncing.value = true;
    error.value = null;
    try {
      const result = await gitSyncService.clearHistory(reviewId);
      await fetchStatus();
      return result;
    } catch (err: any) {
      error.value = err?.message || '清空历史失败';
      throw err;
    } finally {
      syncing.value = false;
    }
  }

  return {
    status,
    loading,
    syncing,
    pulling,
    error,
    pendingReviews,
    unpushedInfo,
    configured,
    ready,
    fetchStatus,
    fetchPending,
    configure,
    syncAll,
    syncReview,
    pull,
    deleteHistory,
    clearHistory,
  };
});

export default useGitSyncStore;
