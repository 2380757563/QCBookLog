<template>
  <div class="settings-section">
    <div class="settings-section-title">
      卡片透明度
      <span class="settings-section-value">{{ modelValue }}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      :value="modelValue"
      @input="onInput"
      class="settings-range-slider"
      :style="sliderStyle"
      aria-label="卡片透明度"
    />
    <div class="settings-range-hint">拖动滑块调整设置卡片的背景透明度：0% 完全透明可看背后的图表，100% 不透明</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void;
}>();

const onInput = (e: Event) => {
  const t = e.target as HTMLInputElement;
  const n = Number(t.value);
  if (!Number.isFinite(n)) return;
  emit('update:modelValue', Math.max(0, Math.min(100, Math.round(n))));
};

const sliderStyle = computed(() => ({
  '--slider-progress': `${props.modelValue}%`
}));
</script>

<style scoped>
.settings-section-title {
  display: flex;
  align-items: center;
}

.settings-section-value {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.settings-range-slider {
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, #ff6b35 0%, #ff6b35 var(--slider-progress, 100%), #e8e8e8 var(--slider-progress, 100%), #e8e8e8 100%);
  border-radius: 2px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  margin: 6px 0 4px 0;
}

.settings-range-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff6b35;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.settings-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.4);
}

.settings-range-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff6b35;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.settings-range-hint {
  font-size: 11px;
  color: var(--text-tertiary, #999);
  line-height: 1.5;
  margin-top: 4px;
}
</style>
