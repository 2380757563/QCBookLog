<!--
  TimeRangeSection.vue
  时间范围设置 section（用于统计页各种图表的设置面板中）

  职责:
  - 渲染时间范围选择按钮组（全部时间 / 近 N 个月 / 本年 / 自定义）
  - 自定义模式下显示日期范围选择器
  - 由父组件传入 timeRange composable 实例管理状态
-->
<template>
  <div class="settings-section">
    <div class="settings-section-title">时间范围</div>
    <div class="settings-options">
      <button
        v-for="opt in TIME_RANGE_OPTIONS"
        :key="opt.value"
        :class="['settings-opt', { active: timeRange.globalTimeRange.value === opt.value }]"
        @click="timeRange.selectTimeRange(opt.value)"
      >{{ opt.label }}</button>
    </div>
    <div v-if="timeRange.globalTimeRange.value === 'custom'" class="settings-custom-range">
      <input
        type="date"
        :value="timeRange.customStartDate.value"
        @input="onStartChange"
        :max="timeRange.customEndDate.value || timeRange.todayStr"
        class="settings-date-input"
      />
      <span class="settings-range-sep">至</span>
      <input
        type="date"
        :value="timeRange.customEndDate.value"
        @input="onEndChange"
        :min="timeRange.customStartDate.value"
        :max="timeRange.todayStr"
        class="settings-date-input"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TimeRangeSection.vue
 * 接收 timeRange composable 实例
 */
import { TIME_RANGE_OPTIONS } from '../../composables/useTimeRange';
import type { useTimeRange } from '../../composables/useTimeRange';

const props = defineProps<{
  timeRange: ReturnType<typeof useTimeRange>;
}>();

function onStartChange(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  props.timeRange.customStartDate.value = v;
}

function onEndChange(e: Event) {
  const v = (e.target as HTMLInputElement).value;
  props.timeRange.customEndDate.value = v;
}
</script>

<style scoped>
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
