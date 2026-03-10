/**
 * 虚拟滚动组件
 * 用于渲染大量数据时优化性能
 */

<template>
  <div
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
  >
    <div
      class="virtual-list-phantom"
      :style="{ height: `${totalHeight}px` }"
    >
      <div
        class="virtual-list-content"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="(item, index) in visibleItems"
          :key="getItemKey(item, index)"
          :style="getItemStyle?.(item, index)"
          class="virtual-list-item"
          :class="getItemClass?.(item, index)"
          @click="handleItemClick(item, index)"
        >
          <slot :item="item" :index="index" />
        </div>
      </div>
    </div>

    <!-- 加载更多提示 -->
    <div v-if="loading && hasMore" class="virtual-list-loading">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-if="items.length === 0 && !loading" class="virtual-list-empty">
      <slot name="empty">
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>暂无数据</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface Props<T> {
  /** 数据项列表 */
  items: T[];
  /** 每项的高度（固定高度时使用） */
  itemSize?: number;
  /** 容器高度 */
  containerHeight?: string;
  /** 预渲染的额外项目数（缓冲区） */
  buffer?: number;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否还有更多数据 */
  hasMore?: boolean;
  /** 获取项目唯一标识的函数 */
  getKey?: (item: T, index: number) => string | number;
  /** 获取项目高度的函数（动态高度时使用） */
  getItemHeight?: (item: T, index: number) => number;
  /** 项目样式的自定义函数 */
  getItemStyle?: (item: T, index: number) => Record<string, any>;
  /** 项目样式的自定义类名函数 */
  getItemClass?: (item: T, index: number) => string | Record<string, any>;
  /** 每行显示的项目数（网格布局时使用） */
  itemsPerRow?: number;
  /** 布局模式：list 或 grid */
  layout?: 'list' | 'grid';
}

const props = withDefaults(defineProps<Props<T>>(), {
  itemSize: 80,
  containerHeight: '100%',
  buffer: 5,
  loading: false,
  hasMore: false,
  layout: 'list'
});

const emit = defineEmits<{
  'load-more': [];
  'item-click': [item: T, index: number];
  'scroll': [event: Event];
}>();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);

// 计算属性
const itemHeight = computed(() => {
  if (props.getItemHeight) {
    return null; // 动态高度
  }
  return props.itemSize;
});

const rowHeight = computed(() => {
  if (props.layout === 'grid' && props.itemsPerRow) {
    return props.itemSize!;
  }
  return props.itemSize!;
});

const totalHeight = computed(() => {
  if (props.getItemHeight) {
    // 动态高度：需要计算所有项目的总高度
    return props.items.reduce((sum, item, index) => {
      return sum + props.getItemHeight!(item, index);
    }, 0);
  }

  if (props.layout === 'grid' && props.itemsPerRow) {
    const totalRows = Math.ceil(props.items.length / props.itemsPerRow);
    return totalRows * rowHeight.value;
  }

  return props.items.length * itemHeight.value!;
});

const startIndex = computed(() => {
  if (itemHeight.value === null) {
    // 动态高度：需要更复杂的计算
    return calculateStartIndexDynamic();
  }

  const index = Math.floor(scrollTop.value / itemHeight.value!);
  return Math.max(0, index - props.buffer);
});

const endIndex = computed(() => {
  if (itemHeight.value === null) {
    // 动态高度
    return calculateEndIndexDynamic();
  }

  const containerHeight = containerRef.value?.clientHeight || 0;
  const index = Math.ceil((scrollTop.value + containerHeight) / itemHeight.value!);
  return Math.min(props.items.length, index + props.buffer);
});

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
  if (itemHeight.value === null) {
    // 动态高度
    return calculateOffsetYDynamic();
  }

  return startIndex.value * itemHeight.value!;
});

// 动态高度相关
const itemPositions = computed(() => {
  if (!props.getItemHeight) {
    return [];
  }

  let currentOffset = 0;
  return props.items.map((item, index) => {
    const height = props.getItemHeight!(item, index);
    const position = {
      offset: currentOffset,
      height,
      index
    };
    currentOffset += height;
    return position;
  });
});

// Methods
function getItemKey(item: T, index: number): string | number {
  if (props.getKey) {
    return props.getKey(item, index);
  }

  // 尝试获取 id 或使用索引
  if (typeof item === 'object' && item !== null && 'id' in item) {
    return (item as any).id;
  }

  return index;
}

function calculateStartIndexDynamic(): number {
  // 简化的动态高度计算
  let offset = 0;
  for (let i = 0; i < props.items.length; i++) {
    const height = props.getItemHeight!(props.items[i], i);
    if (offset + height > scrollTop.value) {
      return Math.max(0, i - props.buffer);
    }
    offset += height;
  }
  return Math.max(0, props.items.length - props.buffer);
}

function calculateEndIndexDynamic(): number {
  const containerHeight = containerRef.value?.clientHeight || 0;
  const targetScroll = scrollTop.value + containerHeight;

  let offset = 0;
  for (let i = 0; i < props.items.length; i++) {
    const height = props.getItemHeight!(props.items[i], i);
    offset += height;
    if (offset >= targetScroll) {
      return Math.min(props.items.length, i + props.buffer);
    }
  }
  return props.items.length;
}

function calculateOffsetYDynamic(): number {
  const startItem = itemPositions.value[startIndex.value];
  return startItem ? startItem.offset : 0;
}

function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
  emit('scroll', event);

  // 触发加载更多
  if (props.hasMore && !props.loading) {
    const { scrollTop, scrollHeight, clientHeight } = target;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    if (scrollBottom < 200) {
      emit('load-more');
    }
  }
}

function handleItemClick(item: T, index: number) {
  emit('item-click', item, index);
}

// Watch
watch(() => props.items, () => {
  // 当 items 变化时，重置滚动位置
  if (containerRef.value) {
    containerRef.value.scrollTop = 0;
    scrollTop.value = 0;
  }
}, { deep: true });

// Lifecycle
onMounted(() => {
  // 初始化时计算正确的滚动位置
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop;
  }
});

onUnmounted(() => {
  // 清理工作
});
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.virtual-list-phantom {
  position: relative;
  width: 100%;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}

.virtual-list-item {
  width: 100%;
}

.virtual-list-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #999;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #1a90ff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.virtual-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-state {
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* 网格布局模式 */
.virtual-list-container.grid-layout {
  display: grid;
  gap: 16px;
}
</style>
