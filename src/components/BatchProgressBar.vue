<template>
  <div v-if="visible" class="batch-progress-bar">
    <div class="progress-container">
      <!-- 进度信息 -->
      <div class="progress-info">
        <div class="progress-title">{{ title }}</div>
        <div class="progress-text">{{ progressText }}</div>
      </div>

      <!-- 进度百分比 -->
      <div class="progress-percent">{{ progressPercent }}%</div>
    </div>

    <!-- 进度条 -->
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: progressPercent + '%' }">
        <div class="progress-shine"></div>
      </div>
    </div>

    <!-- 当前处理项 -->
    <div v-if="currentItem" class="current-item">
      <span class="current-label">当前处理：</span>
      <span class="current-value">{{ currentItem }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible?: boolean;
  current?: number;
  total?: number;
  title?: string;
  currentItem?: string;
  bookTitles?: Map<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  current: 0,
  total: 0,
  title: '处理中',
  currentItem: '',
  bookTitles: () => new Map()
});

// 进度文本
const progressText = computed(() => {
  return `${props.current}/${props.total}`;
});

// 进度百分比
const progressPercent = computed(() => {
  if (props.total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((props.current / props.total) * 100)));
});
</script>

<style scoped>
.batch-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 16px 24px;
  animation: slide-down 0.3s ease;
}

@keyframes slide-down {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.progress-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-info {
  flex: 1;
}

.progress-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.progress-text {
  font-size: 13px;
  color: #666;
  font-family: monospace;
}

.progress-percent {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color, #4CAF50);
  margin-left: 16px;
}

.progress-track {
  width: 100%;
  height: 8px;
  background-color: var(--bg-disabled, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
  transition: width 0.3s ease;
  position: relative;
  border-radius: 4px;
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.current-item {
  margin-top: 12px;
  padding: 8px 12px;
  background-color: var(--bg-light, #f9f9f9);
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-label {
  color: var(--text-hint, #999);
  font-weight: 500;
}

.current-value {
  color: var(--text-primary, #333);
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 640px) {
  .batch-progress-bar {
    padding: 12px 16px;
  }

  .progress-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .progress-percent {
    margin-left: 0;
    font-size: 18px;
  }
}
</style>
