/**
 * 阅读状态管理 Store
 * 管理阅读计时器状态、当前阅读书籍等
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ReadingTimerState } from '@/services/readingTracking/types';
import readingTrackingService from '@/services/readingTracking';
import { useBookStore } from '@/store/book';
import userSettingsService from '@/services/userSettings';

export const useReadingStore = defineStore('reading', () => {
  // ==================== 状态 ====================

  /**
   * 阅读计时器状态
   *
   * 关键设计：
   *  - elapsedSeconds 改用 wall-clock 锚点（startTimeStamp + 累计活动秒数），
   *    即使页面休眠导致 setInterval 暂停，也能在任意时刻通过本地时间回算真实耗时
   *  - accumulatedSeconds 记录"非暂停"段累计秒数，配合 lastResumeTime 做"开始时间戳+累计"
   *  - pauseStartedAt 记录暂停开始时刻，用于 resume 时正确累加暂停时长
   *  - 防止重复结束：endReading 内部用 isEnding 锁；调用方也加幂等
   */
  const timerState = ref<ReadingTimerState & {
    /** 本地时间戳（毫秒）：开始/继续阅读的真实时刻 */
    lastResumeAt?: number | null;
    /** 暂停开始时间戳（毫秒） */
    pauseStartedAt?: number | null;
    /** 暂停期间的总毫秒数（多次暂停累加） */
    totalPausedMs?: number;
    /** 累计非暂停秒数（最近一次同步的快照） */
    accumulatedSeconds?: number;
  }>({
    isReading: false,
    isPaused: false,
    startTime: null,
    pausedTime: null,
    currentBookId: null,
    currentBookTitle: '',
    elapsedSeconds: 0,
    startPage: 0,
    currentPage: 0,
    lastResumeAt: null,
    pauseStartedAt: null,
    totalPausedMs: 0,
    accumulatedSeconds: 0
  });

  /**
   * 计时器定时器ID
   */
  let timerInterval: number | null = null;

  /**
   * endReading 幂等锁：避免重复触发（如 onUnmounted + 用户点击同时触发）
   * 同一时刻只有一份 endReading 在执行
   */
  let endingPromise: Promise<any> | null = null;

  /**
   * 阅读进度显示模式
   * 'label': 显示标签 (在读/已读/未读)
   * 'progress': 显示进度条
   */
  const progressDisplayMode = ref<'label' | 'progress'>('label');

  /**
   * 当前读者ID
   */
  const currentReaderId = ref<number>(1);

  /**
   * 是否在阅读界面中
   * 用于控制悬浮窗的显示/隐藏
   */
  const isInReadingPage = ref<boolean>(false);

  // ==================== 初始化 ====================

  /**
   * 加载当前读者ID
   */
  const loadReaderId = async () => {
    try {
      const settings = await userSettingsService.getSettings('high');
      if (settings && settings.currentReaderId !== undefined) {
        currentReaderId.value = Number(settings.currentReaderId);
        localStorage.setItem('currentReaderId', String(settings.currentReaderId));
        return;
      }
    } catch (error) {
      console.error('从数据库加载读者ID失败:', error);
    }
    
    const saved = localStorage.getItem('currentReaderId');
    if (saved) {
      currentReaderId.value = Number(saved);
    }
  };

  // 初始化时加载读者ID
  loadReaderId();

  // ==================== 计算属性 ====================

  /**
   * 已读时长(格式化 HH:MM:SS)
   */
  const formattedElapsedTime = computed(() => {
    const totalSeconds = timerState.value.elapsedSeconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  });

  /**
   * 已读时长(分钟)
   */
  const elapsedMinutes = computed(() => {
    return Math.floor(timerState.value.elapsedSeconds / 60);
  });

  /**
   * 阅读进度百分比
   * @param totalPages - 书籍总页数
   */
  const progressPercent = (totalPages: number): number => {
    if (totalPages === 0) return 0;
    return Math.round((timerState.value.currentPage / totalPages) * 100);
  };

  /**
   * 是否正在阅读
   */
  const isReading = computed(() => timerState.value.isReading);

  /**
   * 是否暂停
   */
  const isPaused = computed(() => timerState.value.isPaused);

  /**
   * 切换暂停/继续
   */
  const togglePause = () => {
    if (timerState.value.isPaused) {
      resumeReading();
    } else {
      pauseReading();
    }
  };

  /**
   * 当前阅读的书籍
   */
  const currentBook = computed(() => {
    const bookStore = useBookStore();
    if (timerState.value.currentBookId) {
      return bookStore.getBookById(timerState.value.currentBookId);
    }
    return null;
  });

  /**
   * 当前阅读进度（页码）
   */
  const currentProgress = computed(() => timerState.value.currentPage);

  /**
   * 开始页码
   */
  const startPage = computed(() => timerState.value.startPage);

  /**
   * 已读时长（秒）
   */
  const elapsedSeconds = computed(() => timerState.value.elapsedSeconds);

  // ==================== Actions ====================

  /**
   * 开始阅读
   * @param bookId - 书籍ID
   * @param bookTitle - 书籍名称
   * @param startPage - 开始页码
   */
  const startReading = (bookId: number, bookTitle: string, startPage = 0) => {
    const now = new Date();
    timerState.value = {
      isReading: true,
      isPaused: false,
      startTime: now,
      pausedTime: null,
      currentBookId: bookId,
      currentBookTitle: bookTitle,
      elapsedSeconds: 0,
      startPage,
      currentPage: startPage,
      lastResumeAt: Date.now(),
      pauseStartedAt: null,
      totalPausedMs: 0,
      accumulatedSeconds: 0
    };

    // 启动定时器
    startTimer();
  };

  /**
   * 暂停阅读
   */
  const pauseReading = () => {
    if (!timerState.value.isReading || timerState.value.isPaused) {
      return;
    }

    // 在暂停前先基于本地时间同步一次已读时长（避免错过最后一秒）
    syncElapsedFromWallClock();

    timerState.value.isPaused = true;
    timerState.value.pausedTime = new Date();
    timerState.value.pauseStartedAt = Date.now();

    // 停止定时器
    stopTimer();
  };

  /**
   * 继续阅读
   */
  const resumeReading = () => {
    if (!timerState.value.isReading || !timerState.value.isPaused) {
      return;
    }

    // 累计本次暂停时长
    if (timerState.value.pauseStartedAt) {
      const pausedMs = Date.now() - timerState.value.pauseStartedAt;
      timerState.value.totalPausedMs = (timerState.value.totalPausedMs || 0) + pausedMs;
    }

    timerState.value.isPaused = false;
    timerState.value.pausedTime = null;
    timerState.value.pauseStartedAt = null;
    // 重新设置 resume 锚点，从此开始累积新的非暂停时长
    timerState.value.lastResumeAt = Date.now();

    // 重新启动定时器
    startTimer();
  };

  /**
   * 结束阅读
   * 关键修复：
   *  1. 终态秒数改用 wall-clock 计算，避免页面休眠导致秒数偏低
   *  2. 通过 isEnding 锁防止重复结束（如 onUnmounted + 用户点击同时触发）
   *  3. 即使 startTime 早于 lastResumeAt，也以 lastResumeAt 之后的实际秒数为准
   */
  const endReading = async (overrideData?: { startPage?: number; endPage?: number; }) => {
    if (!timerState.value.isReading) {
      return null;
    }
    // 幂等保护：避免重复触发 endReading
    if (endingPromise) {
      return endingPromise;
    }

    // 终止前最后一次基于本地时间精确计算总秒数
    syncElapsedFromWallClock();
    const finalElapsed = computeElapsedSeconds();

    stopTimer();

    // 如果提供了覆盖数据，更新当前页码
    if (overrideData) {
      if (overrideData.startPage !== undefined) {
        timerState.value.startPage = overrideData.startPage;
      }
      if (overrideData.endPage !== undefined) {
        timerState.value.currentPage = overrideData.endPage;
      }
    }

    const { currentBookId, currentBookTitle, startPage, currentPage } = timerState.value;
    const endTime = new Date();
    // 修复：使用四舍五入而不是向下取整，避免长会话末尾的秒数被截断导致时间累计偏少
    // 同时保留最小 1 分钟的逻辑（阅读秒数 > 0 时至少记为 1 分钟），避免出现 0 分钟记录
    const duration = finalElapsed > 0 ? Math.max(1, Math.round(finalElapsed / 60)) : 0;
    const pagesRead = currentPage - startPage;

    // 调用后端API保存阅读记录
    const persistPromise = (async () => {
      if (!currentBookId) {
        return null;
      }
      try {
        const startTime = timerState.value.startTime ? timerState.value.startTime.toISOString() : new Date().toISOString();
        const readerId = currentReaderId.value;

        if (currentBookId == null) throw new Error('缺少必要参数: bookId');
        if (readerId == null) throw new Error('缺少必要参数: readerId');
        if (!startTime) throw new Error('缺少必要参数: startTime');
        if (!endTime) throw new Error('缺少必要参数: endTime');
        if (duration == null || duration < 0) throw new Error('缺少必要参数: duration (必须 >= 0)');

        await readingTrackingService.createReadingRecord({
          bookId: currentBookId,
          readerId,
          startTime,
          endTime: endTime.toISOString(),
          duration,
          startPage,
          endPage: currentPage,
          pagesRead
        });

        // 阅读记录保存成功后，立即拉取该书最新统计并同步到 bookStore
        try {
          const bookStore = useBookStore();
          const stats = await readingTrackingService.getBookReadingStats(currentBookId);
          if (stats) {
            const existing = bookStore.getBookById?.(currentBookId) as any
              || bookStore.allBooks.find((b: any) => b.id === currentBookId);
            if (existing) {
              existing.total_reading_time = stats.totalReadingTime;
              existing.reading_count = stats.readingCount;
              existing.last_read_date = stats.lastReadDate;
              existing.last_read_duration = stats.lastReadDuration;
              existing.read_pages = stats.readPages;
            }
          }
        } catch (e) {
          // 静默失败：不影响阅读主流程
          console.warn('同步书籍阅读统计失败（不影响本次阅读）:', e);
        }
      } catch (error) {
        console.error('❌ 保存阅读记录失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message);
          console.error('错误堆栈:', error.stack);
        }
        throw error;
      }

      return {
        bookId: currentBookId,
        bookTitle: currentBookTitle,
        startTime: timerState.value.startTime ? timerState.value.startTime.toISOString() : null,
        endTime: endTime.toISOString(),
        duration,
        startPage,
        endPage: currentPage,
        pagesRead
      };
    })();

    endingPromise = persistPromise.finally(() => {
      // 不论成功失败，finally 后重置状态
      timerState.value = {
        isReading: false,
        isPaused: false,
        startTime: null,
        pausedTime: null,
        currentBookId: null,
        currentBookTitle: '',
        elapsedSeconds: 0,
        startPage: 0,
        currentPage: 0,
        lastResumeAt: null,
        pauseStartedAt: null,
        totalPausedMs: 0,
        accumulatedSeconds: 0
      };
      endingPromise = null;
    });

    return endingPromise;
  };

  /**
   * 更新当前页码
   * @param page - 新的页码
   */
  const updateCurrentPage = (page: number) => {
    timerState.value.currentPage = page;
  };

  /**
   * 设置进度显示模式
   * @param mode - 显示模式
   */
  const setProgressDisplayMode = (mode: 'label' | 'progress') => {
    progressDisplayMode.value = mode;
    localStorage.setItem('progressDisplayMode', mode);
  };

  /**
   * 加载进度显示模式
   */
  const loadProgressDisplayMode = () => {
    const saved = localStorage.getItem('progressDisplayMode');
    if (saved === 'label' || saved === 'progress') {
      progressDisplayMode.value = saved;
    }
  };

  /**
   * 设置当前读者ID
   * @param readerId - 读者ID
   */
  const setReaderId = async (readerId: number) => {
    currentReaderId.value = readerId;
    localStorage.setItem('currentReaderId', String(readerId));
    
    try {
      await userSettingsService.saveSetting('currentReaderId', readerId, 'high');
    } catch (error) {
      console.error('保存读者ID到数据库失败:', error);
    }
  };

  // ==================== 私有方法 ====================

  /**
   * 基于本地时间戳精确计算当前累计阅读秒数。
   * 即使 setInterval 因页面休眠未触发，也能在任意时刻返回正确的秒数。
   *
   * 公式：elapsed = (now - lastResumeAt) / 1000 + accumulatedSeconds
   * 其中 lastResumeAt 是最近一次"开始/继续阅读"的真实时刻（毫秒），
   * accumulatedSeconds 是该时刻之前所有非暂停段累计的秒数。
   */
  const computeElapsedSeconds = (): number => {
    const ts = timerState.value;
    const accumulated = ts.accumulatedSeconds || 0;
    if (ts.isPaused) {
      // 暂停中，只返回暂停那一刻的累计秒数
      return Math.floor(accumulated);
    }
    if (!ts.lastResumeAt) {
      return Math.floor(accumulated);
    }
    const deltaSec = Math.max(0, (Date.now() - ts.lastResumeAt) / 1000);
    return Math.floor(accumulated + deltaSec);
  };

  /**
   * 将 wall-clock 计算出的真实秒数同步到 timerState.elapsedSeconds（节流后调用）。
   * 同时刷新 accumulatedSeconds 快照，避免误差累积。
   */
  const syncElapsedFromWallClock = () => {
    const ts = timerState.value;
    if (ts.isPaused) {
      // 暂停中不做增量累积
      return;
    }
    if (!ts.lastResumeAt) {
      return;
    }
    const totalSec = (Date.now() - ts.lastResumeAt) / 1000;
    ts.accumulatedSeconds = totalSec;
    ts.elapsedSeconds = Math.floor(totalSec);
  };

  /**
   * 启动定时器
   * 注意：定时器仅做周期性 UI 刷新（每 1 秒）。真实的秒数永远从 wall-clock 计算，
   * 因此定时器即使漏触发也不会影响总时长。
   */
  const startTimer = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
    }

    // 立即同步一次
    syncElapsedFromWallClock();

    timerInterval = window.setInterval(() => {
      // 改用 wall-clock 同步，避免 setInterval 漏触发造成累计偏差
      syncElapsedFromWallClock();
    }, 1000);
  };

  /**
   * 停止定时器
   */
  const stopTimer = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };

  // ==================== 返回 ====================

  return {
    // 状态
    timerState,
    progressDisplayMode,
    currentReaderId,
    isInReadingPage,

    // 计算属性
    formattedElapsedTime,
    elapsedMinutes,
    isReading,
    isPaused,
    currentBook,
    currentBookId: computed(() => timerState.value.currentBookId),
    currentProgress,
    startPage,
    elapsedSeconds,

    // 方法
    startReading,
    pauseReading,
    resumeReading,
    endReading,
    togglePause,
    updateCurrentPage,
    updateProgress: updateCurrentPage,
    progressPercent,
    setProgressDisplayMode,
    loadProgressDisplayMode,
    setReaderId,
    loadReaderId,
    setInReadingPage: (value: boolean) => {
      isInReadingPage.value = value;
    }
  };
});

export default useReadingStore;
