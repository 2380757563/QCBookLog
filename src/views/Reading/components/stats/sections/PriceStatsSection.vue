<!--
  PriceStatsSection.vue
  价格 section - 3 张图表
    1. 购书花费分类（嵌套饼图）
    2. 购书折扣对比（双环玫瑰图）
    3. 购书花费时间趋势（折线/柱状）

  职责:
  - 渲染价格区所有图表
  - 通过 props 接收 composable 实例
-->
<template>
  <!-- 1. 购书花费分类（嵌套饼图） -->
  <StatsChartCard
    v-if="visible"
    title="购书花费分类"
    tag-label="🏷️ 价格"
    tag-class="card-title-tag--price"
    subtitle="点击下钻查看具体书籍"
    card-class="card--price"
    :settings-open="openMenu === 'priceCategory'"
    settings-title="购书花费分类 - 设置"
    @toggle-settings="toggleMenu('priceCategory', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <div class="settings-section-title">分类模式</div>
        <div class="settings-options">
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceCategoryMode.value === 'group' }]"
            @click="priceStatsComposable.priceCategoryMode.value = 'group'"
          >分组</button>
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceCategoryMode.value === 'tag' }]"
            @click="priceStatsComposable.priceCategoryMode.value = 'tag'"
          >标签</button>
        </div>
      </div>
      <template v-if="priceStatsComposable.priceCategoryMode.value === 'tag'">
        <div class="settings-section">
          <div class="settings-section-title">标签数量</div>
          <div class="settings-options">
            <button
              v-for="opt in TAG_COUNT_OPTIONS"
              :key="String(opt.value)"
              :class="['settings-opt', { active: priceStatsComposable.priceTagCountPreset.value === opt.value && opt.value !== 'custom' }]"
              @click="priceStatsComposable.selectTagCountPreset(opt.value)"
            >{{ opt.label }}</button>
          </div>
          <div v-if="priceStatsComposable.priceTagCountPreset.value === 'custom'" class="settings-custom-range">
            <span class="settings-range-sep">显示</span>
            <input
              type="number"
              :value="priceStatsComposable.priceTagCustomCount.value"
              @input="onCustomTagCountChange"
              :min="1"
              :max="MAX_TAG_COUNT"
              class="settings-date-input"
              style="flex: 0 0 70px; text-align: center;"
            />
            <span class="settings-range-sep">个标签（1-{{ MAX_TAG_COUNT }}）</span>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">特定标签模式</div>
          <label class="settings-toggle">
            <input
              type="checkbox"
              :checked="priceStatsComposable.priceSpecificTagMode.value"
              @change="onSpecificTagModeChange"
            />
            <span>{{ priceStatsComposable.priceSpecificTagMode.value ? '已开启：手动选择要显示的标签' : '开启后手动选择要显示的标签' }}</span>
          </label>
          <div v-if="priceStatsComposable.priceSpecificTagMode.value" class="specific-tag-block">
            <input
              :value="priceStatsComposable.priceSpecificTagSearch.value"
              @input="onSpecificTagSearchChange"
              type="text"
              class="settings-date-input"
              placeholder="🔍 搜索标签（模糊匹配）"
            />
            <div
              v-if="priceStatsComposable.priceSpecificTagSearch.value.trim() && priceStatsComposable.priceSpecificTagCandidates.value.length > 0"
              class="specific-tag-candidates"
            >
              <span
                v-for="t in priceStatsComposable.priceSpecificTagCandidates.value"
                :key="`cand-${t}`"
                class="specific-tag-chip"
                :class="{ disabled: priceStatsComposable.priceSpecificTagSelected.value.length >= MAX_TAG_COUNT }"
                @click="priceStatsComposable.addSpecificTag(t)"
              >+ {{ t }}</span>
            </div>
            <div
              v-else-if="priceStatsComposable.priceSpecificTagSearch.value.trim()"
              class="specific-tag-empty"
            >没有找到匹配 "{{ priceStatsComposable.priceSpecificTagSearch.value }}" 的标签</div>
            <div class="specific-tag-selected">
              <div class="specific-tag-selected-label">
                已选 ({{ priceStatsComposable.priceSpecificTagSelected.value.length }}/{{ MAX_TAG_COUNT }})：
              </div>
              <div
                v-if="priceStatsComposable.priceSpecificTagSelected.value.length > 0"
                class="specific-tag-selected-list"
              >
                <span
                  v-for="t in priceStatsComposable.priceSpecificTagSelected.value"
                  :key="`sel-${t}`"
                  class="specific-tag-chip specific-tag-chip--selected"
                  @click="priceStatsComposable.removeSpecificTag(t)"
                >{{ t }} ×</span>
              </div>
              <div v-else class="specific-tag-empty">未选择特定标签</div>
            </div>
            <div class="specific-tag-hint">
              💡 特定标签与下方自动标签共享 {{ MAX_TAG_COUNT }} 个额度。
            </div>
          </div>
        </div>
      </template>
      <div class="settings-section">
        <div class="settings-section-title">价格口径</div>
        <div class="settings-options">
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceType.value === 'paid' }]"
            @click="priceStatsComposable.priceType.value = 'paid'"
          >实际价格</button>
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceType.value === 'standard' }]"
            @click="priceStatsComposable.priceType.value = 'standard'"
          >标准价格</button>
        </div>
      </div>
      <div v-if="priceStatsComposable.priceType.value === 'paid'" class="settings-section">
        <div class="settings-section-title">排除 0 元</div>
        <label class="settings-toggle">
          <input
            type="checkbox"
            :checked="priceStatsComposable.excludeZeroPaid.value"
            @change="onExcludeZeroChange"
          />
          <span>{{ priceStatsComposable.excludeZeroPaid.value ? '已排除购买价为 0 的书' : '排除购买价为 0 的书' }}</span>
        </label>
      </div>
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div v-if="priceStatsComposable.priceCategoryMode.value === 'tag'" class="mode-hint">
      <span class="mode-hint-icon">💡</span>
      一本书有多个标签时，花费按标签数平均分摊，所有分类金额合计等于总花费。
    </div>
    <div class="price-charts-row">
      <div class="price-chart-col">
        <div class="chart-container" ref="priceCategoryChartRef"></div>
        <div
          v-if="(priceStatsComposable.priceType.value === 'paid' && priceStats.totalPaid === 0) || (priceStatsComposable.priceType.value === 'standard' && priceStats.totalStandard === 0)"
          class="chart-empty-state"
        >
          <div class="empty-icon">💰</div>
          <div class="empty-text">{{ priceStatsComposable.priceType.value === 'paid' ? '还没有实际购书花费数据' : '还没有标准定价数据' }}</div>
          <div class="empty-hint">去书籍详情填写{{ priceStatsComposable.priceType.value === 'paid' ? '"购入价格"' : '"标准定价"' }}后，这里会按分组/标签显示花费占比</div>
          <div v-if="priceStatsComposable.priceType.value === 'paid' && priceStatsComposable.excludeZeroPaid.value" class="empty-hint" style="margin-top:6px">💡 已排除购买价为 0 的书，试试取消"排除 0 元"</div>
        </div>
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
  </StatsChartCard>

  <!-- 2. 购书折扣对比（双环玫瑰图） -->
  <StatsChartCard
    v-if="visible"
    title="购书折扣对比"
    tag-label="🏷️ 价格"
    tag-class="card-title-tag--price"
    subtitle="外环标准价 / 内环实付价"
    card-class="card--price"
    :settings-open="openMenu === 'discount'"
    settings-title="购书折扣对比 - 设置"
    tall
    @toggle-settings="toggleMenu('discount', $event)"
  >
    <template #settings>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container chart-container--tall" ref="discountChartRef"></div>
  </StatsChartCard>

  <!-- 3. 购书花费时间趋势（折线/柱状） -->
  <StatsChartCard
    v-if="visible"
    title="购书花费时间趋势"
    tag-label="🏷️ 价格"
    tag-class="card-title-tag--price"
    subtitle="按时间粒度展示购书金额变化"
    card-class="card--price"
    :settings-open="openMenu === 'priceTrend'"
    settings-title="购书花费时间趋势 - 设置"
    @toggle-settings="toggleMenu('priceTrend', $event)"
  >
    <template #settings>
      <div class="settings-section">
        <div class="settings-section-title">时间粒度</div>
        <div class="settings-options">
          <button
            v-for="opt in PRICE_TREND_GRANULARITY_OPTIONS"
            :key="opt.value"
            :class="['settings-opt', { active: priceStatsComposable.priceTrendGranularity.value === opt.value }]"
            @click="priceStatsComposable.priceTrendGranularity.value = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>
      <TimeRangeSection :timeRange="timeRange" />
      <div class="settings-section">
        <div class="settings-section-title">价格口径</div>
        <div class="settings-options">
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceType.value === 'paid' }]"
            @click="priceStatsComposable.priceType.value = 'paid'"
          >实际价格</button>
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceType.value === 'standard' }]"
            @click="priceStatsComposable.priceType.value = 'standard'"
          >标准价格</button>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">图表类型</div>
        <div class="settings-options">
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceTrendChartType.value === 'bar' }]"
            @click="priceStatsComposable.priceTrendChartType.value = 'bar'"
          >柱状图</button>
          <button
            :class="['settings-opt', { active: priceStatsComposable.priceTrendChartType.value === 'line' }]"
            @click="priceStatsComposable.priceTrendChartType.value = 'line'"
          >折线图</button>
        </div>
      </div>
      <div v-if="priceStatsComposable.priceTrendChartType.value === 'bar'" class="settings-section">
        <div class="settings-section-title">数据表格设置</div>
        <label class="settings-checkbox-row">
          <input
            type="checkbox"
            :checked="priceStatsComposable.priceTrendShowGridLines.value"
            @change="onGridLinesChange"
          />
          <span class="settings-checkbox-label">显示网格线（横向+纵向）</span>
        </label>
      </div>
      <div class="settings-section">
        <CardOpacityControl :modelValue="settings.cardOpacity.value" @update:modelValue="settings.setCardOpacity" />
      </div>
    </template>
    <div class="chart-container" ref="priceTrendChartRef"></div>
  </StatsChartCard>
</template>

<script setup lang="ts">
/**
 * PriceStatsSection.vue
 *
 * 依赖:
 * - useTimeRange
 * - useStatsSettings
 * - usePriceStats
 */
import { ref, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue';
import * as echarts from 'echarts';
import StatsChartCard from '../StatsChartCard.vue';
import CardOpacityControl from '../../CardOpacityControl.vue';
import TimeRangeSection from '../TimeRangeSection.vue';
import type { useTimeRange } from '../../../composables/useTimeRange';
import type { useStatsSettings } from '../../../composables/useStatsSettings';
import {
  usePriceStats,
  TAG_COUNT_OPTIONS,
  PRICE_TREND_GRANULARITY_OPTIONS,
  MAX_TAG_COUNT,
} from '../../../composables/usePriceStats';

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

function toggleMenu(id: string, v: boolean) {
  if (v) {
    props.onToggleMenu(id);
  } else {
    props.onCloseMenu(id, v);
  }
}

const priceStatsComposable = usePriceStats(props.timeRange);
const { priceStats, priceTrendStats } = priceStatsComposable;

const priceCategoryChartRef = ref<HTMLElement | null>(null);
const discountChartRef = ref<HTMLElement | null>(null);
const priceTrendChartRef = ref<HTMLElement | null>(null);

const priceCategoryChart = ref<any>(null);

function onCustomTagCountChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) priceStatsComposable.priceTagCustomCount.value = v;
}

function onSpecificTagSearchChange(e: Event) {
  priceStatsComposable.priceSpecificTagSearch.value = (e.target as HTMLInputElement).value;
  priceStatsComposable.onSpecificTagSearchInput();
}

function onSpecificTagModeChange(e: Event) {
  priceStatsComposable.priceSpecificTagMode.value = (e.target as HTMLInputElement).checked;
}

function onExcludeZeroChange(e: Event) {
  priceStatsComposable.excludeZeroPaid.value = (e.target as HTMLInputElement).checked;
}

function onGridLinesChange(e: Event) {
  priceStatsComposable.priceTrendShowGridLines.value = (e.target as HTMLInputElement).checked;
}

/** 购书花费分类（嵌套饼图） */
function renderPriceCategoryChart(forceRecreate = false) {
  const el = priceCategoryChartRef.value;
  if (!el) return;
  const { groupAgg, tagAgg, typeAgg, totalPaid, totalStandard, savings } = priceStats.value;
  const priceType = priceStatsComposable.priceType.value;
  const isTagMode = priceStatsComposable.priceCategoryMode.value === 'tag';
  const palette = ['#ff6b35', '#4caf50', '#2196f3', '#9c27b0', '#ffc107', '#e91e63', '#00bcd4', '#8bc34a', '#ff9800', '#795548', '#607d8b', '#cddc39'];
  const topLimit = priceStatsComposable.getMaxTagCount();
  const agg = isTagMode ? tagAgg : groupAgg;
  const seriesName = isTagMode ? '按标签' : '按分组';

  // 排序 + 取 top
  const sorted = Object.entries(agg)
    .map(([k, v]: [string, any]) => ({ name: k, value: Number(v.value) || 0, count: v.count || 0 }))
    .sort((a, b) => b.value - a.value);
  const ungroupedItem = sorted.find(d => d.name === '未分组');
  let top: typeof sorted = [];
  for (let i = 0; i < Math.min(topLimit - (ungroupedItem && ungroupedItem.value > 0 ? 1 : 0), sorted.length); i++) {
    if (sorted[i].name === '未分组') continue;
    top.push(sorted[i]);
  }
  if (top.length < topLimit) {
    const rest = sorted.filter(d => !top.includes(d) && d.name !== '未分组');
    const sumRest = rest.reduce((s, x) => s + x.value, 0);
    const countRest = rest.reduce((s, x) => s + x.count, 0);
    if (rest.length > 0) {
      top.push({ name: `其他(${rest.length}类)`, value: Math.round(sumRest * 100) / 100, count: countRest });
    }
  }
  if (ungroupedItem && ungroupedItem.value > 0) {
    top.push(ungroupedItem);
  }

  // 特定标签模式
  if (isTagMode && priceStatsComposable.priceSpecificTagMode.value && priceStatsComposable.priceSpecificTagSelected.value.length > 0) {
    const selectedSet = new Set(priceStatsComposable.priceSpecificTagSelected.value);
    const specificItems: typeof top = [];
    for (const t of priceStatsComposable.priceSpecificTagSelected.value) {
      const found = sorted.find(d => d.name === t);
      if (found) {
        specificItems.push({ ...found });
      } else {
        specificItems.push({ name: t, value: 0, count: 0 });
      }
    }
    const ungroupedSelected: typeof top = [];
    if (ungroupedItem && ungroupedItem.value > 0 && !selectedSet.has('未分组')) {
      ungroupedSelected.push(ungroupedItem);
    }
    const usedSlots = specificItems.length + ungroupedSelected.length;
    const remainingSlots = Math.max(0, topLimit - usedSlots);
    const usedNames = new Set([
      ...priceStatsComposable.priceSpecificTagSelected.value,
      ...ungroupedSelected.map(x => x.name),
    ]);
    const autoFillItems = sorted
      .filter(d => !usedNames.has(d.name))
      .slice(0, remainingSlots);
    top = [...specificItems, ...autoFillItems, ...ungroupedSelected];
  }

  const data = top
    .filter(d => d.value > 0)
    .map((d, i) => ({
      name: d.name,
      value: d.value,
      itemStyle: { color: palette[i % palette.length] },
    }));

  const typeData = [
    { name: '电子书', value: Math.round(typeAgg['电子书'].spent * 100) / 100, itemStyle: { color: '#4caf50' } },
    { name: '纸质书', value: Math.round(typeAgg['纸质书'].spent * 100) / 100, itemStyle: { color: '#ff6b35' } },
  ].filter(d => d.value > 0);

  const option = {
    color: palette,
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const isInnerRing = params.seriesName === '按载体';
        const datum = top.find(d => d.name === params.name);
        const typeDatum = (typeAgg as any)?.[params.name];
        const count = isInnerRing
          ? (typeDatum?.count ?? 0)
          : (datum ? datum.count : 0);
        const valueText = isInnerRing
          ? `¥${Number(params.value).toFixed(2)}`
          : isTagMode && datum && datum.value < 10
            ? `¥${datum.value.toFixed(2)}（按标签分摊）`
            : datum
              ? `¥${datum.value.toFixed(2)}`
              : `¥${Number(params.value).toFixed(2)}`;
        return `${params.seriesName}<br/>${params.marker} ${params.name}<br/>花费: ${valueText}<br/>占比: ${params.percent}%<br/>${isTagMode ? '涉及册数' : '册数'}: ${count}`;
      },
    },
    legend: { type: 'scroll', orient: 'vertical', right: 10, top: 'middle', textStyle: { fontSize: 11, color: '#666' } },
    series: [
      { name: '按载体', type: 'pie', radius: ['0%', '38%'], center: ['38%', '50%'], avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false }, data: typeData },
      { name: seriesName, type: 'pie', radius: ['50%', '72%'], center: ['38%', '50%'], minAngle: 8, minShowLabelAngle: 0, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 }, label: { show: true, formatter: '{b}\n¥{c|{c}}', rich: { c: { color: '#333', fontSize: 10, fontWeight: 600 } } }, labelLine: { length: 8, length2: 8 }, data: data },
    ],
  };

  if (forceRecreate || !priceCategoryChart.value) {
    if (priceCategoryChart.value) {
      priceCategoryChart.value.dispose();
    }
    const existing = echarts.getInstanceByDom(el);
    if (existing) existing.dispose();
    priceCategoryChart.value = markRaw(echarts.init(el));
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
    nextTick(() => priceCategoryChart.value && priceCategoryChart.value.resize());
  } else if (priceCategoryChart.value) {
    try {
      priceCategoryChart.value.setOption(option, true);
    } catch (e) {
      console.error('[购书花费分类] setOption error:', e);
    }
  }
}

/** 购书折扣对比（双环玫瑰图） */
function renderDiscountChart(forceRecreate = false) {
  const el = discountChartRef.value;
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(el);
    chart = (echarts as any).init(el);
  }
  const { totalPaid, totalStandard, savings, typeAgg } = priceStats.value;

  const standardData = [
    { name: '实付', value: Math.round(totalPaid * 100) / 100, itemStyle: { color: '#ff6b35' } },
    { name: '省下', value: Math.round(savings * 100) / 100, itemStyle: { color: '#4caf50' } },
  ];

  const innerData = [
    { name: '电子书实付', value: Math.round(typeAgg['电子书'].spent * 100) / 100, itemStyle: { color: '#66bb6a' } },
    { name: '纸质书实付', value: Math.round(typeAgg['纸质书'].spent * 100) / 100, itemStyle: { color: '#ff8a65' } },
  ].filter(d => d.value > 0);

  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}<br/>金额: ¥{c}<br/>占比: {d}%' },
    legend: { bottom: 10, left: 'center', textStyle: { fontSize: 12, color: '#666' } },
    title: {
      text: `实付占比\n${totalStandard > 0 ? Math.round((totalPaid / totalStandard) * 100) : 0}%`,
      left: '50%', top: '46%',
      textAlign: 'center', textStyle: { color: '#333', fontSize: 14, fontWeight: 600, lineHeight: 18 },
    },
    series: [
      { name: '外环：标准价', type: 'pie', radius: ['52%', '78%'], center: ['50%', '50%'], avoidLabelOverlap: true, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 }, label: { show: true, position: 'outside', formatter: '{b}\n¥{c}', fontSize: 11 }, data: standardData },
      { name: '内环：实付价（按载体）', type: 'pie', radius: ['20%', '45%'], center: ['50%', '50%'], avoidLabelOverlap: true, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 }, label: { show: true, position: 'inside', formatter: '{b}\n¥{c}', fontSize: 10 }, data: innerData },
    ],
  });
}

/** 购书花费时间趋势 */
function renderPriceTrendChart(forceRecreate = false) {
  const el = priceTrendChartRef.value;
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) as any;
  if (forceRecreate || !chart) {
    echarts.dispose(el);
    chart = (echarts as any).init(el);
  }
  const { buckets, granularity } = priceTrendStats.value;
  const chartType = priceStatsComposable.priceTrendChartType.value;
  const showGrid = priceStatsComposable.priceTrendShowGridLines.value;
  const labels = buckets.map(b => b.label);
  const values = buckets.map(b => Math.round(b.total * 100) / 100);

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0];
        const idx = p.dataIndex;
        const b = buckets[idx];
        if (!b) return '';
        return `${b.label}<br/>总金额: ¥${b.total.toFixed(2)}<br/>册数: ${b.count}`;
      },
    },
    grid: { top: 30, left: 60, right: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 10, color: '#666' },
      axisLine: { lineStyle: { color: '#e0e0e0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#666', formatter: '¥{value}' },
      splitLine: { lineStyle: { type: showGrid ? 'dashed' : 'solid', color: '#eee' } },
    },
    series: [{
      data: values,
      type: chartType,
      smooth: chartType === 'line',
      barWidth: '55%',
      itemStyle: {
        color: chartType === 'line' ? '#ff6b35' : {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#ff8a5b' },
            { offset: 1, color: '#ff6b35' },
          ],
        },
        borderRadius: chartType === 'bar' ? [4, 4, 0, 0] : 0,
      },
      label: { show: true, position: 'top', fontSize: 10, color: '#666', formatter: (p: any) => `¥${Number(p.value).toFixed(0)}` },
    }],
  });
}

function initAllCharts() {
  renderPriceCategoryChart(true);
  renderDiscountChart(true);
  renderPriceTrendChart(true);
}

function disposeAllCharts() {
  if (priceCategoryChart.value) {
    priceCategoryChart.value.dispose();
    priceCategoryChart.value = null;
  }
  if (priceCategoryChartRef.value) echarts.dispose(priceCategoryChartRef.value);
  if (discountChartRef.value) echarts.dispose(discountChartRef.value);
  if (priceTrendChartRef.value) echarts.dispose(priceTrendChartRef.value);
}

defineExpose({ initAllCharts, disposeAllCharts });

// 监听分类模式、口径、标签模式变化
watch(() => priceStatsComposable.priceCategoryMode.value, async () => {
  if (props.visible) {
    await nextTick();
    renderPriceCategoryChart(false);
  }
});
watch(() => priceStatsComposable.priceType.value, async () => {
  if (props.visible) {
    await nextTick();
    renderPriceCategoryChart(false);
    renderPriceTrendChart(false);
  }
});
watch(() => [priceStatsComposable.priceTagCountPreset.value, priceStatsComposable.priceTagCustomCount.value, priceStatsComposable.priceSpecificTagMode.value, priceStatsComposable.priceSpecificTagSelected.value.length], async () => {
  if (props.visible && priceStatsComposable.priceCategoryMode.value === 'tag') {
    await nextTick();
    renderPriceCategoryChart(false);
  }
});

// 时间趋势
watch(() => priceStatsComposable.priceTrendGranularity.value, async () => {
  if (props.visible) {
    await nextTick();
    renderPriceTrendChart(false);
  }
});
watch(() => priceStatsComposable.priceTrendChartType.value, async () => {
  if (props.visible) {
    await nextTick();
    renderPriceTrendChart(false);
  }
});
watch(() => priceStatsComposable.priceTrendShowGridLines.value, async () => {
  if (props.visible) {
    await nextTick();
    renderPriceTrendChart(false);
  }
});

watch(() => props.visible, async (v) => {
  await nextTick();
  if (v) initAllCharts();
  else disposeAllCharts();
}, { immediate: false });

onMounted(async () => {
  // 加载分组
  await priceStatsComposable.loadGroups();
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
  flex: 1 1 auto;
  min-height: 0;
}

.chart-container--tall {
  height: 100%;
  flex: 1 1 auto;
}

.price-charts-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
  flex-wrap: wrap;
  height: 100%;
  min-height: 320px;
}

.price-chart-col {
  flex: 1 1 320px;
  min-width: 280px;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.discount-summary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(255, 138, 91, 0.05) 0%, rgba(255, 107, 53, 0.05) 100%);
  border-radius: 8px;
  height: 100%;
}

.summary-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }
}

.summary-label {
  font-size: 12px;
  color: #666;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.summary-item--paid .summary-value {
  color: #ff6b35;
}

.summary-item--saved .summary-value {
  color: #4caf50;
}

.summary-percent {
  font-size: 12px;
  color: #4caf50;
  margin-left: 4px;
}

.chart-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  text-align: center;
  padding: 24px;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
  color: #555;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  max-width: 360px;
}

.mode-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
  padding: 6px 0;
}

.mode-hint-icon {
  font-size: 14px;
}

/* 特定标签相关 */
.specific-tag-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.specific-tag-candidates,
.specific-tag-selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.specific-tag-chip {
  padding: 3px 8px;
  font-size: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;

  &:hover {
    background: #ff6b35;
    color: #fff;
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.specific-tag-chip--selected {
  background: #ff6b35;
  color: #fff;

  &:hover {
    background: #e55a2b;
  }
}

.specific-tag-selected-label {
  font-size: 12px;
  color: #666;
}

.specific-tag-empty,
.specific-tag-hint {
  font-size: 11px;
  color: #999;
}

.settings-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
}

.settings-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.settings-opt {
  padding: 4px 10px;
  border: 1px solid #ddd;
  background: #fff;
  color: #555;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.settings-opt:hover {
  border-color: #ff8a5b;
  color: #ff6b35;
}

.settings-opt.active {
  background: linear-gradient(135deg, #ff8a5b 0%, #ff6b35 100%);
  color: #fff;
  border-color: #ff6b35;
}

.settings-custom-range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.settings-date-input {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  color: #333;
  background: #fff;
}

.settings-range-sep {
  font-size: 12px;
  color: #999;
}
</style>
