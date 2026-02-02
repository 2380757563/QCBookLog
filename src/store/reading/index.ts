/**
 * 阅读状态管理 Store
 * 管理阅读计时器状态、当前阅读书籍等
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ReadingTimerState } from '@/services/readingTracking/types';
import readingTrackingService from '@/services/readingTracking';
import { useBookStore } from '@/store/book';

export const useReadingStore = defineStore('reading', () => {
  // ==================== 状态 ====================

  /**
   * 阅读计时器状态
   */
  const timerState = ref<ReadingTimerState>({
    isReading: false,
    isPaused: false,
    startTime: null,
    pausedTime: null,
    currentBookId: null,
    currentBookTitle: '',
    elapsedSeconds: 0,
    startPage: 0,
    currentPage: 0
  });

  /**
   * 计时器定时器ID
   */
  let timerInterval: number | null = null;

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
  const loadReaderId = () => {
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
    timerState.value = {
      isReading: true,
      isPaused: false,
      startTime: new Date(),
      pausedTime: null,
      currentBookId: bookId,
      currentBookTitle: bookTitle,
      elapsedSeconds: 0,
      startPage,
      currentPage: startPage
    };

    // 启动定时器
    startTimer();

    console.log(`📖 开始阅读: 《${bookTitle}》 第${startPage}页`);
  };

  /**
   * 暂停阅读
   */
  const pauseReading = () => {
    if (!timerState.value.isReading || timerState.value.isPaused) {
      return;
    }

    timerState.value.isPaused = true;
    timerState.value.pausedTime = new Date();

    // 停止定时器
    stopTimer();

    console.log(`⏸️ 阅读已暂停，已读时长: ${formattedElapsedTime.value}`);
  };

  /**
   * 继续阅读
   */
  const resumeReading = () => {
    if (!timerState.value.isReading || !timerState.value.isPaused) {
      return;
    }

    timerState.value.isPaused = false;
    timerState.value.pausedTime = null;

    // 重新启动定时器
    startTimer();

    console.log(`▶️ 继续阅读`);
  };

  /**
   * 结束阅读
   */
  const endReading = async (overrideData?: { startPage?: number; endPage?: number; }) => {
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

    const { currentBookId, currentBookTitle, elapsedSeconds, startPage, currentPage } = timerState.value;
    const endTime = new Date();
    const duration = Math.floor(elapsedSeconds / 60);
    const pagesRead = currentPage - startPage;

    console.log(`✅ 结束阅读: 《${currentBookTitle}》`);
    console.log(`   阅读时长: ${duration}分钟`);
    console.log(`   阅读页数: ${pagesRead}页 (第${startPage}页 -> 第${currentPage}页)`);

    // 调用后端API保存阅读记录
    if (currentBookId) {
      try {
        // 验证必要参数
        const startTime = timerState.value.startTime ? timerState.value.startTime.toISOString() : new Date().toISOString();
        const readerId = currentReaderId.value;

        console.log('📝 准备保存阅读记录，参数验证:');
        console.log('  bookId:', currentBookId);
        console.log('  readerId:', readerId);
        console.log('  startTime:', startTime);
        console.log('  endTime:', endTime.toISOString());
        console.log('  duration:', duration);
        console.log('  startPage:', startPage);
        console.log('  endPage:', currentPage);
        console.log('  pagesRead:', pagesRead);

        // 检查必要参数
        if (currentBookId == null) {
          throw new Error('缺少必要参数: bookId');
        }
        if (readerId == null) {
          throw new Error('缺少必要参数: readerId');
        }
        if (!startTime) {
          throw new Error('缺少必要参数: startTime');
        }
        if (!endTime) {
          throw new Error('缺少必要参数: endTime');
        }
        if (duration == null || duration < 0) {
          throw new Error('缺少必要参数: duration (必须 >= 0)');
        }

        await readingTrackingService.createReadingRecord({
          bookId: currentBookId,
          readerId: readerId,
          startTime: startTime,
          endTime: endTime.toISOString(),
          duration,
          startPage,
          endPage: currentPage,
          pagesRead
        });
        console.log('✅ 阅读记录已保存到后端');
      } catch (error) {
        console.error('❌ 保存阅读记录失败:', error);
        if (error instanceof Error) {
          console.error('错误详情:', error.message);
          console.error('错误堆栈:', error.stack);
        }
        throw error;
      }
    }

    // 重置状态
    timerState.value = {
      isReading: false,
      isPaused: false,
      startTime: null,
      pausedTime: null,
      currentBookId: null,
      currentBookTitle: '',
      elapsedSeconds: 0,
      startPage: 0,
      currentPage: 0
    };

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
  const setReaderId = (readerId: number) => {
    currentReaderId.value = readerId;
    localStorage.setItem('currentReaderId', String(readerId));
  };

  // ==================== 私有方法 ====================

  /**
   * 启动定时器
   */
  const startTimer = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
    }

    timerInterval = window.setInterval(() => {
      timerState.value.elapsedSeconds++;
    }, 1000);

    console.log('⏱️ 计时器已启动');
  };

  /**
   * 停止定时器
   */
  const stopTimer = () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
      console.log('⏹️ 计时器已停止');
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
