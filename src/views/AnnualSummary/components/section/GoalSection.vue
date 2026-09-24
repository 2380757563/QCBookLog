<!-- 目标篇：阅读目标完成度 -->
<template>
  <SectionShell
    :index="8"
    title="目标篇"
    :caption="caption"
    anchor="goals"
    :empty="empty"
  >
    <p class="narrative">{{ text }}</p>

    <div v-if="hasGoal" class="goal">
      <div class="goal__numbers">
        <span class="goal__done">{{ goals.completed || 0 }}</span>
        <span class="goal__slash">/</span>
        <span class="goal__target">{{ goals.target || 0 }}</span>
        <span class="goal__unit">本</span>
      </div>

      <div class="goal__bar">
        <div class="goal__bar-fill" :style="{ width: `${percent}%` }"></div>
      </div>

      <div class="goal__meta">
        <span class="goal__percent">完成 {{ percent }}%</span>
        <span v-if="goals.achieved" class="goal__badge goal__badge--done">已达成</span>
        <span v-else class="goal__badge">继续加油</span>
      </div>
    </div>

    <div v-else class="goal-empty">这一年没有设定阅读目标，随心而读也是一种方式。</div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext } from '../../composables/useReportContext';

const ctx = useReportContext();

const goals = computed(() => ctx.section('goals') ?? {});
const text = computed(() => ctx.text('goals'));

const hasGoal = computed(() => !!goals.value.hasGoal && Number(goals.value.target) > 0);
const empty = computed(() => !hasGoal.value);

const percent = computed(() => {
  const raw = Number(goals.value.progressPercent);
  if (isFinite(raw) && raw > 0) return Math.min(100, Math.round(raw));
  const target = Number(goals.value.target) || 0;
  if (!target) return 0;
  return Math.min(100, Math.round(((Number(goals.value.completed) || 0) / target) * 100));
});

const caption = computed(() =>
  hasGoal.value ? `${goals.value.completed || 0} / ${goals.value.target || 0} 本` : ''
);
</script>

<style scoped>
.narrative {
  margin: 0 0 24px;
  text-indent: 2em;
}

.goal {
  padding: 22px 24px;
  border-radius: 10px;
  background: rgba(255, 253, 247, 0.78);
  border: 1px solid rgba(201, 162, 39, 0.24);
}

.goal__numbers {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 16px;
  font-family: Georgia, 'Times New Roman', serif;
}

.goal__done {
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  color: #8c6239;
}

.goal__slash {
  font-size: 22px;
  color: #c9bfae;
}

.goal__target {
  font-size: 22px;
  color: #a9927d;
}

.goal__unit {
  margin-left: 4px;
  font-size: 13px;
  color: #9c8b73;
}

.goal__bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(201, 191, 174, 0.4);
  overflow: hidden;
}

.goal__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d8b64a, #a98a2b);
}

.goal__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
  color: #8c7a63;
}

.goal__badge {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(201, 191, 174, 0.32);
  color: #8c7a63;
}

.goal__badge--done {
  background: rgba(201, 162, 39, 0.16);
  color: #8c6239;
}

.goal-empty {
  padding: 20px 22px;
  border-radius: 10px;
  background: rgba(255, 253, 247, 0.6);
  border: 1px dashed rgba(201, 191, 174, 0.8);
  font-size: 14px;
  color: #a99983;
}
</style>
