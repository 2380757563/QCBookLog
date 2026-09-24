<!-- 习惯篇：活跃天数 / 连续记录 / 月度热力 / 星期偏好 -->
<template>
  <SectionShell
    :index="4"
    title="习惯篇"
    :caption="caption"
    anchor="habit"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div class="metrics">
      <div class="metric">
        <span class="metric__value">{{ habit.activeDays || 0 }}</span>
        <span class="metric__label">活跃天数</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ habit.longestStreak || 0 }}</span>
        <span class="metric__label">最长连续</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ busiestMonthText }}</span>
        <span class="metric__label">最活跃月份</span>
      </div>
      <div class="metric">
        <span class="metric__value">{{ habit.favoriteWeekday || '—' }}</span>
        <span class="metric__label">常读星期</span>
      </div>
    </div>

    <div v-if="hasByMonth" class="heatmap">
      <div class="heatmap__caption">月度活跃热力</div>
      <div class="heatmap__cells">
        <div
          v-for="(cell, i) in monthCells"
          :key="i"
          class="heatmap__cell"
          :style="{ backgroundColor: cell.color }"
          :title="`${cell.name}：${cell.value} 天`"
        >
          <span class="heatmap__cell-label">{{ cell.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="bestDay" class="best-day">
      <span class="best-day__tag">最投入的一天</span>
      <span class="best-day__date">{{ bestDay.date }}</span>
      <span class="best-day__value">{{ bestDay.humanized || `${bestDay.minutes || 0} 分钟` }}</span>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext, MONTHS, isMeaningfulBlock } from '../../composables/useReportContext';

const ctx = useReportContext();

const habit = computed(() => ctx.section('habit') ?? {});
const text = computed(() => ctx.text('habit'));
const empty = computed(() => !isMeaningfulBlock(habit.value));

const byMonth = computed<number[]>(() => {
  const raw = habit.value.byMonth;
  return Array.isArray(raw) ? raw.map((n: any) => Number(n) || 0) : [];
});

const hasByMonth = computed(() => byMonth.value.some(n => n > 0));

const maxMonth = computed(() => Math.max(1, ...byMonth.value));

/** 二维热力：用透明度表示强度，导出到 PDF 时同样清晰 */
const monthCells = computed(() =>
  MONTHS.map((name, i) => {
    const value = byMonth.value[i] ?? 0;
    const ratio = value / maxMonth.value;
    return {
      name,
      value,
      color: value === 0 ? 'rgba(201, 191, 174, 0.32)' : `rgba(201, 162, 39, ${0.18 + ratio * 0.72})`
    };
  })
);

const busiestMonthText = computed(() => {
  const m = Number(habit.value.busiestMonth);
  return m >= 1 && m <= 12 ? `${m} 月` : '—';
});

const bestDay = computed(() => habit.value.bestDay || null);

const caption = computed(() => (habit.value.longestStreak ? `连续 ${habit.value.longestStreak} 天` : ''));
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
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  color: #8c6239;
}

.metric__label {
  font-size: 12px;
  color: #9c8b73;
}

.heatmap {
  margin-bottom: 22px;
}

.heatmap__caption {
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #9c8b73;
}

.heatmap__cells {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 5px;
}

.heatmap__cell {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 54px;
  padding-bottom: 4px;
  border-radius: 4px;
}

.heatmap__cell-label {
  font-size: 10px;
  color: #6b5c47;
  opacity: 0.85;
}

.best-day {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-left: 3px solid #c9a227;
  background: rgba(255, 253, 247, 0.7);
}

.best-day__tag {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: #c9a227;
}

.best-day__date {
  font-size: 14px;
  color: #2b2118;
}

.best-day__value {
  margin-left: auto;
  font-size: 14px;
  color: #8c6239;
}

@media (max-width: 640px) {
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .heatmap__cells {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
