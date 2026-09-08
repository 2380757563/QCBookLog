<!--
  BookStatsSection.vue
  藏书 section - 6 张图表
    1. 装帧分布（玫瑰图）
    2. 图表类型分布（饼图）
    3. 纸张类型分布（柱状图）
    4. 刷边处理情况（环形图）
    5. 书籍来源渠道（柱状图）
    6. 标签词云图（HTML/CSS 实现）

  职责:
  - 渲染藏书区所有图表
  - 每个图表接收自己的设置面板状态
  - 图表渲染由父组件在 watch 中触发（通过 ref）
-->
<template>
  <!-- 1. 装帧分布（玫瑰图） -->
  <StatsChartCard
    v-if="visible"
    title="装帧分布"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    subtitle="按 binding1 字段聚合：电子书 / 平装 / 精装 / 特殊装帧"
    :settings-open="openMenu === 'binding'"
    settings-title="装帧分布 - 设置"
    @toggle-settings="toggleMenu('binding', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="bindingChartRef"></div>
  </StatsChartCard>

  <!-- 2. 图表类型分布（饼图） -->
  <StatsChartCard
    v-if="visible"
    title="图表类型分布"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    subtitle="电子书 / 纸质书 / 其他 占比"
    :settings-open="openMenu === 'bookType'"
    settings-title="图表类型分布 - 设置"
    @toggle-settings="toggleMenu('bookType', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="bookTypeChartRef"></div>
  </StatsChartCard>

  <!-- 3. 纸张类型分布（柱状图） -->
  <StatsChartCard
    v-if="visible"
    title="纸张类型分布"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    subtitle="不同纸张的书籍数量"
    :settings-open="openMenu === 'paper'"
    settings-title="纸张类型分布 - 设置"
    @toggle-settings="toggleMenu('paper', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="paperChartRef"></div>
  </StatsChartCard>

  <!-- 4. 刷边处理情况（环形图） -->
  <StatsChartCard
    v-if="visible"
    title="刷边处理情况"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    subtitle="是否刷边 / 刷边类型占比"
    :settings-open="openMenu === 'edge'"
    settings-title="刷边处理情况 - 设置"
    @toggle-settings="toggleMenu('edge', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="edgeChartRef"></div>
  </StatsChartCard>

  <!-- 5. 书籍来源渠道（柱状图） -->
  <StatsChartCard
    v-if="visible"
    title="书籍来源渠道"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    subtitle="不同渠道的书籍数量"
    :settings-open="openMenu === 'source'"
    settings-title="书籍来源渠道 - 设置"
    @toggle-settings="toggleMenu('source', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="sourceChartRef"></div>
  </StatsChartCard>

  <!-- 6. 标签词云图（HTML/CSS 实现） -->
  <StatsChartCard
    v-if="visible"
    title="词云图"
    tag-label="📚 藏书"
    tag-class="card-title-tag--book"
    :subtitle="`按添加频次显示前 ${WORDCLOUD_TOP_N} 标签`"
    :settings-open="openMenu === 'wordCloud'"
    settings-title="词云图 - 设置"
    @toggle-settings="toggleMenu('wordCloud', $event)"
  >
    <template #settings>
      <div class="settings-section">
        <div class="settings-section-title">显示标签数</div>
        <div class="settings-options">
          <button
            v-for="opt in WORDCLOUD_COUNT_OPTIONS"
            :key="opt"
            :class="['settings-opt', { active: wordCloudTopN === opt }]"
            @click="wordCloudTopN = opt as any"
          >Top {{ opt }}</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">字号范围</div>
        <div class="settings-options">
          <button
            v-for="opt in WORDCLOUD_FONT_OPTIONS"
            :key="opt.value"
            :class="['settings-opt', { active: wordCloudFontSize === opt.value }]"
            @click="wordCloudFontSize = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="cardOpacity" @update:modelValue="setCardOpacity" />
      </div>
    </template>
    <div class="wordcloud-container" ref="wordCloudRef">
      <div v-if="allBooksCount === 0" class="wordcloud-empty">
        <div class="wordcloud-empty-title">书籍数据加载中…</div>
        <div class="wordcloud-empty-hint">首次进入统计页会从后端拉取数据</div>
      </div>
      <div v-else-if="wordCloudItems.length === 0" class="wordcloud-empty">
        <div class="wordcloud-empty-title">该时间段内暂无标签数据</div>
        <div class="wordcloud-empty-hint">提示：请在书籍编辑页为藏书添加标签，或放宽时间范围</div>
      </div>
      <div v-else-if="wordCloudLayout.length === 0" class="wordcloud-empty">
        <div class="wordcloud-empty-title">布局计算中…</div>
      </div>
      <div
        v-for="item in wordCloudLayout"
        :key="item.name"
        class="wordcloud-item"
        :style="{
          transform: `translate(${item.cx}px, ${item.cy}px) translate(-50%, -50%) rotate(${item.rotation}deg)`,
          fontSize: item.fontSize + 'px',
          fontWeight: item.fontWeight,
          color: item.color,
          zIndex: Math.round(item.ratio * 1000),
        }"
        :title="`${item.name} · ${item.value} 次`"
      >{{ item.name }}</div>
    </div>
  </StatsChartCard>
</template>

<script setup lang="ts">
/**
 * BookStatsSection.vue
 *
 * 依赖:
 * - useTimeRange（时间范围）
 * - useStatsSettings（卡片透明度、词云选项）
 * - useWordCloud（词云数据 + 布局）
 * - useDistributionChart（多种分布图渲染）
 * - useReadingStats（装帧分布聚合）
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue';
import { useBookStore } from '@/stores/book';
import StatsChartCard from '../StatsChartCard.vue';
import CardOpacityControl from '../../CardOpacityControl.vue';
import TimeRangeSection from '../TimeRangeSection.vue';
import {
  WORDCLOUD_COUNT_OPTIONS,
  WORDCLOUD_FONT_OPTIONS,
  WORDCLOUD_TOP_N,
  type useStatsSettings,
} from '../../../composables/useStatsSettings';
import { useWordCloud } from '../../../composables/useWordCloud';
import { useDistributionChart } from '../../../composables/useDistributionChart';
import {
  useReadingStats,
  PAPER_LABELS,
  EDGE_LABELS,
  getSourceDisplay,
} from '../../../composables/useReadingStats';
import type { useTimeRange } from '../../../composables/useTimeRange';

const props = withDefaults(defineProps<{
  /** section 是否可见（受 activeChart 控制） */
  visible?: boolean;
  /** 当前打开的设置菜单 id */
  openMenu: string | null;
  /** 时间范围 composable 实例 */
  timeRange: ReturnType<typeof useTimeRange>;
  /** 统计页设置 composable 实例 */
  settings: ReturnType<typeof useStatsSettings>;
  /** 切换设置菜单 */
  onToggleMenu: (id: string) => void;
  /** 关闭设置菜单（从 onSettingsCardToggle 同步） */
  onCloseMenu: (id: string, v: boolean) => void;
}>(), {
  visible: false,
});

const emit = defineEmits<{
  (e: 'update:openMenu', v: string | null): void;
}>();

const bookStore = useBookStore();
const { cardOpacity, setCardOpacity, wordCloudTopN, wordCloudFontSize } = props.settings;

// 时间范围
const { filterBooksByTimeRange } = props.timeRange;

function toggleMenu(id: string, v: boolean) {
  if (v) {
    props.onToggleMenu(id);
  } else {
    props.onCloseMenu(id, v);
  }
}

// 阅读统计（用于装帧分布）
const { readingStats } = useReadingStats(props.timeRange);

// 词云
const {
  wordCloudRef,
  wordCloudItems,
  wordCloudLayout,
} = useWordCloud(props.timeRange, props.settings);

const allBooksCount = computed(() => bookStore.allBooks.length);

// 图表容器 ref
const bindingChartRef = ref<HTMLElement | null>(null);
const bookTypeChartRef = ref<HTMLElement | null>(null);
const paperChartRef = ref<HTMLElement | null>(null);
const edgeChartRef = ref<HTMLElement | null>(null);
const sourceChartRef = ref<HTMLElement | null>(null);

const distChart = useDistributionChart();

/** 渲染装帧分布（玫瑰图） */
function renderBindingChart(forceRecreate = false) {
  distChart.render(bindingChartRef, readingStats.value.bindingStats, {
    kind: 'rosePie',
    pick: (b: any) => b.label,
    emptyText: '暂无装帧数据',
  }, forceRecreate);
}

/** 渲染图表类型分布（饼图） */
function renderBookTypeChart(forceRecreate = false) {
  const books = filterBooksByTimeRange(bookStore.allBooks);
  distChart.render(bookTypeChartRef, books, {
    kind: 'pie',
    pick: (b: any) => b.book_type === 0 ? '电子书' : b.book_type === 1 ? '纸质书' : '其他',
    emptyText: '暂无数据',
  }, forceRecreate);
}

/** 渲染纸张类型分布（柱状图） */
function renderPaperChart(forceRecreate = false) {
  const books = filterBooksByTimeRange(bookStore.allBooks);
  distChart.render(paperChartRef, books, {
    kind: 'barH',
    pick: (b: any) => {
      if (b.paper1 === null || b.paper1 === undefined) return '未指定';
      return PAPER_LABELS[b.paper1] ?? `纸张#${b.paper1}`;
    },
    emptyText: '暂无纸张数据',
  }, forceRecreate);
}

/** 渲染刷边处理情况（环形图） */
function renderEdgeChart(forceRecreate = false) {
  const books = filterBooksByTimeRange(bookStore.allBooks);
  distChart.render(edgeChartRef, books, {
    kind: 'donut',
    pick: (b: any) => {
      if (b.edge1 === null || b.edge1 === undefined) return '未指定';
      return EDGE_LABELS[b.edge1] ?? `刷边#${b.edge1}`;
    },
    emptyText: '暂无刷边数据',
  }, forceRecreate);
}

/** 渲染书籍来源渠道（柱状图） */
function renderSourceChart(forceRecreate = false) {
  const books = filterBooksByTimeRange(bookStore.allBooks);
  distChart.render(sourceChartRef, books, {
    kind: 'barH',
    pick: (b: any) => getSourceDisplay(b.source) || '未指定',
    emptyText: '暂无来源数据',
  }, forceRecreate);
}

/** 初始化所有图表 */
function initAllCharts() {
  renderBindingChart(true);
  renderBookTypeChart(true);
  renderPaperChart(true);
  renderEdgeChart(true);
  renderSourceChart(true);
}

/** 销毁所有图表 */
function disposeAllCharts() {
  distChart.dispose(bindingChartRef);
  distChart.dispose(bookTypeChartRef);
  distChart.dispose(paperChartRef);
  distChart.dispose(edgeChartRef);
  distChart.dispose(sourceChartRef);
}

// 暴露方法给父组件
defineExpose({ initAllCharts, disposeAllCharts });

// visible 变化时初始化或销毁
watch(() => props.visible, async (v) => {
  await nextTick();
  if (v) {
    initAllCharts();
  } else {
    disposeAllCharts();
  }
}, { immediate: false });

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

/* 词云图专用样式 */
.wordcloud-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wordcloud-item {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 50% 50%;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  transition: opacity 0.2s ease;
  line-height: 1;
  font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);

  &:hover {
    opacity: 0.75;
  }
}

.wordcloud-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #999;
  padding: 16px;
}

.wordcloud-empty-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}

.wordcloud-empty-hint {
  font-size: 12px;
  color: #999;
  max-width: 480px;
}
</style>
