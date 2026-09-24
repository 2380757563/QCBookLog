<!-- 买书篇：藏书 / 月度购入柱状图 / 来源分布 -->
<template>
  <SectionShell
    :index="1"
    title="买书篇"
    :caption="`共 ${collection.purchasedCount || 0} 本`"
    anchor="buying"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div class="metrics">
      <div class="metric">
        <span class="metric__value">{{ collection.purchasedCount || 0 }}</span>
        <span class="metric__label">本年购入</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ collection.libraryTotal || 0 }}</span>
        <span class="metric__label">书库藏书</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ collection.completedCount || 0 }}</span>
        <span class="metric__label">本年读完</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ collection.unreadCount || 0 }}</span>
        <span class="metric__label">待读囤书</span>
      </div>
    </div>

    <figure v-if="hasMonthly" class="chart-block">
      <figcaption class="chart-block__caption">月度购书分布</figcaption>
      <div ref="chartEl" class="chart" data-chart="monthly-purchases"></div>
    </figure>

    <ul v-if="sourceRows.length" class="tag-rows">
      <li v-for="row in sourceRows" :key="row.name" class="tag-row">
        <span class="tag-row__name">{{ row.name }}</span>
        <span class="tag-row__count">{{ row.count }}</span>
      </li>
    </ul>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, MONTHS, isMeaningfulBlock } from '../../composables/useReportContext';
import { useReportChart } from '../../composables/useReportChart';

const ctx = useReportContext();
const { render, dispose } = useReportChart();

const chartEl = ref<HTMLElement | null>(null);

const collection = computed(() => ctx.section('collection') ?? {});
const text = computed(() => ctx.text('buying'));
const empty = computed(() => !isMeaningfulBlock(collection.value));

const monthly = computed<number[]>(() => {
  const raw = collection.value.monthlyPurchases;
  return Array.isArray(raw) ? raw.map((n: any) => Number(n) || 0) : [];
});

const hasMonthly = computed(() => monthly.value.some(n => n > 0));

const sourceRows = computed<{ name: string; count: number }[]>(() => {
  const raw = collection.value.sourceDist;
  return Array.isArray(raw) ? raw.slice(0, 6) : [];
});

onMounted(async () => {
  if (!hasMonthly.value) return;
  await nextTick();
  render(chartEl, {
    kind: 'barV',
    unit: '本',
    xName: '本',
    data: MONTHS.map((name, i) => ({ name, value: monthly.value[i] ?? 0 })),
    emptyText: '本年暂无购书记录'
  });
});

onBeforeUnmount(() => dispose());
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border: 1px solid rgba(201, 162, 39, 0.25);
  border-radius: 8px;
  background: rgba(255, 253, 247, 0.7);
}

.metric__value {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: #8c6239;
}

.metric__label {
  font-size: 12px;
  color: #9c8b73;
}

.chart-block {
  margin: 0 0 20px;
}

.chart-block__caption {
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #9c8b73;
}

.chart {
  width: 100%;
  height: 220px;
}

.tag-rows {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-row {
  font-size: 13px;
  color: #6b5c47;
}

.tag-row__count {
  margin-left: 6px;
  font-family: Georgia, serif;
  color: #c9a227;
}

@media (max-width: 640px) {
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
