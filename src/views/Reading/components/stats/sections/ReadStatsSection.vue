<!--
  ReadStatsSection.vue
  已读完 section - 3 张图表
    1. 阅读状态分布（饼图）
    2. 月度阅读趋势（折线图）
    3. 阅读时间最多 Top N（横向柱状图 + 封面）

  职责:
  - 渲染已读完区所有图表
  - 通过 props 接收 composable 实例
-->
<template>
  <!-- 1. 阅读状态分布（饼图） -->
  <StatsChartCard
    v-if="visible"
    title="阅读状态分布"
    tag-label="✅ 已读完"
    tag-class="card-title-tag--read"
    subtitle="已读 / 在读 / 未读 占比"
    :settings-open="openMenu === 'status'"
    settings-title="阅读状态分布 - 设置"
    @toggle-settings="toggleMenu('status', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="statusChartRef"></div>
  </StatsChartCard>

  <!-- 2. 月度阅读趋势（折线图） -->
  <StatsChartCard
    v-if="visible"
    title="月度阅读趋势"
    tag-label="✅ 已读完"
    tag-class="card-title-tag--read"
    subtitle="按月统计读完的书籍数量"
    :settings-open="openMenu === 'trend'"
    settings-title="月度阅读趋势 - 设置"
    @toggle-settings="toggleMenu('trend', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="trendChartRef"></div>
  </StatsChartCard>

  <!-- 3. 阅读时间最多 Top N -->
  <StatsChartCard
    v-if="visible"
    :title="`阅读时间最多前 ${topReadTimeN} 名`"
    tag-label="✅ 已读完"
    tag-class="card-title-tag--read"
    subtitle="基于总阅读时长排序，左侧封面右侧数据（点击封面跳转详情）"
    :settings-open="openMenu === 'topReadTime'"
    :settings-title="`阅读时间最多 - 设置`"
    tall
    @toggle-settings="toggleMenu('topReadTime', $event)"
  >
    <template #settings>
      <div class="settings-section">
        <div class="settings-section-title">显示数量</div>
        <div class="settings-options">
          <button
            v-for="opt in TOP_N_OPTIONS"
            :key="opt"
            :class="['settings-opt', { active: topReadTimeN === opt }]"
            @click="topReadTimeN = opt as any"
          >Top {{ opt }}</button>
        </div>
      </div>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container chart-container--tall" ref="topReadTimeChartRef"></div>
  </StatsChartCard>
</template>

<script setup lang="ts">
/**
 * ReadStatsSection.vue
 *
 * 依赖:
 * - useTimeRange
 * - useStatsSettings
 * - useReadingStats
 * - useTopNChart
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import StatsChartCard from '../StatsChartCard.vue';
import CardOpacityControl from '../../CardOpacityControl.vue';
import TimeRangeSection from '../TimeRangeSection.vue';
import type { useTimeRange } from '../../../composables/useTimeRange';
import type { useStatsSettings } from '../../../composables/useStatsSettings';
import { useReadingStats } from '../../../composables/useReadingStats';
import { useTopNChart, formatMinutes } from '../../../composables/useTopNChart';

const props = withDefaults(defineProps<{
  visible?: boolean;
  openMenu: string | null;
  timeRange: ReturnType<typeof useTimeRange>;
  settings: ReturnType<typeof useStatsSettings>;
  onToggleMenu: (id: string) => void;
  onCloseMenu: (id: string, v: boolean) => void;
}>(), {
  visible: false,
});

const router = useRouter();
const bookStore = useBookStore();
const { filterBooksByTimeRange } = props.timeRange;

const TOP_N_OPTIONS = [3, 5, 10] as const;
const topReadTimeN = ref<5 | 3 | 10>(5);

function toggleMenu(id: string, v: boolean) {
  if (v) {
    props.onToggleMenu(id);
  } else {
    props.onCloseMenu(id, v);
  }
}

const { readingStats } = useReadingStats(props.timeRange);

// 图表容器 ref
const statusChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);
const topReadTimeChartRef = ref<HTMLElement | null>(null);

const topNChart = useTopNChart(router);

/** 阅读状态分布（饼图） */
function renderStatusChart(forceRecreate = false) {
  const el = statusChartRef.value;
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(el);
    chart = (echarts as any).init(el);
  }
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: readingStats.value.readBooks, name: '已读', itemStyle: { color: '#4caf50' } },
        { value: readingStats.value.readingBooks, name: '在读', itemStyle: { color: '#ff6b35' } },
        { value: readingStats.value.unreadBooks, name: '未读', itemStyle: { color: '#9e9e9e' } },
      ],
    }],
  });
}

/** 月度阅读趋势（折线图） */
function renderTrendChart(forceRecreate = false) {
  const el = trendChartRef.value;
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(el);
    chart = (echarts as any).init(el);
  }
  const { trendMonths, trendCounts } = readingStats.value;
  const axisLabels = trendMonths.map(m => {
    const [y, mo] = m.split('-');
    return `${String(y).slice(-2)}-${mo}月`;
  });
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: axisLabels,
      axisLine: { lineStyle: { color: '#ddd' } },
      axisLabel: { color: '#666' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [{
      data: trendCounts,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#ff6b35' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255, 107, 53, 0.3)' },
          { offset: 1, color: 'rgba(255, 107, 53, 0.05)' },
        ]),
      },
    }],
  });
}

/** 阅读时间最多 Top N */
function renderTopReadTimeChart(forceRecreate = false) {
  const books = filterBooksByTimeRange(bookStore.allBooks);
  const rows = books
    .filter((b: any) => (b.total_reading_time || 0) > 0)
    .map((b: any) => ({
      ...b,
      coverUrl: b.coverUrl || (b as any).localCoverData,
    }))
    .sort((a: any, b: any) => (b.total_reading_time || 0) - (a.total_reading_time || 0))
    .slice(0, topReadTimeN.value);
  topNChart.render(topReadTimeChartRef, {
    rows,
    valueKey: 'total_reading_time',
    xName: '分钟',
    barColor: '#4caf50',
    valueFormatter: (v: number) => formatMinutes(v),
    tooltipFormatter: (book: any) => {
      const minutes = Math.round(book.total_reading_time || 0);
      return `${book.title || '未命名'}<br/>阅读时长: ${formatMinutes(minutes)}<br/>阅读次数: ${book.reading_count || 0}`;
    },
    emptyText: '暂无阅读时长数据',
  }, forceRecreate);
}

/** 初始化所有图表 */
function initAllCharts() {
  renderStatusChart(true);
  renderTrendChart(true);
  renderTopReadTimeChart(true);
}

/** 销毁所有图表 */
function disposeAllCharts() {
  if (statusChartRef.value) echarts.dispose(statusChartRef.value);
  if (trendChartRef.value) echarts.dispose(trendChartRef.value);
  if (topReadTimeChartRef.value) echarts.dispose(topReadTimeChartRef.value);
}

defineExpose({ initAllCharts, disposeAllCharts });

watch(() => props.visible, async (v) => {
  await nextTick();
  if (v) initAllCharts();
  else disposeAllCharts();
}, { immediate: false });

watch(topReadTimeN, async () => {
  if (props.visible) {
    await nextTick();
    renderTopReadTimeChart(false);
  }
});

// 监听 total_reading_time 变化
watch(
  () => bookStore.allBooks.map((b: any) => `${b.id}:${b.total_reading_time || 0}:${b.reading_count || 0}`).join('|'),
  async () => {
    if (props.visible) {
      await nextTick();
      renderTopReadTimeChart(false);
    }
  }
);

onMounted(async () => {
  if (props.visible) {
    await nextTick();
    initAllCharts();
  }
});

onUnmounted(() => {
  disposeAllCharts();
});
</script>

<style scoped lang="scss">
/* 内部 chart-container 继承 StatsChartCard 外层容器的高度（避免双层嵌套） */
.chart-container {
  width: 100%;
  height: 100%;
}

.chart-container--tall {
  height: 100%;
}
</style>
