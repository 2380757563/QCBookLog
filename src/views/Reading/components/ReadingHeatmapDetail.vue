<template>
  <div v-if="modelValue" class="heatmap-detail-card card">
    <div class="card-header">
      <span class="card-title">📅 {{ selectedDate ? formatDate(selectedDate) : '' }} 阅读详情</span>
      <span class="card-action" @click="close">关闭</span>
    </div>
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    <div v-else-if="records && records.length > 0" class="details-list">
      <div
        v-for="record in records"
        :key="record.id"
        class="detail-item"
        :class="{ 'detail-item--expanded': selectedBook === record.book_id }"
      >
        <div class="detail-cover">
          <img v-if="record.book_cover" :src="record.book_cover" :alt="record.book_title" />
          <div v-else class="cover-placeholder">{{ record.book_title ? record.book_title.charAt(0) : '' }}</div>
        </div>
        <div class="detail-info">
          <div class="detail-title">{{ record.book_title }}</div>
          <div class="detail-author">{{ record.book_author }}</div>
          <div class="detail-meta">
            <span class="detail-time">{{ formatTimeRange(record.start_time, record.end_time) }}</span>
            <span class="detail-duration">{{ formatDuration(record.duration) }}</span>
          </div>
          <div class="detail-pages">
            <span>第 {{ record.start_page }} 页</span>
            <span class="arrow">→</span>
            <span>第 {{ record.end_page }} 页</span>
            <span class="pages-read">（{{ record.pages_read }} 页）</span>
          </div>
          <button 
            v-if="selectedBook !== record.book_id"
            class="detail-expand-btn" 
            @click.stop="selectedBook = record.book_id"
          >
            查看所有阅读时段 ▼
          </button>
        </div>
        
        <!-- 展开显示该书籍的所有阅读记录 -->
        <div v-if="selectedBook === record.book_id" class="book-reading-times">
          <div class="reading-times-header">
            <span>📚 《{{ record.book_title }}》的全部阅读时段</span>
          </div>
          <div v-for="bookRecord in getBookRecords(record.book_id)" 
               :key="bookRecord.id" 
               class="reading-time-item">
            <span class="time-range">{{ formatTime(bookRecord.start_time, bookRecord.end_time) }}</span>
            <span class="time-duration">{{ formatDuration(bookRecord.duration) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">📅</span>
      <p>{{ selectedDate ? formatDate(selectedDate) : '' }} 没有阅读记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Props
interface ReadingHeatmapDetailProps {
  modelValue: boolean;
  selectedDate: string | null;
  records: any[] | null;
  loading: boolean;
}

const props = withDefaults(defineProps<ReadingHeatmapDetailProps>(), {
  modelValue: false,
  selectedDate: null,
  records: null,
  loading: false
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:selectedDate': [value: null];
}>();

// 选中的书籍ID
const selectedBook = ref<number | null>(null);

// 获取指定书籍的所有记录
const getBookRecords = (bookId: number) => {
  if (!props.records) return [];
  return props.records.filter((r: any) => r.book_id === bookId);
};

// 格式化日期
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 格式化时间范围
const formatTimeRange = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
};

// 格式化单个时间点
const formatTime = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startTime = startDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${startTime} - ${endTime}`;
};

// 格式化时长
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

// 关闭详情
const close = () => {
  emit('update:modelValue', false);
  emit('update:selectedDate', null);
  selectedBook.value = null;
};
</script>

<style scoped>
.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.card-action {
  font-size: 14px;
  color: var(--text-hint);
  cursor: pointer;
}

/* 热力图详细数据 */
.heatmap-detail-card {
  margin-top: 1rem;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-item:hover {
  border-color: #ff6b35;
  background-color: #fff8f5;
}

.detail-cover {
  width: 60px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.detail-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #666;
}

.detail-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.detail-duration {
  color: #ff6b35;
  font-weight: 500;
}

.detail-pages {
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

.detail-author {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.detail-expand-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-expand-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

.book-reading-times {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #ff6b35;
}

.reading-times-header {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.reading-time-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.reading-time-item:last-child {
  border-bottom: none;
}

.time-range {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.time-duration {
  font-size: 0.85rem;
  color: #ff6b35;
  font-weight: 500;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
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
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-hint);
}
</style>
