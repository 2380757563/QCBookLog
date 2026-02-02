<template>
  <div class="daily-stats-container">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">每日阅读统计</h1>
      <div class="header-spacer"></div>
    </div>

    <div class="content">
      <!-- 日期选择器 -->
      <div class="date-selector">
        <button class="date-nav-btn" @click="changeDate(-1)" :disabled="loading">
          <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L14 8.83V17h2V8.83l5.59 5.58z"/></svg>
        </button>
        <div class="current-date">{{ formatDate(selectedDate) }}</div>
        <button class="date-nav-btn" @click="changeDate(1)" :disabled="loading">
          <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L10 15.17V9H8v6.17l-5.59-5.58z"/></svg>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!dailyStats || dailyStats.records.length === 0" class="empty-state">
        <span class="empty-icon">📅</span>
        <p>{{ formatDate(selectedDate) }} 没有阅读记录</p>
      </div>

      <!-- 统计内容 -->
      <div v-else class="stats-content">
        <!-- 今日统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-value">{{ dailyStats.total_books || 0 }}</div>
            <div class="stat-label">阅读书籍</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📄</div>
            <div class="stat-value">{{ dailyStats.total_pages || 0 }}</div>
            <div class="stat-label">阅读页数</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">{{ formatDuration(dailyStats.total_time || 0) }}</div>
            <div class="stat-label">阅读时长</div>
          </div>
        </div>

        <!-- 阅读记录列表 -->
        <div class="records-section">
          <h2 class="section-title">阅读记录</h2>
          <div class="records-list">
            <div
              v-for="record in dailyStats.records"
              :key="record.id"
              class="record-item"
              @click="record.book_id && goToBookDetail(record.book_id)"
            >
              <div class="record-cover">
                <img v-if="record.book_cover" :src="record.book_cover" :alt="record.book_title || record.title || ''" />
                <div v-else class="cover-placeholder">{{ (record.book_title || record.title || '').charAt(0) }}</div>
              </div>
              <div class="record-info">
                <div class="record-title">{{ record.book_title || record.title }}</div>
                <div class="record-meta">
                  <span class="record-time">{{ formatTimeRange(record.start_time || record.startTime || '', record.end_time || record.endTime || '') }}</span>
                  <span class="record-duration">{{ formatDuration(record.duration) }}</span>
                </div>
                <div class="record-pages">
                  <span>第 {{ record.start_page || record.start_page || 0 }} 页</span>
                  <span class="arrow">→</span>
                  <span>第 {{ record.end_page || record.endPage || 0 }} 页</span>
                  <span class="pages-read">（{{ record.pages_read || record.pagesRead || 0 }} 页）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEventBus } from '@/utils/eventBus';
import readingTrackingService, { ReadingRecord } from '@/services/readingTracking';

interface DailyStats {
  total_books: number;
  total_pages: number;
  total_time: number;
  records: ReadingRecord[];
}

const router = useRouter();
const eventBus = useEventBus();
const selectedDate = ref(new Date());
const loading = ref(false);
const dailyStats = ref<DailyStats | null>(null);

const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return '今天';
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
};

const formatTimeRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

const changeDate = (days: number) => {
  const newDate = new Date(selectedDate.value);
  newDate.setDate(newDate.getDate() + days);
  selectedDate.value = newDate;
  loadDailyStats();
};

const loadDailyStats = async () => {
  loading.value = true;
  try {
    const dateStr = selectedDate.value.toISOString().split('T')[0];
    const records = await readingTrackingService.getDailyReadingDetails(dateStr);

    // 从记录中计算统计数据
    const total_books = new Set(records.map(r => r.bookId)).size;
    const total_pages = records.reduce((sum, r) => sum + r.pagesRead, 0);
    const total_time = records.reduce((sum, r) => sum + r.duration, 0);

    dailyStats.value = {
      total_books,
      total_pages,
      total_time,
      records
    };
  } catch (error) {
    console.error('加载每日统计失败:', error);
    dailyStats.value = null;
  } finally {
    loading.value = false;
  }
};

const goToBookDetail = (bookId: number) => {
  router.push(`/book/detail/${bookId}`);
};

const goBack = () => {
  router.back();
};

onMounted(() => {
  loadDailyStats();
});

// 监听读者切换事件
eventBus.on('reader-changed', (data: any) => {
  console.log('📥 收到读者切换事件:', data);
  // 重新加载每日统计
  loadDailyStats();
});
</script>

<style scoped>
.daily-stats-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  color: #333;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.header-spacer {
  width: 2rem;
}

.content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.date-nav-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: #f5f5f5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.date-nav-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.date-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-nav-btn svg {
  width: 20px;
  height: 20px;
  color: #333;
}

.current-date {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  min-width: 200px;
  text-align: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 1rem;
}

.empty-icon {
  font-size: 4rem;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #ff6b35;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

.records-section {
  background-color: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 1rem 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.record-item:hover {
  border-color: #ff6b35;
  background-color: #fff8f5;
}

.record-cover {
  width: 60px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.record-cover img {
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
  font-size: 1.5rem;
  font-weight: 600;
  color: #999;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.record-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.record-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #666;
}

.record-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.record-duration {
  color: #ff6b35;
  font-weight: 500;
}

.record-pages {
  font-size: 0.85rem;
  color: #999;
}

.arrow {
  margin: 0 0.5rem;
}

.pages-read {
  color: #ff6b35;
  font-weight: 500;
}

@media (max-width: 640px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .record-item {
    flex-direction: column;
  }
  
  .record-cover {
    width: 100%;
    height: 150px;
  }
}
</style>
