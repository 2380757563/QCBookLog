<template>
  <div class="progress-container" v-if="visible">
    <div class="batch-title" v-if="showBatchProgress">
      <span>正在处理: {{ batchProgress.completed }}/{{ batchProgress.total }}</span>
      <div class="progress-bar-wrapper">
        <div class="progress-bar" :style="{ width: batchProgressPercentage + '%', backgroundColor: progressColor }"></div>
      </div>
      <span class="progress-text">{{ batchProgressPercentage }}%</span>
    </div>

    <div class="book-progress-list" v-if="bookProgressList.length > 0">
      <div
        v-for="item in bookProgressList"
        :key="item.bookId"
        class="book-progress-item"
      >
        <div class="book-info">
          <span class="book-title">{{ getBookTitle(item.bookId) }}</span>
          <span class="book-status">{{ item.status }}</span>
        </div>
        <div class="progress-bar-wrapper small">
          <div 
            class="progress-bar" 
            :style="{ 
              width: item.progress + '%', 
              backgroundColor: item.progress === 100 && item.status.includes('失败') ? '#f56c6c' : progressColor 
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProgressStore } from '@/store/progress';

const props = defineProps<{
  visible: boolean;
  bookTitles?: Map<string, string>;
}>();

const progressStore = useProgressStore();

const batchProgress = computed(() => progressStore.batchProgress);
const batchProgressPercentage = computed(() => progressStore.getBatchProgressPercentage);
const showBatchProgress = computed(() => batchProgress.value.active && batchProgress.value.total > 0);

const progressColor = computed(() => {
  if (batchProgressPercentage.value === 100) {
    return '#67c23a';
  } else if (batchProgressPercentage.value > 50) {
    return '#e6a23c';
  } else {
    return '#409eff';
  }
});

const bookProgressList = computed(() => {
  const list = [];
  for (const [bookId, progress] of progressStore.currentBookProgress.entries()) {
    list.push({
      bookId,
      progress,
      status: progressStore.statusMessages.get(bookId) || ''
    });
  }
  return list;
});

const getBookTitle = (bookId: string): string => {
  if (props.bookTitles && props.bookTitles.has(bookId)) {
    return props.bookTitles.get(bookId) || bookId;
  }
  return bookId;
};
</script>

<style scoped>
.progress-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  max-height: 400px;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.batch-title {
  margin-bottom: 16px;
}

.batch-title span {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #303133;
}

.progress-bar-wrapper {
  width: 100%;
  height: 10px;
  background-color: #ebeef5;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar-wrapper.small {
  height: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  text-align: right;
}

.book-progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.book-progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.book-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.book-title {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.book-status {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  margin-left: 8px;
}
</style>
