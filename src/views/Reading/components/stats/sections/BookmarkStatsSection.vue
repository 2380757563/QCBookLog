<!--
  BookmarkStatsSection.vue
  书摘 section - 2 张图表
    1. 月度书摘趋势（柱状图）
    2. 书摘最多 Top N（横向柱状图 + 封面）

  职责:
  - 渲染书摘区所有图表
  - 通过 props 接收 composable 实例
-->
<template>
  <!-- 1. 月度书摘趋势 -->
  <StatsChartCard
    v-if="visible"
    title="月度书摘趋势"
    tag-label="📝 书摘"
    tag-class="card-title-tag--bookmark"
    subtitle="按月统计新增书摘数量"
    :settings-open="openMenu === 'bookmarkTrend'"
    settings-title="月度书摘趋势 - 设置"
    @toggle-settings="toggleMenu('bookmarkTrend', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="bookmarkTrendChartRef"></div>
  </StatsChartCard>

  <!-- 2. 书摘最多 Top N -->
  <StatsChartCard
    v-if="visible"
    :title="`书摘最多前 ${topBookmarksN} 名`"
    tag-label="📝 书摘"
    tag-class="card-title-tag--bookmark"
    subtitle="按书摘数量排序，左侧封面右侧数据（点击封面跳转详情）"
    :settings-open="openMenu === 'topBookmarks'"
    :settings-title="`书摘最多 - 设置`"
    tall
    @toggle-settings="toggleMenu('topBookmarks', $event)"
  >
    <template #settings>
      <div class="settings-section">
        <div class="settings-section-title">显示数量</div>
        <div class="settings-options">
          <button
            v-for="opt in TOP_N_OPTIONS"
            :key="opt"
            :class="['settings-opt', { active: topBookmarksN === opt }]"
            @click="topBookmarksN = opt as any"
          >Top {{ opt }}</button>
        </div>
      </div>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container chart-container--tall" ref="topBookmarksChartRef"></div>
  </StatsChartCard>
</template>

<script setup lang="ts">
/**
 * BookmarkStatsSection.vue
 *
 * 依赖:
 * - useTimeRange
 * - useStatsSettings
 * - useReadingStats（bookmarkTrendStats）
 * - useTopNChart
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useRouter } from 'vue-router';
import { useBookmarkStore } from '@/stores/bookmark';
import { useBookStore } from '@/stores/book';
import StatsChartCard from '../StatsChartCard.vue';
import CardOpacityControl from '../../CardOpacityControl.vue';
import TimeRangeSection from '../TimeRangeSection.vue';
import type { useTimeRange } from '../../../composables/useTimeRange';
import type { useStatsSettings } from '../../../composables/useStatsSettings';
import { useReadingStats } from '../../../composables/useReadingStats';
import { useTopNChart } from '../../../composables/useTopNChart';

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
const bookmarkStore = useBookmarkStore();
const { filterBookmarksByTimeRange } = props.timeRange;

const TOP_N_OPTIONS = [3, 5, 10] as const;
const topBookmarksN = ref<5 | 3 | 10>(5);

function toggleMenu(id: string, v: boolean) {
  if (v) {
    props.onToggleMenu(id);
  } else {
    props.onCloseMenu(id, v);
  }
}

const { bookmarkTrendStats } = useReadingStats(props.timeRange);

const bookmarkTrendChartRef = ref<HTMLElement | null>(null);
const topBookmarksChartRef = ref<HTMLElement | null>(null);

const topNChart = useTopNChart(router);

/** 月度书摘趋势（柱状图） */
function renderBookmarkTrendChart(forceRecreate = false) {
  const el = bookmarkTrendChartRef.value;
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(el);
    chart = (echarts as any).init(el);
  }
  const { months, counts, hasData } = bookmarkTrendStats.value;
  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, left: 50, right: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: hasData ? months.map(m => m.slice(2)) : ['暂无数据'],
      axisLabel: { fontSize: 10, color: '#666' },
      axisLine: { lineStyle: { color: '#e0e0e0' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 10, color: '#666' },
      splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
    },
    series: [{
      type: 'bar',
      data: hasData ? counts : [0],
      barWidth: '55%',
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#4caf50' },
            { offset: 1, color: '#81c784' },
          ],
        },
        borderRadius: [4, 4, 0, 0],
      },
      label: { show: true, position: 'top', fontSize: 10, color: '#666' },
    }],
  });
}

/** 书摘最多 Top N */
function renderTopBookmarksChart(forceRecreate = false) {
  const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);
  // 聚合：按 bookId 统计书摘数
  const byBook = new Map<number, number>();
  for (const bm of bookmarks) {
    const id = (bm as any).bookId ?? (bm as any).book_id;
    if (!id) continue;
    byBook.set(id, (byBook.get(id) || 0) + 1);
  }
  // 关联到 book 信息（含封面）
  const rows = Array.from(byBook.entries())
    .map(([bookId, count]) => {
      const book = bookStore.allBooks.find((b: any) => b.id === bookId);
      return {
        id: bookId,
        title: book?.title || `书籍#${bookId}`,
        coverUrl: book?.coverUrl || (book as any)?.localCoverData,
        _bmCount: count,
      };
    })
    .filter(r => r.title)
    .sort((a, b) => b._bmCount - a._bmCount)
    .slice(0, topBookmarksN.value);
  topNChart.render(topBookmarksChartRef, {
    rows,
    valueKey: '_bmCount',
    xName: '条',
    barColor: '#9c27b0',
    valueFormatter: (v: number) => `${v} 条`,
    tooltipFormatter: (book: any) => {
      return `${book.title}<br/>书摘数量: ${book._bmCount} 条`;
    },
    emptyText: '暂无书摘数据',
  }, forceRecreate);
}

function initAllCharts() {
  renderBookmarkTrendChart(true);
  renderTopBookmarksChart(true);
}

function disposeAllCharts() {
  if (bookmarkTrendChartRef.value) echarts.dispose(bookmarkTrendChartRef.value);
  if (topBookmarksChartRef.value) echarts.dispose(topBookmarksChartRef.value);
}

defineExpose({ initAllCharts, disposeAllCharts });

watch(() => props.visible, async (v) => {
  await nextTick();
  if (v) initAllCharts();
  else disposeAllCharts();
}, { immediate: false });

watch(topBookmarksN, async () => {
  if (props.visible) {
    await nextTick();
    renderTopBookmarksChart(false);
  }
});

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
