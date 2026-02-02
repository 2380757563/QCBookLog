<template>
  <div class="reading-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="handleBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">正在阅读</h1>
      <div class="header-actions">
        <div class="timer">{{ formattedTime }}</div>
        <button class="settings-btn" @click="goToSettings">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        </button>
      </div>
    </div>

    <div v-if="book" class="content">
      <!-- 书籍信息卡片 -->
      <div class="book-card">
        <div class="book-info">
          <div class="book-cover">
            <img v-if="book.coverUrl" :src="book.coverUrl" :alt="book.title" />
            <div v-else class="cover-placeholder">{{ book.title.charAt(0) }}</div>
          </div>
          <div class="book-details">
            <h2 class="book-title">{{ book.title }}</h2>
            <p class="book-author">{{ book.author }}</p>
            <div class="reading-progress">
              <div class="progress-label">阅读进度</div>
              <div class="progress-value">{{ currentPage }} / {{ book.pages }} 页</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 阅读操作 -->
      <div class="reading-actions">
        <!-- 今日统计 -->
        <div class="action-card" v-if="todayStats">
          <h3 class="card-title">今日统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ formatDuration(todayStats.totalTime) }}</div>
              <div class="stat-label">阅读时长</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ todayStats.totalPages }} 页</div>
              <div class="stat-label">阅读页数</div>
            </div>
          </div>
        </div>

        <!-- 更新页码 -->
        <div class="action-card">
          <h3 class="card-title">当前页码</h3>
          <div class="page-input-group">
            <button class="page-btn" @click="decrementPage" :disabled="currentPage <= 0">-</button>
            <input
              v-model.number="currentPage"
              type="number"
              class="page-input"
              :min="0"
              :max="book.pages || 9999"
            />
            <button class="page-btn" @click="incrementPage" :disabled="currentPage >= (book.pages || 9999)">+</button>
          </div>
        </div>

        <!-- 快捷摘录 -->
        <div class="action-card">
          <h3 class="card-title">快捷摘录</h3>
          <textarea
            v-model="bookmarkContent"
            class="bookmark-input"
            placeholder="输入书摘内容..."
            rows="3"
          ></textarea>
          <div class="bookmark-actions">
            <button class="btn btn-primary" @click="handleAddBookmark">
              <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              添加摘录
            </button>
          </div>
        </div>
      </div>

      <!-- 阅读控制 -->
      <div class="reading-controls">
        <button v-if="!isPaused" class="control-btn pause" @click="pauseReading">
          <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <span>暂停阅读</span>
        </button>
        <button v-else class="control-btn resume" @click="resumeReading">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span>继续阅读</span>
        </button>
        <button class="control-btn end" @click="handleEndReading">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>结束阅读</span>
        </button>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useReadingStore } from '@/store/reading';
import { useBookStore } from '@/store/book';
import { bookmarkService } from '@/services/bookmark';
import readingTrackingService from '@/services/readingTracking';
import type { Book } from '@/services/book/types';

const router = useRouter();
const route = useRoute();
const readingStore = useReadingStore();
const bookStore = useBookStore();

const book = ref<Book | null>(null);
const bookmarkContent = ref('');

// 当前页码
const currentPage = ref(0);

// 是否暂停
const isPaused = computed(() => readingStore.isPaused);

// 今日统计
const todayStats = ref<{ totalTime: number; totalPages: number } | null>(null);

// 格式化时间
const formattedTime = computed(() => {
  const seconds = readingStore.elapsedSeconds;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
});

// 格式化时长（分钟）
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
};

// 进度百分比
const progressPercent = computed(() => {
  if (!book.value || !book.value.pages) return 0;
  return Math.round((currentPage.value / book.value.pages) * 100);
});

// 返回
const handleBack = () => {
  if (readingStore.isReading) {
    if (confirm('阅读正在进行中，确定要退出吗？')) {
      router.back();
    }
  } else {
    router.back();
  }
};

// 跳转到设置
const goToSettings = () => {
  router.push('/reading-settings');
};

// 减少页码
const decrementPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
    updateProgress();
  }
};

// 增加页码
const incrementPage = () => {
  if (book.value && currentPage.value < book.value.pages) {
    currentPage.value++;
    updateProgress();
  }
};

// 更新进度
const updateProgress = () => {
  readingStore.updateCurrentPage(currentPage.value);
};

// 暂停阅读
const pauseReading = () => {
  readingStore.pauseReading();
};

// 继续阅读
const resumeReading = () => {
  readingStore.resumeReading();
};

// 结束阅读
const handleEndReading = async () => {
  if (confirm('确定要结束本次阅读吗？')) {
    try {
      await readingStore.endReading();
      // 跳转回详情页
      router.push(`/book/detail/${book.value?.id}`);
    } catch (error) {
      console.error('结束阅读失败:', error);
      alert('结束阅读失败，请重试');
    }
  }
};

// 添加书摘
const handleAddBookmark = async () => {
  if (!book.value) return;

  const content = bookmarkContent.value.trim();
  if (!content) {
    alert('请输入书摘内容');
    return;
  }

  try {
    await bookmarkService.createBookmark({
      bookId: book.value.id,
      content,
      pageNum: currentPage.value,
      createTime: new Date().toISOString()
    });

    bookmarkContent.value = '';
    alert('书摘添加成功！');
  } catch (error) {
    console.error('添加书摘失败:', error);
    alert('添加书摘失败，请重试');
  }
};

// 初始化
onMounted(async () => {
  const bookId = Number(route.params.id);

  // 标记进入阅读界面
  readingStore.setInReadingPage(true);

  // 获取书籍信息
  book.value = bookStore.getBookById(bookId) || await bookService.getBookById(bookId) || null;

  // 如果已经在阅读中，使用当前页码
  if (readingStore.isReading && readingStore.currentBookId === bookId) {
    currentPage.value = readingStore.currentProgress;
  } else if (book.value) {
    // 否则根据进度计算
    const progress = book.value.progress || 0;
    currentPage.value = book.value.pages
      ? Math.floor(book.value.pages * (progress / 100))
      : 0;
  }

  // 加载今日统计
  if (book.value) {
    await loadTodayStats(book.value.id);
  }
});

// 加载今日统计
const loadTodayStats = async (bookId: number) => {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 获取今日所有阅读记录
    const records = await readingTrackingService.getDailyReadingDetails(dateStr);
    
    // 过滤出当前书籍的记录
    const bookRecords = records.filter(record => record.bookId === bookId);
    
    if (bookRecords.length > 0) {
      const totalTime = bookRecords.reduce((sum, record) => sum + record.duration, 0);
      const totalPages = bookRecords.reduce((sum, record) => sum + (record.pagesRead || 0), 0);
      
      todayStats.value = {
        totalTime,
        totalPages
      };
    } else {
      todayStats.value = null;
    }
  } catch (error) {
    console.error('加载今日统计失败:', error);
    todayStats.value = null;
  }
};

// 监听页码变化，更新进度
watch(currentPage, () => {
  updateProgress();
});

// 组件卸载时标记离开阅读界面
onUnmounted(() => {
  // 标记离开阅读界面，悬浮窗将自动显示并继续计时
  readingStore.setInReadingPage(false);
});
</script>

<style scoped>
.reading-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timer {
  font-size: 18px;
  font-weight: 700;
  color: #ff6b35;
  white-space: nowrap;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.settings-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 50%;
}

.settings-btn svg {
  width: 20px;
  height: 20px;
  fill: var(--text-secondary);
}

.content {
  padding: 16px;
}

/* 书籍卡片 */
.book-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.book-info {
  display: flex;
  gap: 16px;
}

.book-cover {
  width: 80px;
  height: 106px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 24px;
  font-weight: 500;
}

.book-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.book-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

.reading-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-label {
  font-size: 12px;
  color: var(--text-hint);
}

.progress-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b35, #ff8c5a);
  transition: width 0.3s ease;
}

/* 阅读操作 */
.reading-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.action-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-hint);
}

/* 页码输入 */
.page-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-light);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 16px;
  text-align: center;
}

/* 书摘输入 */
.bookmark-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  margin-bottom: 12px;
}

.bookmark-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.bookmark-actions {
  display: flex;
  justify-content: flex-end;
}

/* 阅读控制 */
.reading-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.control-btn.pause {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

.control-btn.pause:hover {
  background-color: #e0e0e0;
}

.control-btn.resume {
  background-color: #4caf50;
  color: white;
}

.control-btn.resume:hover {
  background-color: #43a047;
}

.control-btn.end {
  background-color: #ff6b35;
  color: white;
}

.control-btn.end:hover {
  background-color: #e55a2b;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-hint);
}
</style>
