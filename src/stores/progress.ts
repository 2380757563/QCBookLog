import { defineStore } from 'pinia';

interface ProgressState {
  // 单本书进度：bookId -> 进度百分比
  currentBookProgress: Map<string, number>;
  // 批量操作进度
  batchProgress: {
    completed: number;
    total: number;
    active: boolean;
  };
  // 状态消息：bookId -> 消息
  statusMessages: Map<string, string>;
}

/**
 * 进度管理Store
 * 用于跟踪书籍添加、封面下载等操作的进度
 */
export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => ({
    currentBookProgress: new Map<string, number>(),
    batchProgress: {
      completed: 0,
      total: 0,
      active: false
    },
    statusMessages: new Map<string, string>()
  }),

  getters: {
    /**
     * 获取单本书的进度
     */
    getBookProgress: (state) => (bookId: string): number => {
      return state.currentBookProgress.get(bookId) || 0;
    },

    /**
     * 获取单本书的状态消息
     */
    getBookStatus: (state) => (bookId: string): string => {
      return state.statusMessages.get(bookId) || '';
    },

    /**
     * 获取批量进度百分比
     */
    getBatchProgressPercentage: (state): number => {
      if (state.batchProgress.total === 0) return 0;
      return Math.round((state.batchProgress.completed / state.batchProgress.total) * 100);
    }
  },

  actions: {
    /**
     * 初始化单本书进度
     * @param bookId 书籍ID
     */
    initBookProgress(bookId: string) {
      this.currentBookProgress.set(bookId, 0);
      this.statusMessages.set(bookId, '开始处理...');
    },

    /**
     * 更新单本书进度
     * @param bookId 书籍ID
     * @param progress 进度百分比 (0-100)
     * @param message 状态消息
     */
    updateBookProgress(bookId: string, progress: number, message?: string) {
      // 确保进度在0-100之间
      const clampedProgress = Math.max(0, Math.min(100, progress));
      this.currentBookProgress.set(bookId, clampedProgress);
      
      if (message) {
        this.statusMessages.set(bookId, message);
      }
    },

    /**
     * 完成单本书进度
     * @param bookId 书籍ID
     * @param message 完成消息
     */
    completeBookProgress(bookId: string, message: string = '处理完成') {
      this.currentBookProgress.set(bookId, 100);
      this.statusMessages.set(bookId, message);
      
      // 自动更新批量进度
      if (this.batchProgress.active) {
        this.batchProgress.completed++;
        
        // 如果所有书籍都完成，重置批量进度
        if (this.batchProgress.completed >= this.batchProgress.total) {
          // 延迟重置，让用户看到完成状态
          setTimeout(() => {
            this.resetBatchProgress();
          }, 1000);
        }
      }
    },

    /**
     * 清除单本书进度
     * @param bookId 书籍ID
     */
    clearBookProgress(bookId: string) {
      this.currentBookProgress.delete(bookId);
      this.statusMessages.delete(bookId);
    },

    /**
     * 开始批量操作
     * @param total 总书籍数量
     */
    startBatch(total: number) {
      this.batchProgress = {
        completed: 0,
        total,
        active: true
      };
    },

    /**
     * 重置批量进度
     */
    resetBatchProgress() {
      this.batchProgress = {
        completed: 0,
        total: 0,
        active: false
      };
    },

    /**
     * 重置所有进度
     */
    resetAllProgress() {
      this.currentBookProgress.clear();
      this.statusMessages.clear();
      this.resetBatchProgress();
    }
  }
});
