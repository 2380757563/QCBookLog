<template>
  <div class="dialog-overlay" @click="onOverlayClick">
    <div class="dialog dialog-group-manage" @click.stop>
      <div class="dialog-header">
        <span class="dialog-title">
          <span class="folder-emoji">📁</span>
          <span class="title-text">{{ groupName }}</span>
          <span class="title-count">({{ booksInGroup.length }} 本)</span>
        </span>
        <span class="dialog-close" @click="emit('update:show', false)">×</span>
      </div>
      <div class="dialog-body dialog-body--manage">
        <!-- 顶部操作栏 -->
        <div class="manage-toolbar">
          <label class="manage-select-all">
            <span
              :class="['group-checkbox', { 'group-checkbox--checked': allSelected }]"
              @click.stop="toggleSelectAll"
            >
              <svg v-if="allSelected" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </span>
            <span>全选</span>
            <span class="selected-count" v-if="selectedBookIds.length > 0">
              已选 {{ selectedBookIds.length }} 本
            </span>
          </label>
          <button
            class="btn-remove-from-group"
            :disabled="selectedBookIds.length === 0 || removing"
            @click="removeSelectedFromGroup"
          >
            移出分组 ({{ selectedBookIds.length }})
          </button>
        </div>

        <!-- 书籍列表 -->
        <div class="manage-book-list">
          <div v-if="booksInGroup.length === 0" class="empty-tip">
            <p>该分组内暂无书籍</p>
          </div>
          <div
            v-for="book in booksInGroup"
            :key="book.id"
            :class="['manage-book-item', { 'manage-book-item--selected': selectedBookIds.includes(book.id) }]"
            @click="toggleBook(book.id)"
          >
            <span
              :class="['group-checkbox', { 'group-checkbox--checked': selectedBookIds.includes(book.id) }]"
              @click.stop="toggleBook(book.id)"
            >
              <svg v-if="selectedBookIds.includes(book.id)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </span>
            <div class="manage-book-cover">
              <img
                v-if="book.coverUrl || book.path"
                :src="book.coverUrl || getBookCoverUrl(book)"
                :alt="book.title"
                loading="lazy"
              />
              <div v-else class="cover-placeholder">
                <span>{{ book.title ? book.title.charAt(0) : '?' }}</span>
              </div>
            </div>
            <div class="manage-book-info">
              <div class="manage-book-title">{{ book.title || '未知书名' }}</div>
              <div class="manage-book-author">{{ book.author || '未知作者' }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-default" @click="emit('update:show', false)">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Book, BookGroup } from '@/api/book/types';

const props = defineProps<{
  show: boolean;
  group: BookGroup | null;
  booksInGroup: Book[];
  /** 是否正在执行移出操作（loading 状态） */
  removing?: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'remove-books': [bookIds: number[]];
}>();

const selectedBookIds = ref<number[]>([]);

const groupName = computed(() => props.group?.name || '分组管理');

const allSelected = computed(() => {
  if (props.booksInGroup.length === 0) return false;
  return props.booksInGroup.every(b => selectedBookIds.value.includes(b.id));
});

function toggleBook(id: number) {
  const idx = selectedBookIds.value.indexOf(id);
  if (idx === -1) {
    selectedBookIds.value.push(id);
  } else {
    selectedBookIds.value.splice(idx, 1);
  }
  // 触发响应式更新
  selectedBookIds.value = [...selectedBookIds.value];
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedBookIds.value = [];
  } else {
    selectedBookIds.value = props.booksInGroup.map(b => b.id);
  }
}

function removeSelectedFromGroup() {
  if (selectedBookIds.value.length === 0) return;
  emit('remove-books', [...selectedBookIds.value]);
}

// 弹窗打开/分组变化时重置选择
watch(
  () => [props.show, props.group?.id, props.booksInGroup.length] as const,
  ([show]) => {
    if (show) {
      selectedBookIds.value = [];
    }
  },
  { immediate: true }
);

function onOverlayClick() {
  emit('update:show', false);
}

/** 复用书库页面的封面 URL 解析逻辑（这里简化为 path 推断） */
function getBookCoverUrl(book: Book): string {
  if (book.coverUrl) return book.coverUrl;
  if (book.path) {
    return `/api/static/calibre/${encodeURIComponent(book.path)}/cover.jpg`;
  }
  return '';
}
</script>

<style scoped>
.dialog-group-manage {
  width: 92%;
  max-width: 720px;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.folder-emoji {
  font-size: 18px;
}

.title-text {
  font-weight: 600;
}

.title-count {
  color: #999;
  font-size: 13px;
  font-weight: 400;
}

.dialog-body--manage {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.manage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  flex-shrink: 0;
}

.manage-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.selected-count {
  color: #999;
  font-size: 12px;
  margin-left: 4px;
}

.btn-remove-from-group {
  background: var(--primary-color, #ff6b35);
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-remove-from-group:hover:not(:disabled) {
  background: #ff8c5a;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
}

.btn-remove-from-group:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.manage-book-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.empty-tip p {
  margin: 0;
  font-size: 14px;
}

.manage-book-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.manage-book-item:hover {
  background: #f5f5f5;
}

.manage-book-item--selected {
  background: rgba(255, 107, 53, 0.08);
}

.manage-book-cover {
  width: 40px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.manage-book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  font-size: 18px;
  color: #999;
}

.manage-book-info {
  flex: 1;
  min-width: 0;
}

.manage-book-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manage-book-author {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.group-checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid #d0d0d0;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--primary-color, #ff6b35);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.group-checkbox:hover {
  border-color: var(--primary-color, #ff6b35);
}

.group-checkbox--checked {
  background: var(--primary-color, #ff6b35);
  border-color: var(--primary-color, #ff6b35);
}

.group-checkbox svg {
  width: 14px;
  height: 14px;
  fill: #fff;
}
</style>
