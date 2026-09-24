<!-- 卷首语 -->
<template>
  <SectionShell title="卷首语" anchor="opening">
    <p class="opening-text">{{ text }}</p>
  </SectionShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SectionShell from './SectionShell.vue';
import { useReportContext } from '../../composables/useReportContext';

const ctx = useReportContext();
const text = computed(() => ctx.narrative.value.opening || '');
</script>

<style scoped>
.opening-text {
  margin: 0;
  font-size: 17px;
  line-height: 2.3;
  letter-spacing: 0.02em;
  color: #4a3d2f;
  text-indent: 2em;
}
</style>
