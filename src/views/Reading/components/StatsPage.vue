<!--
  StatsPage.vue
  统计页编排层（orchestrator）
  职责:
  - 初始化所有 composable（timeRange / settings / readingStats / priceStats）
  - 控制 activeChart（当前激活的图表分类）
  - 控制 openSettingsMenu（当前打开的设置菜单）
  - 渲染 StatsOverview（顶部 6 张概览卡片）
  - 渲染 4 个子 section（藏书 / 已读完 / 书摘 / 价格）
  - 监听时间范围变化、activeChart 变化等
-->
<template>
  <div class="stats-page" :style="{ '--card-opacity': cardOpacity / 100 }">
    <!-- 顶部 6 张概览卡片 -->
    <StatsOverview
      :reading-stats="readingStats"
      :active-chart="activeChart"
      @update:active-chart="onActiveChartChange"
      @open-settings="onOpenSettings"
    />

    <!-- 年度总结卡片 -->
    <AnnualSummaryCard />

    <!-- 图表区域：受 activeChart 控制 -->
    <div v-if="activeChart" class="all-charts-wrapper">
      <BookStatsSection
        :visible="activeChart === 'book' || activeChart === 'all'"
        :open-menu="openSettingsMenu"
        :time-range="timeRange"
        :settings="settings"
        :on-toggle-menu="toggleSettingsMenu"
        :on-close-menu="onSettingsCardToggle"
      />
      <ReadStatsSection
        :visible="activeChart === 'read' || activeChart === 'all'"
        :open-menu="openSettingsMenu"
        :time-range="timeRange"
        :settings="settings"
        :on-toggle-menu="toggleSettingsMenu"
        :on-close-menu="onSettingsCardToggle"
      />
      <BookmarkStatsSection
        :visible="activeChart === 'bookmark' || activeChart === 'all'"
        :open-menu="openSettingsMenu"
        :time-range="timeRange"
        :settings="settings"
        :on-toggle-menu="toggleSettingsMenu"
        :on-close-menu="onSettingsCardToggle"
      />
      <PriceStatsSection
        :visible="activeChart === 'price' || activeChart === 'all'"
        :open-menu="openSettingsMenu"
        :time-range="timeRange"
        :settings="settings"
        :on-toggle-menu="toggleSettingsMenu"
        :on-close-menu="onSettingsCardToggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * StatsPage.vue - 编排层
 */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import StatsOverview from './stats/StatsOverview.vue';
import AnnualSummaryCard from './stats/AnnualSummaryCard.vue';
import BookStatsSection from './stats/sections/BookStatsSection.vue';
import ReadStatsSection from './stats/sections/ReadStatsSection.vue';
import BookmarkStatsSection from './stats/sections/BookmarkStatsSection.vue';
import PriceStatsSection from './stats/sections/PriceStatsSection.vue';
import { useTimeRange } from '../composables/useTimeRange';
import { useStatsSettings } from '../composables/useStatsSettings';
import { useReadingStats } from '../composables/useReadingStats';

type ChartKey = 'all' | 'book' | 'read' | 'bookmark' | 'price' | null;

// 1. 初始化 composables
const timeRange = useTimeRange();
const settings = useStatsSettings();

const { cardOpacity } = settings;

// 时间范围变化时（非 custom 模式）自动关闭设置菜单
watch(() => timeRange.globalTimeRange.value, (v) => {
  if (v !== 'custom') {
    openSettingsMenu.value = null;
  }
});

const { readingStats } = useReadingStats(timeRange);

// 2. 图表分类控制
const activeChart = ref<ChartKey>(null);

// 3. 设置菜单控制
const openSettingsMenu = ref<string | null>(null);

function toggleSettingsMenu(id: string) {
  openSettingsMenu.value = openSettingsMenu.value === id ? null : id;
}

function onSettingsCardToggle(id: string, v: boolean) {
  if (!v && openSettingsMenu.value === id) {
    openSettingsMenu.value = null;
  }
}

function onActiveChartChange(v: ChartKey) {
  activeChart.value = v;
}

function onOpenSettings() {
  // 暂未实现，可后续接入页面级设置
  console.info('[StatsPage] 打开页面设置');
}

// 4. 外部点击关闭菜单
function handleOutsideClick() {
  openSettingsMenu.value = null;
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped lang="scss">
.stats-page {
  width: 100%;
  padding: 16px;
  background-color: var(--bg-primary);
  --card-opacity: 1;
}

.all-charts-wrapper {
  margin-top: 8px;
}

/* 桌面端：图表卡片改两栏网格，充分利用横向空间 */
@media (min-width: 1024px) {
  .stats-page {
    max-width: 1400px;
    margin: 0 auto;
  }

  .all-charts-wrapper {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
  }

  .all-charts-wrapper :deep(.stat-chart-card) {
    margin-bottom: 0;
  }
}
</style>
