<template>
  <div class="reading-header">
    <!-- 总览页面不需要顶部搜索框（搜索是书库页面专用入口），已移除 -->
    <!-- Tab导航 -->
    <div class="tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { active: modelValue === tab.key }]"
        @click="handleTabChange(tab.key)"
      >
        {{ tab.label }}
      </div>
      <!-- 底部滑动指示器 -->
      <div
        class="tab-indicator"
        :style="indicatorStyle"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 总览页面顶部不再有搜索框，原 handleSearch 已移除。
// 搜索入口仅在书库（/book）页面提供。

import { computed } from 'vue';

interface Tab {
  key: string;
  label: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  tabs?: Tab[];
}>(), {
  tabs: () => [
    { key: 'reading', label: '在读' },
    { key: 'timeline', label: '时间线' },
    { key: 'stats', label: '统计' }
  ]
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// 当前激活 tab 的索引
const activeIndex = computed(() => {
  const idx = props.tabs.findIndex(tab => tab.key === props.modelValue);
  return idx < 0 ? 0 : idx;
});

// 指示器样式：宽度按 tab 数量均分，水平位移按索引
const indicatorStyle = computed(() => {
  const widthPercent = 100 / props.tabs.length;
  return {
    width: `${widthPercent}%`,
    transform: `translateX(${activeIndex.value * 100}%)`
  };
});

// 处理Tab切换
const handleTabChange = (tabKey: string) => {
  emit('update:modelValue', tabKey);
};
</script>

<style scoped lang="scss">
.reading-header {
  width: 100%;
}

.tabs {
  display: flex;
  align-items: center;
  gap: 0;
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  position: relative;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    font-size: 15px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: color 0.25s ease;
    position: relative;
    font-weight: 400;

    &.active {
      color: var(--primary-color);
      font-weight: 600;
    }

    &:hover:not(.active) {
      color: var(--primary-color);
    }
  }

  // 底部滑动指示器
  .tab-indicator {
    position: absolute;
    bottom: -1px;
    left: 0;
    height: 3px;
    background-color: var(--primary-color);
    border-radius: 3px 3px 0 0;
    box-shadow:
      0 -2px 6px rgba(255, 107, 53, 0.45),
      0 0 12px rgba(255, 107, 53, 0.25);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    will-change: transform;
  }
}
</style>
