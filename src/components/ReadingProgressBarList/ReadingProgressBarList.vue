<template>
  <div class="reading-progress-bar">
    <div class="progress-info">
      <span class="progress-text">{{ progressText }}</span>
      <span v-if="showDuration && book.total_reading_time" class="duration-text">{{ formatDuration(book.total_reading_time) }}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
    <div class="progress-stats">
      <span v-if="book.reading_count" class="stat-item">
        <span class="stat-icon">📖</span>
        {{ book.reading_count }}次
      </span>
      <span v-if="book.last_read_date" class="stat-item">
        <span class="stat-icon">📅</span>
        {{ formatDate(book.last_read_date) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Book } from '@/services/book/types';

interface Props {
  book: Book;
  showDuration?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDuration: true
});

const progressPercent = computed(() => {
  if (!props.book.pages || props.book.pages === 0) {
    return 0;
  }
  const readPages = props.book.read_pages || 0;
  return Math.min(100, Math.round((readPages / props.book.pages) * 100));
});

const progressText = computed(() => {
  if (!props.book.pages || props.book.pages === 0) {
    return '未设置页数';
  }
  const readPages = props.book.read_pages || 0;
  return `${readPages} / ${props.book.pages} 页 (${progressPercent.value}%)`;
});

const formatDuration = (minutes: number): string => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};
</script>

<style scoped>
.reading-progress-bar {
  width: 100%;
  margin-top: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}

.progress-text {
  font-weight: 500;
  color: #ff6b35;
}

.duration-text {
  color: #999;
}

.progress-track {
  width: 100%;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff8c5a 0%, #ff6b35 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: #999;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  font-size: 0.8rem;
}
</style>
