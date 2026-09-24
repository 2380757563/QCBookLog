<!-- 人物标签：AI 提炼的年度阅读人格 -->
<template>
  <SectionShell
    :index="9"
    title="人物标签"
    caption="AI 依据全年数据提炼"
    anchor="persona"
    :empty="empty"
  >
    <div v-if="tags.length" class="persona">
      <div v-for="(tag, i) in tags" :key="`${tag.label}-${i}`" class="persona__card">
        <span class="persona__label">{{ tag.label }}</span>
        <p class="persona__reason">{{ tag.reason }}</p>
      </div>
    </div>

    <p v-else class="persona-empty">今年的数据还不足以提炼出稳定的人格标签。</p>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext } from '../../composables/useReportContext';

const ctx = useReportContext();

const tags = computed<{ label: string; reason: string }[]>(() => {
  const raw = ctx.narrative.value.persona;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t: any) => t && (t.label || t.reason))
    .map((t: any) => ({ label: String(t.label || '').trim(), reason: String(t.reason || '').trim() }))
    .filter(t => t.label)
    .slice(0, 6);
});

const empty = computed(() => tags.value.length === 0);
</script>

<style scoped>
.persona {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.persona__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 10px;
  background: linear-gradient(140deg, rgba(201, 162, 39, 0.1), rgba(255, 253, 247, 0.85));
  border: 1px solid rgba(201, 162, 39, 0.26);
}

.persona__label {
  display: inline-block;
  align-self: flex-start;
  padding: 3px 14px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #8c6239;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 999px;
}

.persona__reason {
  margin: 0;
  font-size: 13px;
  line-height: 1.85;
  color: #6b5c47;
}

.persona-empty {
  margin: 0;
  font-size: 14px;
  color: #a99983;
}

@media (max-width: 640px) {
  .persona {
    grid-template-columns: 1fr;
  }
}
</style>
