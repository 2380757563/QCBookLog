<template>
  <!-- 分组卡 - 高度由内部 3:4 缩略图 + 52px 信息区自然决定，不再用 transform: scale -->
  <div
    :class="['book-group-card', { 'book-group-card--selected': selected, 'book-group-card--organize': isOrganizeMode }]"
    @click="handleClick"
  >
    <!-- 整理模式下的选择复选框 -->
    <div v-if="isOrganizeMode" class="group-select-checkbox">
      <svg v-if="selected" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H6v-2h3v2zm0-3H6v-2h3v2zm0-3H6V8h3v2zm7 6h-5v-2h5v2zm0-3h-5v-2h5v2zm0-3h-5V8h5v2z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      </svg>
    </div>

    <!-- 分组书籍缩略图网格 - 与 BookCard 封面同款 3:4 布局
         外层 3:4 容器 + 内层 2x2/3x3 grid，单元格天然保持 3:4，无挤压变形 -->
    <div class="book-group-card__thumbnails">
      <div class="book-group-card__thumbnails-grid" :class="`thumbnails-${displayThumbnails}`">
        <div
          v-for="(book, index) in displayBooks"
          :key="book.id"
          class="book-group-card__thumbnail"
        >
          <img
            v-if="book.coverUrl || book.path"
            :src="book.coverUrl || getBookCoverUrl(book)"
            :alt="book.title"
            class="thumbnail__image"
            loading="lazy"
            decoding="async"
            @load="handleThumbnailLoad"
            @error="handleThumbnailError($event, book)"
          />
          <div v-if="!(book.coverUrl || book.path) || thumbnailErrors[book.id]" class="thumbnail__placeholder">
            {{ book.title ? book.title.charAt(0) : '?' }}
          </div>
        </div>
        <!-- 如果书籍数量少于最大显示数量，用占位符填充 -->
        <div
          v-for="index in Math.max(0, displayThumbnails - displayBooks.length)"
          :key="`placeholder-${index}`"
          class="book-group-card__thumbnail book-group-card__thumbnail--empty"
        >
        </div>
      </div>
    </div>

    <!-- 分组信息区域 -->
    <div class="book-group-card__info">
      <template v-if="isEditing">
        <input
          ref="editInputRef"
          v-model="editingName"
          class="book-group-card__name-input"
          placeholder="输入分组名称"
          @click.stop
          @keydown.enter="handleSaveEdit"
          @keydown.escape="handleCancelEdit"
          @blur="handleSaveEdit"
        />
      </template>
      <template v-else>
        <h3
          class="book-group-card__name"
          @dblclick.stop="handleStartEdit"
          title="双击编辑名称"
        >
          {{ group.name }}
        </h3>
        <button
          class="book-group-card__edit-btn"
          @click.stop="handleStartEdit"
          title="编辑分组名称"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      </template>
    </div>

    <!-- 书籍数量标签 -->
    <div class="book-group-card__count">
      <span class="count-number">{{ displayBookCount }}</span>
      <span class="count-label">本</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onBeforeUnmount } from 'vue';
import { BookGroup } from '@/api/book/types';
import { Book } from '@/api/book/types';

interface Props {
  group: BookGroup;
  books: Book[];
  maxThumbnails?: number;
  selected?: boolean;
  isOrganizeMode?: boolean;
  /** 基准宽度（CSS像素），用于缩放计算 */
  baseWidth?: number;
  /** 基准高度（CSS像素） */
  baseHeight?: number;
  /** 最小缩放比例 */
  minScale?: number;
  /** 最大缩放比例 */
  maxScale?: number;
  /** 是否启用 DPI/分辨率自适应缩放 */
  enableAdaptiveScale?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxThumbnails: 9,
  selected: false,
  isOrganizeMode: false,
  baseWidth: 240,
  baseHeight: 220,
  minScale: 0.7,
  maxScale: 1.0,
  enableAdaptiveScale: true,
});

const emit = defineEmits<{
  click: [groupId: string];
  updateGroup: [groupId: string, newName: string];
}>();

// 屏幕参数
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1280);
const devicePixelRatio = ref(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

/**
 * 计算分组卡缩放比例（仅做等比缩放，不再用 transform: scale 撑大 wrapper）
 * - 缩放区间由 minScale/maxScale 限制
 * - 这里只用来在缩略图网格缝隙等地方做微调，不再影响 wrapper/cell 尺寸
 */
const cardScale = computed(() => {
  if (!props.enableAdaptiveScale) return 1;
  const widthRatio = viewportWidth.value / 1920;
  const dprRatio = Math.min(1.5, Math.max(1, devicePixelRatio.value));
  const raw = widthRatio * dprRatio;
  const scale = Math.max(props.minScale, Math.min(props.maxScale, raw));
  return Number(scale.toFixed(3));
});

const handleResize = () => {
  if (typeof window === 'undefined') return;
  viewportWidth.value = window.innerWidth;
};

const handleDprChange = () => {
  if (typeof window === 'undefined') return;
  devicePixelRatio.value = window.devicePixelRatio || 1;
};

let dprMediaQuery: MediaQueryList | null = null;

onMounted(() => {
  if (typeof window === 'undefined') return;
  window.addEventListener('resize', handleResize);
  dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  if (dprMediaQuery) {
    dprMediaQuery.addEventListener('change', handleDprChange);
  }
  handleResize();
  handleDprChange();
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('resize', handleResize);
  if (dprMediaQuery) {
    dprMediaQuery.removeEventListener('change', handleDprChange);
  }
});

const isEditing = ref(false);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);
const thumbnailErrors = ref<Record<number, boolean>>({});

const handleStartEdit = () => {
  isEditing.value = true;
  editingName.value = props.group.name;
  nextTick(() => {
    editInputRef.value?.focus();
    editInputRef.value?.select();
  });
};

const handleSaveEdit = () => {
  if (!editingName.value.trim()) {
    handleCancelEdit();
    return;
  }
  
  if (editingName.value.trim() !== props.group.name) {
    emit('updateGroup', props.group.id, editingName.value.trim());
  }
  
  isEditing.value = false;
  editingName.value = '';
};

const handleCancelEdit = () => {
  isEditing.value = false;
  editingName.value = '';
};

// 根据maxThumbnails确定网格布局
const displayThumbnails = computed(() => {
  // 返回网格配置，而不是实际数量
  // 1-4本用2x2网格，5-9本用3x3网格
  const actualCount = Math.min(props.maxThumbnails, props.books.length);
  if (actualCount <= 4) {
    return 4; // 2x2 网格
  } else {
    return 9; // 3x3 网格
  }
});

// 显示的书籍（最多 maxThumbnails 本）
const displayBooks = computed(() => {
  return props.books.slice(0, props.maxThumbnails);
});

// 显示的书籍数量（优先使用实际 books 数组长度，响应式反映最新数据；仅在 books 为空时回退到后端 bookCount）
const displayBookCount = computed(() => {
  return props.books.length > 0 ? props.books.length : (props.group.bookCount ?? 0);
});

// 缩略图加载成功
const handleThumbnailLoad = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  imgElement.classList.add('loaded');
};

// 获取书籍封面URL
const getBookCoverUrl = (book: Book): string | undefined => {
  if (book.coverUrl) return book.coverUrl;
  // 始终尝试根据 path 加载封面，不依赖 has_cover 字段
  if (book.path) {
    return `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
  }
  return undefined;
};

// 缩略图加载失败
const handleThumbnailError = (event: Event, book: Book) => {
  const imgElement = event.target as HTMLImageElement;
  imgElement.style.display = 'none';
  // 标记该书籍封面加载失败
  thumbnailErrors.value[book.id] = true;
};

const handleClick = () => {
  if (!isEditing.value) {
    emit('click', props.group.id);
  }
};
</script>

<style scoped>
/* 分组卡 - 高度由内容自然决定：3:4 缩略图区 + 52px 信息区 */
.book-group-card {
  position: relative;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  width: 100%;
  /* 高度由内容决定：3:4 缩略图区 + 52px 信息区 - 与 BookCard 结构完全一致 */
}

.book-group-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 整理模式下的分组框样式 */
.book-group-card--organize {
  cursor: pointer;
}

.book-group-card--selected {
  border: 2px solid var(--primary-color);
  background-color: rgba(255, 107, 53, 0.05);
}

/* 选择复选框 */
.group-select-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  z-index: 20;
}

.group-select-checkbox svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  color: var(--primary-color);
}

/* 缩略图网格外层 - 与 BookCard 封面同款 padding-top 3:4 布局 */
.book-group-card__thumbnails {
  position: relative;
  width: 100%;
  padding-top: 133.33%; /* 3:4 比例，与 BookCard 封面完全一致 */
  background-color: var(--bg-secondary);
  flex-shrink: 0; /* 固定 3:4 比例，不被信息区挤压 */
  min-height: 0;
  overflow: hidden;
}

/* 缩略图网格内层 - 绝对定位填满 padding-top 区域，去掉 10px padding 后的精确 3:4 空间 */
.book-group-card__thumbnails-grid {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  gap: 6px;
}

/* 2x2 网格（最多显示4本）- 单元格天然 3:4 */
.thumbnails-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

/* 3x3 网格（最多显示9本）- 单元格天然 3:4 */
.thumbnails-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

/* 缩略图单元格 - 由 grid 等分得到 3:4 比例，比例锁定 */
.book-group-card__thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.book-group-card__thumbnail--empty {
  background-color: transparent;
}

/* 缩略图图片 - 绝对定位填满整个 3:4 单元格，保持原始宽高比 */
.thumbnail__image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保持原图比例，超出部分裁剪 */
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.thumbnail__image.loaded {
  opacity: 1;
}

.thumbnail__placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #999;
  background-color: #e8e8e8;
}

/* 分组信息区域 */
.book-group-card__info {
  padding: 8px 10px;
  flex-shrink: 0;
  min-height: 52px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-group-card__name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
  flex: 1;
  cursor: text;
}

.book-group-card__name:hover {
  color: var(--primary-color);
}

.book-group-card__name-input {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  outline: none;
  background-color: var(--bg-card);
  color: var(--text-primary);
  min-width: 0;
}

.book-group-card__name-input:focus {
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.book-group-card__edit-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
  padding: 0;
}

.book-group-card__info:hover .book-group-card__edit-btn {
  opacity: 1;
}

.book-group-card__edit-btn:hover {
  color: var(--primary-color);
}

.book-group-card__edit-btn svg {
  width: 16px;
  height: 16px;
}

/* 书籍数量标签 */
.book-group-card__count {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #1a1a1a;
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  min-width: 50px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 10;
}

.book-group-card__count .count-number {
  color: #fff;
}

.book-group-card__count .count-label {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .book-group-card {
    /* 小屏沿用 3:4 + 52px 信息区结构 */
  }

  /* 缩略图区小屏下内边距缩小 */
  .book-group-card__thumbnails-grid {
    top: 8px;
    left: 8px;
    right: 8px;
    bottom: 8px;
    gap: 4px;
  }

  .book-group-card__info {
    padding: 6px 8px;
    min-height: 44px;
  }

  .book-group-card__name {
    font-size: 13px;
  }

  .book-group-card__count {
    top: 6px;
    right: 6px;
    padding: 3px 8px;
    min-width: 42px;
    font-size: 12px;
  }
}
</style>
