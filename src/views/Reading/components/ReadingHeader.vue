<template>
  <div class="reading-header">
    <!-- 顶部搜索栏 -->
    <div class="header">
      <div class="search-bar" @click="handleSearch">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <span>搜索书籍、书摘...</span>
      </div>
    </div>

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
import { useRouter } from 'vue-router';

// Tab配置
interface Tab {
  key: string;
  label: string;
}

const router = useRouter();

// Props
interface Props {
  modelValue: string;
  tabs?: Tab[];
}

withDefaults(defineProps<Props>(), {
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

// 处理搜索
const handleSearch = () => {
  router.push('/search');
};

// 处理Tab切换
const handleTabChange = (tabKey: string) => {
  emit('update:modelValue', tabKey);
};
</script>

<style scoped lang="scss">
.reading-header {
  width: 100%;
}

.header {
  padding: 12px 16px;
  background-color: var(--color-background);

  .search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: var(--color-input-background);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--color-input-background-hover);
    }

    .search-icon {
      width: 20px;
      height: 20px;
      fill: var(--color-text-secondary);
    }

    span {
      font-size: 14px;
      color: var(--color-text-secondary);
    }
  }
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
