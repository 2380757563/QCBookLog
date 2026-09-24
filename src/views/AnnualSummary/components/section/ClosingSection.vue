<!-- 结语寄语 -->
<template>
  <SectionShell :index="10" title="结语" anchor="closing">
    <p class="closing-text">{{ text }}</p>
    <div class="closing-seal">
      <span class="closing-seal__mark">{{ report.stats?.year || '' }}</span>
      <span class="closing-seal__text">读书记录</span>
    </div>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext } from '../../composables/useReportContext';

const ctx = useReportContext();
const report = ctx.report;
const text = computed(() => ctx.narrative.value.closing || '');
</script>

<style scoped>
.closing-text {
  margin: 0 0 30px;
  font-size: 16px;
  line-height: 2.2;
  letter-spacing: 0.02em;
  color: #4a3d2f;
  text-indent: 2em;
}

.closing-seal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 96px;
  margin: 0 auto;
  padding: 14px 0;
  border: 2px solid rgba(178, 58, 58, 0.62);
  border-radius: 6px;
  color: rgba(178, 58, 58, 0.86);
}

.closing-seal__mark {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.closing-seal__text {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-indent: 0.22em;
}
</style>
