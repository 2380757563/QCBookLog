<template>
  <div class="reading-stats-card">
    <!-- 卡片标题 -->
    <div class="card-header" v-if="showTitle">
      <h3 class="card-title">{{ title }}</h3>
      <button class="refresh-btn" @click="handleRefresh" v-if="showRefresh">
        <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      </button>
    </div>

    <!-- 统计数据 -->
    <div class="stats-content">
      <!-- 主要统计 -->
      <div class="main-stats">
        <div class="stat-item primary">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
          </div>
          <div class="stat-data">
            <div class="stat-value">{{ formattedTotalTime }}</div>
            <div class="stat-label">总阅读时长</div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon secondary">
            <svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h2v5h8V4h2v16z"/></svg>
          </div>
          <div class="stat-data">
            <div class="stat-value">{{ totalPages }}</div>
            <div class="stat-label">已读页数</div>
          </div>
        </div>
      </div>

      <!-- 详细统计 -->
      <div class="detail-stats">
        <div class="detail-stat">
          <div class="detail-label">阅读次数</div>
          <div class="detail-value">{{ readingCount }} 次</div>
        </div>

        <div class="detail-stat">
          <div class="detail-label">阅读进度</div>
          <div class="detail-value">{{ progressPercent }}%</div>
        </div>

        <div class="detail-stat" v-if="lastReadDate">
          <div class="detail-label">最近阅读</div>
          <div class="detail-value">{{ formatDate(lastReadDate) }}</div>
        </div>

        <div class="detail-stat" v-if="lastReadDuration">
          <div class="detail-label">上次时长</div>
          <div class="detail-value">{{ formatDuration(lastReadDuration) }}</div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-section" v-if="showProgress && totalPages > 0">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="progress-text">{{ totalPages }} / {{ totalBookPages }} 页</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="card-actions" v-if="showActions">
      <button class="action-btn" @click="handleViewRecords">
        <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
        <span>查看记录</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  totalReadingTime?: number;  // 总阅读时长（分钟）
  totalPages?: number;       // 已读页数
  totalBookPages?: number;    // 书籍总页数
  readingCount?: number;      // 阅读次数
  lastReadDate?: string;      // 最近阅读日期
  lastReadDuration?: number;  // 最近一次阅读时长（分钟）
  title?: string;             // 卡片标题
  showTitle?: boolean;        // 是否显示标题
  showProgress?: boolean;     // 是否显示进度条
  showActions?: boolean;      // 是否显示操作按钮
  showRefresh?: boolean;      // 是否显示刷新按钮
}

const props = withDefaults(defineProps<Props>(), {
  totalReadingTime: 0,
  totalPages: 0,
  totalBookPages: 0,
  readingCount: 0,
  title: '阅读统计',
  showTitle: true,
  showProgress: true,
  showActions: true,
  showRefresh: false
});

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'viewRecords'): void;
}>();

// 格式化总阅读时长
const formattedTotalTime = computed(() => {
  if (!props.totalReadingTime || props.totalReadingTime === 0) {
    return '0小时';
  }
  
  const hours = Math.floor(props.totalReadingTime / 60);
  const minutes = props.totalReadingTime % 60;
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  }
  return `${minutes}分钟`;
});

// 格式化时长
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes === 0) return '0分钟';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分' : ''}`;
  }
  return `${mins}分钟`;
};

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
};

// 计算进度百分比
const progressPercent = computed(() => {
  if (!props.totalBookPages || props.totalBookPages === 0) {
    return 0;
  }
  return Math.round((props.totalPages / props.totalBookPages) * 100);
});

// 处理刷新
const handleRefresh = () => {
  emit('refresh');
};

// 处理查看记录
const handleViewRecords = () => {
  emit('viewRecords');
};
</script>

<style scoped>
.reading-stats-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
}

.reading-stats-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.refresh-btn:hover {
  background: #f5f5f5;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
  fill: #666;
}

.stats-content {
  padding: 20px;
}

.main-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.stat-item.primary {
  background: linear-gradient(135deg, #fff5f0 0%, #fff 100%);
  border: 1px solid #ffe8d6;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  fill: white;
}

.stat-item.primary .stat-icon {
  background: linear-gradient(135deg, #ff8c5a 0%, #ff6b35 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.stat-icon.secondary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
}

.stat-data {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.detail-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-label {
  font-size: 13px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.progress-section {
  margin-top: 16px;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff8c5a 0%, #ff6b35 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 12px;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px 20px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #e0e0e0;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
</style>
