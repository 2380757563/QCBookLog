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

    <!-- 购书价格分析 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">💰 购书花费分类</span>
        <span class="card-subtitle">点击下钻查看具体书籍</span>
      </div>
      <div class="price-charts-row">
        <div class="price-chart-col">
          <div class="chart-container" ref="priceCategoryChartRef"></div>
        </div>
        <div class="price-chart-col">
          <div class="discount-summary" v-if="priceStats.savings > 0">
            <div class="summary-item">
              <div class="summary-label">标准总价</div>
              <div class="summary-value">¥{{ priceStats.totalStandard.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--paid">
              <div class="summary-label">实付总价</div>
              <div class="summary-value">¥{{ priceStats.totalPaid.toFixed(2) }}</div>
            </div>
            <div class="summary-item summary-item--saved">
              <div class="summary-label">共省下</div>
              <div class="summary-value">¥{{ priceStats.savings.toFixed(2) }}</div>
              <div class="summary-percent">{{ priceStats.savingsPercent }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 折扣对比环形图 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">💎 购书折扣对比</span>
        <span class="card-subtitle">外环标准价 / 内环实付价</span>
      </div>
      <div class="chart-container chart-container--tall" ref="discountChartRef"></div>
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
const priceCategoryChartRef = ref<HTMLElement | null>(null);
const discountChartRef = ref<HTMLElement | null>(null);

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

// 价格统计（按书籍载体 + 分组分类）
const priceStats = computed(() => {
  const books = bookStore.allBooks;

  // 按 book_type 聚合（电子/纸质）
  const typeAgg: Record<string, { count: number; spent: number; standard: number }> = {
    电子书: { count: 0, spent: 0, standard: 0 },
    纸质书: { count: 0, spent: 0, standard: 0 },
  };
  // 按 分组 聚合（按首分组分组）
  const groupAgg: Record<string, { count: number; spent: number; standard: number }> = {
    未分组: { count: 0, spent: 0, standard: 0 },
  };

  for (const b of books) {
    const typeKey = b.book_type === 0 ? '电子书' : '纸质书';
    typeAgg[typeKey].count += 1;
    typeAgg[typeKey].spent += b.purchasePrice || 0;
    typeAgg[typeKey].standard += b.standardPrice || 0;

    const groupKey = (b.groups && b.groups.length > 0) ? b.groups[0] : '未分组';
    if (!groupAgg[groupKey]) {
      groupAgg[groupKey] = { count: 0, spent: 0, standard: 0 };
    }
    groupAgg[groupKey].count += 1;
    groupAgg[groupKey].spent += b.purchasePrice || 0;
    groupAgg[groupKey].standard += b.standardPrice || 0;
  }

  const totalPaid = books.reduce((s, b) => s + (b.purchasePrice || 0), 0);
  const totalStandard = books.reduce((s, b) => s + (b.standardPrice || 0), 0);
  const savings = Math.max(0, totalStandard - totalPaid);
  const savingsPercent = totalStandard > 0 ? Math.round((savings / totalStandard) * 100) : 0;

  return { typeAgg, groupAgg, totalPaid, totalStandard, savings, savingsPercent };
});

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

  // 购书花费分类环形图（按分组 + 载体）
  if (priceCategoryChartRef.value) {
    const chart = echarts.init(priceCategoryChartRef.value);
    const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107', '#e91e63', '#00bcd4', '#795548', '#607d8b'];
    const { groupAgg, typeAgg } = priceStats.value;

    // 按花费排序，取前 8 个分组，其他归入"其他"
    const sorted = Object.entries(groupAgg)
      .map(([k, v]) => ({ name: k, value: Math.round(v.spent * 100) / 100, count: v.count }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    if (rest.length > 0) {
      const sumRest = rest.reduce((s, x) => s + x.value, 0);
      const countRest = rest.reduce((s, x) => s + x.count, 0);
      top.push({ name: `其他(${rest.length}类)`, value: Math.round(sumRest * 100) / 100, count: countRest });
    }

    const data = top
      .filter(d => d.value > 0)
      .map((d, i) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: palette[i % palette.length] },
      }));

    // 把电子/纸质也作为内嵌小环形展示
    const typeData = [
      {
        name: '电子书', value: Math.round(typeAgg['电子书'].spent * 100) / 100,
        itemStyle: { color: '#4caf50' }
      },
      {
        name: '纸质书', value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
        itemStyle: { color: '#ff6b35' }
      },
    ].filter(d => d.value > 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const datum = top.find(d => d.name === params.name);
          const count = datum ? datum.count : 0;
          return `${params.seriesName}<br/>${params.marker} ${params.name}<br/>花费: ¥${params.value.toFixed(2)}<br/>占比: ${params.percent}%<br/>册数: ${count}`;
        }
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 'middle',
        textStyle: { fontSize: 11, color: '#666' }
      },
      series: [
        {
          name: '按分组',
          type: 'pie',
          radius: ['0%', '38%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          data: typeData,
        },
        {
          name: '按分组',
          type: 'pie',
          radius: ['50%', '72%'],
          center: ['38%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n¥{c|{c}}',
            rich: { c: { color: '#333', fontSize: 10, fontWeight: 600 } }
          },
          labelLine: { length: 8, length2: 8 },
          data: data,
        }
      ]
    });
  }

  // 折扣对比环形图（外环标准价 + 内环实付价）
  if (discountChartRef.value) {
    const chart = echarts.init(discountChartRef.value);
    const { totalPaid, totalStandard, savings } = priceStats.value;

    // 外环：标准价（已购书的 standardPrice 之和）
    // 内环：实付价 + 节省 = 标准价
    const standardData = [
      { name: '实付', value: Math.round(totalPaid * 100) / 100, itemStyle: { color: '#ff6b35' } },
      { name: '省下', value: Math.round(savings * 100) / 100, itemStyle: { color: '#4caf50' } },
    ];

    // 内环：按载体类型再细分
    const { typeAgg } = priceStats.value;
    const innerData = [
      {
        name: '电子书实付',
        value: Math.round(typeAgg['电子书'].spent * 100) / 100,
        itemStyle: { color: '#66bb6a' }
      },
      {
        name: '纸质书实付',
        value: Math.round(typeAgg['纸质书'].spent * 100) / 100,
        itemStyle: { color: '#ff8a65' }
      },
    ].filter(d => d.value > 0);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>金额: ¥{c}<br/>占比: {d}%'
      },
      legend: {
        bottom: 10,
        left: 'center',
        textStyle: { fontSize: 12, color: '#666' }
      },
      title: {
        text: `实付占比\n${totalStandard > 0 ? Math.round((totalPaid / totalStandard) * 100) : 0}%`,
        left: '50%',
        top: '46%',
        textAlign: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          lineHeight: 20
        }
      },
      series: [
        {
          name: '外环(标准价)',
          type: 'pie',
          radius: ['52%', '72%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n¥{c}',
            fontSize: 11
          },
          data: standardData,
        },
        {
          name: '内环(实付构成)',
          type: 'pie',
          radius: ['24%', '44%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n¥{c}',
            fontSize: 10
          },
          data: innerData,
        }
      ]
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
  if (priceCategoryChartRef.value) {
    echarts.dispose(priceCategoryChartRef.value);
  }
  if (discountChartRef.value) {
    echarts.dispose(discountChartRef.value);
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

.chart-container--tall {
  height: 320px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-hint);
  margin-left: 8px;
  font-weight: normal;
}

.price-charts-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.price-chart-col {
  flex: 1;
  min-width: 0;
}

.discount-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(76, 175, 80, 0.05));
  border-radius: var(--radius-md);
  height: 100%;
}

.summary-item {
  padding: 10px 12px;
  background: var(--bg-card);
  border-radius: 8px;
  border-left: 3px solid #ff6b35;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.summary-item--paid {
  border-left-color: #ff6b35;
}

.summary-item--saved {
  border-left-color: #4caf50;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.02));
}

.summary-label {
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-percent {
  font-size: 11px;
  color: #4caf50;
  margin-top: 2px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .price-charts-row {
    flex-direction: column;
  }
  .chart-container--tall {
    height: 280px;
  }
}
</style>
