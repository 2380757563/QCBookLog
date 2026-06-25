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
    </div>
  </div>
</template>

<script setup lang="ts">
// 总览页面顶部不再有搜索框，原 handleSearch 已移除。
// 搜索入口仅在书库（/book）页面提供。

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

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    font-size: 15px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;

    &.active {
      color: var(--color-primary);
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 3px;
        background-color: var(--color-primary);
        border-radius: 3px 3px 0 0;
      }
    }

    &:hover {
      color: var(--color-primary);
    }
  }
}
</style>
