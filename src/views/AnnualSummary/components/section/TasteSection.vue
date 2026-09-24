<!-- 品味画像：标签云 / 作者 / 出版社 / 装帧分布环形图 -->
<template>
  <SectionShell
    :index="5"
    title="品味画像"
    :caption="caption"
    anchor="taste"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div v-if="topTags.length" class="tag-cloud">
      <span
        v-for="(tag, i) in topTags"
        :key="tag.name"
        class="cloud-tag"
        :class="`cloud-tag--${Math.min(i, 4)}`"
      >
        {{ tag.name }}<em>{{ tag.count }}</em>
      </span>
    </div>

    <figure v-if="bindingData.length" class="chart-block">
      <figcaption class="chart-block__caption">装帧分布</figcaption>
      <div ref="chartEl" class="chart chart--donut" data-chart="binding-dist"></div>
    </figure>

    <div class="rank-columns">
      <div v-if="topAuthors.length" class="rank">
        <div class="rank__caption">常读作者</div>
        <ol class="rank__list">
          <li v-for="(row, i) in topAuthors" :key="row.name" class="rank__item">
            <span class="rank__index">{{ i + 1 }}</span>
            <span class="rank__name">{{ row.name }}</span>
            <span class="rank__count">{{ row.count }}</span>
          </li>
        </ol>
      </div>

      <div v-if="topPublishers.length" class="rank">
        <div class="rank__caption">常读出版社</div>
        <ol class="rank__list">
          <li v-for="(row, i) in topPublishers" :key="row.name" class="rank__item">
            <span class="rank__index">{{ i + 1 }}</span>
            <span class="rank__name">{{ row.name }}</span>
            <span class="rank__count">{{ row.count }}</span>
          </li>
        </ol>
      </div>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, isMeaningfulBlock } from '../../composables/useReportContext';
import { useReportChart } from '../../composables/useReportChart';

const ctx = useReportContext();
const { render, dispose } = useReportChart();

const chartEl = ref<HTMLElement | null>(null);

const taste = computed(() => ctx.section('taste') ?? {});
const text = computed(() => ctx.text('taste'));
const empty = computed(() => !isMeaningfulBlock(taste.value));

const pickRows = (key: string, limit: number) => {
  const raw = taste.value[key];
  return Array.isArray(raw) ? raw.slice(0, limit) : [];
};

const topTags = computed(() => pickRows('topTags', 12));
const topAuthors = computed(() => pickRows('topAuthors', 6));
const topPublishers = computed(() => pickRows('topPublishers', 6));

const bindingDist = computed<{ name: string; count: number }[]>(() => {
  const binding = ctx.section('binding');
  const raw = binding?.bindingDist;
  return Array.isArray(raw) ? raw.filter(r => r && r.count > 0) : [];
});

const bindingData = computed(() => bindingDist.value);

const caption = computed(() => (topTags.value.length ? `${topTags.value.length} 个高频标签` : ''));

onMounted(async () => {
  if (!bindingData.value.length) return;
  await nextTick();
  const total = bindingData.value.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
  render(chartEl, {
    kind: 'donut',
    unit: '本',
    centerText: String(total),
    centerSubText: '册藏书',
    data: bindingData.value.map(r => ({ name: r.name, value: Number(r.count) || 0 })),
    emptyText: '暂无装帧数据'
  });
});

onBeforeUnmount(() => dispose());
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 14px;
  margin-bottom: 26px;
}

.cloud-tag {
  color: #6b5c47;
  line-height: 1.2;
}

.cloud-tag em {
  margin-left: 5px;
  font-style: normal;
  font-size: 0.68em;
  color: #c9a227;
}

.cloud-tag--0 {
  font-size: 24px;
  font-weight: 700;
  color: #2b2118;
}

.cloud-tag--1 {
  font-size: 20px;
  font-weight: 600;
  color: #4a3d2f;
}

.cloud-tag--2 {
  font-size: 17px;
}

.cloud-tag--3 {
  font-size: 15px;
  color: #8c7a63;
}

.cloud-tag--4 {
  font-size: 13px;
  color: #9c8b73;
}

.chart-block {
  margin: 0 0 26px;
}

.chart-block__caption {
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #9c8b73;
}

.chart {
  width: 100%;
  height: 300px;
}

/* 环形图需要比柱状图更高的画布。
   外圈标签沿半径方向向外延伸，且 label 在容器底部还有一层 legend，
   高度不足时标签会被 avoidLabelOverlap 压到贴在容器下沿、视觉上与
   下方「常读作者」表格重叠。配合 useReportChart 中 56% 的外径
   （0.38H + 0.56H + legend 24px ≤ H），此处至少需 400px。 */
.chart--donut {
  height: 400px;
}

.rank-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
}

.rank__caption {
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #9c8b73;
}

.rank__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rank__item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed rgba(201, 191, 174, 0.5);
}

.rank__item:last-child {
  border-bottom: none;
}

.rank__index {
  font-family: Georgia, serif;
  font-size: 12px;
  color: #c9a227;
}

.rank__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #2b2118;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank__count {
  font-family: Georgia, serif;
  font-size: 13px;
  color: #8c6239;
}

@media (max-width: 640px) {
  .rank-columns {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
