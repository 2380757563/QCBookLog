<!--
  StatsChartCard.vue
  统计图表通用卡片外壳
  - 卡片头（tag 标签 + 标题 + 副标题）
  - 右上角 ⚙️ 设置按钮 + StackedSettingsPanel 浮层
  - 图表容器插槽

  职责: 统一所有图表卡片的布局与样式，减少各 section 中的样板代码。
-->
<template>
  <div :class="['stat-chart-card', cardClass]">
    <div class="card-header">
      <div class="card-header-left">
        <span class="card-title">
          <span :class="['card-title-tag', tagClass]">{{ tagLabel }}</span>
          <span class="card-title-sep">·</span>
          <span>{{ title }}</span>
        </span>
        <span class="card-subtitle">{{ subtitle }}</span>
      </div>
      <div v-if="showSettings" class="card-header-actions">
        <button
          class="chart-settings-btn"
          :class="{ 'is-open': settingsOpen }"
          @click.stop="emit('toggle-settings', !settingsOpen)"
          :aria-expanded="settingsOpen"
          title="图表设置"
        >⚙️</button>
        <StackedSettingsPanel
          :modelValue="settingsOpen"
          @update:modelValue="onPanelToggle"
          :title="settingsTitle"
        >
          <slot name="settings" />
        </StackedSettingsPanel>
      </div>
    </div>
    <div :class="['chart-container', tall && 'chart-container--tall']">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import StackedSettingsPanel from '../StackedSettingsPanel.vue';

const props = withDefaults(defineProps<{
  /** 图表标题（如 "装帧分布"） */
  title: string;
  /** 卡片头 tag 标签文本（如 "📚 藏书"） */
  tagLabel: string;
  /** 卡片头 tag 标签颜色 class（card-title-tag--book / --read / --bookmark / --price） */
  tagClass: string;
  /** 卡片副标题 */
  subtitle: string;
  /** 设置面板打开状态（受父组件控制） */
  settingsOpen?: boolean;
  /** 设置面板标题（默认 "标题 - 设置"） */
  settingsTitle?: string;
  /** 是否使用高一些的图表容器（chart-container--tall） */
  tall?: boolean;
  /** 是否显示右上角设置按钮（默认 true） */
  showSettings?: boolean;
  /** 卡片额外 class（用于某些特定样式，如 card--price） */
  cardClass?: string;
}>(), {
  settingsOpen: false,
  settingsTitle: '',
  tall: false,
  showSettings: true,
  cardClass: '',
});

const emit = defineEmits<{
  (e: 'toggle-settings', v: boolean): void;
}>();

function onPanelToggle(v: boolean) {
  emit('toggle-settings', v);
}
</script>

<style scoped lang="scss">
.stat-chart-card {
  /* 背景透明度由用户通过设置滑块控制（0-1） */
  background-color: rgba(255, 255, 255, var(--card-opacity, 1));
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  /* 堆叠设置面板的定位锚点（让浮层充满卡片） */
  position: relative;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

.card-header {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.card-header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chart-settings-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 107, 53, 0.08);
    color: #ff6b35;
    border-color: rgba(255, 107, 53, 0.2);
  }

  &.is-open {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.card-title-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.card-title-tag--book     { background: linear-gradient(135deg, #ff6b35, #ff9558); }
.card-title-tag--read     { background: linear-gradient(135deg, #4caf50, #6fbf73); }
.card-title-tag--bookmark { background: linear-gradient(135deg, #2196f3, #42a5f5); }
.card-title-tag--price    { background: linear-gradient(135deg, #9c27b0, #ba68c8); }

.card-title-sep {
  color: #ccc;
  font-weight: 400;
  margin: 0 2px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 4px;
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 320px;
  min-height: 320px;
  position: relative;
}

.chart-container--tall {
  height: 380px;
  min-height: 380px;
}

/* 通用设置面板内部样式（在所有使用 StatsChartCard 的子组件中复用） */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;

  & + .settings-section {
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding-top: 10px;
    margin-top: 4px;
  }
}

.settings-section-title {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.settings-custom-range {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}

.settings-date-input {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  background: #fff;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #ff6b35;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.15);
  }
}

.settings-range-sep {
  color: var(--text-secondary);
  font-size: 12px;
}

.settings-opt {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #ff6b35;
    background: rgba(255, 107, 53, 0.08);
  }

  &.active {
    background: #ff6b35;
    color: #fff;
    border-color: #ff6b35;
  }
}

.settings-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: #ff6b35;
  }
}

.settings-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
  padding: 4px 0;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: #ff6b35;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

.settings-checkbox-label {
  flex: 1;
  line-height: 1.4;
}

@media (max-width: 600px) {
  .stat-chart-card {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 10px;
  }
  .card-title {
    font-size: 13px;
  }
  .card-subtitle {
    font-size: 11px;
  }
  .chart-container {
    height: 280px;
    min-height: 280px;
  }
  .chart-container--tall {
    height: 320px;
    min-height: 320px;
  }
  .chart-settings-btn {
    width: 30px;
    height: 30px;
  }
}

@media (max-width: 400px) {
  .card-header {
    flex-wrap: wrap;
    gap: 6px;
  }
  .card-header-actions {
    margin-left: auto;
  }
  .chart-container {
    height: 240px;
    min-height: 240px;
  }
  .chart-container--tall {
    height: 280px;
    min-height: 280px;
  }
  .card-title-tag {
    font-size: 11px;
  }
}
</style>
