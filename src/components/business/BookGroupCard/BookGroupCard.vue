<template>
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

    <!-- 分组书籍缩略图网格 -->
    <div class="book-group-card__thumbnails" :class="`thumbnails-${displayThumbnails}`">
      <div
        v-for="(book, index) in displayBooks"
        :key="book.id"
        class="book-group-card__thumbnail"
      >
        <img
          v-if="book.coverUrl"
          :src="book.coverUrl"
          :alt="book.title"
          class="thumbnail__image"
          loading="lazy"
        />
        <div v-else class="thumbnail__placeholder">
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
      <span class="count-number">{{ books.length }}</span>
      <span class="count-label">本</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { BookGroup } from '@/services/book/types';
import { Book } from '@/services/book/types';

interface Props {
  group: BookGroup;
  books: Book[];
  maxThumbnails?: number;
  selected?: boolean;
  isOrganizeMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxThumbnails: 9,
  selected: false,
  isOrganizeMode: false
});

const emit = defineEmits<{
  click: [groupId: string];
  updateGroup: [groupId: string, newName: string];
}>();

const isEditing = ref(false);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

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

const handleClick = () => {
  if (!isEditing.value) {
    emit('click', props.group.id);
  }
};
</script>

<style scoped>
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
  min-height: 220px; /* 固定最小高度，确保布局稳定 */
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

/* 缩略图网格容器 */
.book-group-card__thumbnails {
  display: grid;
  gap: 6px;
  padding: 10px;
  background-color: var(--bg-secondary);
  flex: 1; /* 占据剩余空间 */
  min-height: 0; /* 确保高度正确计算 */
}

/* 2x2 网格（最多显示4本） */
.thumbnails-4 {
  grid-template-columns: repeat(2, 1fr);
}

/* 3x3 网格（最多显示9本） - 强制九宫格布局 */
.thumbnails-9 {
  grid-template-columns: repeat(3, 1fr); /* 强制3列 */
}

/* 缩略图单元格 - 高度由外部根据列数控制 */
.book-group-card__thumbnail {
  height: 80px; /* 默认高度，可被外部覆盖 */
  min-height: 80px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.book-group-card__thumbnail--empty {
  background-color: transparent;
}

/* 缩略图图片 - 使用object-fit: cover填满容器 */
.thumbnail__image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 填满容器 */
  display: block;
}

.thumbnail__placeholder {
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
    min-height: 180px;
  }

  .book-group-card__thumbnails {
    gap: 4px;
    padding: 8px;
  }

  .book-group-card__thumbnail,
  .thumbnails-4 .book-group-card__thumbnail {
    height: 60px;
    min-height: 60px;
  }

  .thumbnails-9 .book-group-card__thumbnail {
    height: 60px;
    min-height: 60px;
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
