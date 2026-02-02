<template>
  <div class="stats-page">
    <!-- 阅读概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-value">{{ readingStats.totalBooks }}</div>
        <div class="stat-label">藏书总量</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ readingStats.readBooks }}</div>
        <div class="stat-label">已读完</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value">{{ readingStats.totalBookmarks }}</div>
        <div class="stat-label">书摘数量</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">¥{{ readingStats.totalSpent }}</div>
        <div class="stat-label">购书花费</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <div class="stat-value">¥{{ readingStats.totalStandardPrice }}</div>
        <div class="stat-label">标准总价</div>
      </div>
    </div>

    <!-- 阅读状态分布 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 阅读状态分布</span>
      </div>
      <div class="chart-container" ref="statusChartRef"></div>
    </div>

    <!-- 月度阅读趋势 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📈 月度阅读趋势</span>
      </div>
      <div class="chart-container" ref="trendChartRef"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { useBookStore } from '@/store/book';
import { useBookmarkStore } from '@/store/bookmark';

const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();

// 图表引用
const statusChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);

// 阅读统计
const readingStats = computed(() => {
  const books = bookStore.allBooks;
  const bookmarks = bookmarkStore.allBookmarks;
  
  return {
    totalBooks: books.length,
    readBooks: books.filter(b => b.readStatus === '已读').length,
    readingBooks: books.filter(b => b.readStatus === '在读').length,
    unreadBooks: books.filter(b => b.readStatus === '未读').length,
    totalBookmarks: bookmarks.length,
    totalSpent: books.reduce((sum, b) => sum + (b.purchasePrice || 0), 0),
    totalStandardPrice: books.reduce((sum, b) => sum + (b.standardPrice || 0), 0)
  };
});

// 当前年份
const currentYear = new Date().getFullYear();

// 初始化图表
const initCharts = () => {
  // 阅读状态分布图
  if (statusChartRef.value) {
    const chart = echarts.init(statusChartRef.value);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: '5%',
        left: 'center'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        data: [
          { value: readingStats.value.readBooks, name: '已读', itemStyle: { color: '#4caf50' } },
          { value: readingStats.value.readingBooks, name: '在读', itemStyle: { color: '#ff6b35' } },
          { value: readingStats.value.unreadBooks, name: '未读', itemStyle: { color: '#9e9e9e' } }
        ]
      }]
    });
  }

  // 月度趋势图
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value);
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthData = months.map((_, index) => {
      return bookStore.allBooks.filter(b => {
        if (b.readStatus !== '已读' || !b.readCompleteDate) return false;
        const date = new Date(b.readCompleteDate);
        return date.getFullYear() === currentYear && date.getMonth() === index;
      }).length;
    });

    chart.setOption({
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#ddd' } },
        axisLabel: { color: '#666' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      series: [{
        data: monthData,
        type: 'line',
        smooth: true,
        itemStyle: { color: '#ff6b35' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 53, 0.05)' }
          ])
        }
      }]
    });
  }
};

// 组件挂载时初始化图表
onMounted(() => {
  initCharts();
});

// 组件卸载时销毁图表
onUnmounted(() => {
  if (statusChartRef.value) {
    echarts.dispose(statusChartRef.value);
  }
  if (trendChartRef.value) {
    echarts.dispose(trendChartRef.value);
  }
});
</script>

<style scoped lang="scss">
.stats-page {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-primary);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-hint);
  margin-top: 4px;
}

.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-container {
  width: 100%;
  height: 250px;
}
</style>
