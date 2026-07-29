<template>
  <div v-if="visible" class="dialog-overlay" @click="onOverlayClick">
    <div class="dialog dialog-duplicate" @click.stop>
      <!-- 标题区 -->
      <div class="dialog-header">
        <span class="dialog-title">检测到重复书籍</span>
        <span class="dialog-close" @click="emit('cancel')">×</span>
      </div>

      <!-- 内容区 -->
      <div class="dialog-body">
        <p class="dup-hint">发现书库中已存在相同 ISBN 的书籍：</p>

        <!-- 逐本处理 / 单本模式：显示当前正在添加的书籍名 -->
        <p v-if="mode === 'single' && currentBookTitle" class="dup-current-line">
          《<span class="dup-current-title">{{ currentBookTitle }}</span>》
        </p>

        <!-- 合并处理：列出会触发重复的待导入书名（可点击展开已有重复列表） -->
        <ul v-else-if="mode === 'batch-summary' && incomingDuplicateBooks && incomingDuplicateBooks.length > 0" class="dup-incoming-list">
          <li
            v-for="(b, idx) in incomingDuplicateBooks"
            :key="b.isbn + '-' + idx"
            class="dup-incoming-item"
            :title="`点击展开《${b.title || '（无标题）'}》的已有重复列表`"
            @click="onIncomingTitleClick(b)"
          >
            《<span class="dup-incoming-title">{{ b.title || '（无标题）' }}</span>》
          </li>
        </ul>

        <p v-if="mode === 'batch-summary' && batchStats" class="dup-hint dup-hint--stats">
          （共 <strong>{{ batchStats.totalCount }}</strong> 本待导入，其中 <strong>{{ batchStats.duplicateCount }}</strong> 本重复）
        </p>

        <!-- 「查看已有 / 收起」按钮 -->
        <button
          class="toggle-list-btn"
          :class="{ 'toggle-list-btn--open': listExpanded }"
          @click="listExpanded = !listExpanded"
        >
          <span class="toggle-list-btn__icon">{{ listExpanded ? '▾' : '▸' }}</span>
          <span v-if="!listExpanded">查看已有（{{ duplicates.length }} 本）</span>
          <span v-else>收起重复列表</span>
        </button>

        <!-- 重复列表（默认收起） -->
        <transition name="expand">
          <div v-show="listExpanded" class="dup-list">
            <!-- 单本模式：保留原样，不分组 -->
            <template v-if="mode === 'single'">
              <div
                v-for="(book, idx) in duplicates"
                :key="book.id + '-' + idx"
                class="dup-list-item"
                @click="emit('view-existing', book.id)"
                :title="`点击查看《${book.title}》详情页`"
              >
                <div class="dup-cover">
                  <img
                    v-if="book.hasCover && book.coverPath"
                    :src="coverUrlFor(book)"
                    :alt="book.title"
                    class="dup-cover-img"
                    @error="onCoverError($event)"
                  />
                  <div v-else class="dup-cover-placeholder">
                    <span>📕</span>
                  </div>
                </div>
                <div class="dup-info">
                  <div class="dup-info-title">{{ book.title || '（无标题）' }}</div>
                  <div class="dup-info-row">
                    <span class="dup-info-label">作者：</span>
                    <span class="dup-info-value">{{ book.author || '—' }}</span>
                  </div>
                  <div class="dup-info-row">
                    <span class="dup-info-label">ISBN：</span>
                    <span class="dup-info-value">{{ book.isbn }}</span>
                  </div>
                  <div class="dup-info-row">
                    <span class="dup-info-label">出版社：</span>
                    <span class="dup-info-value">{{ book.publisher || '—' }}</span>
                  </div>
                  <div class="dup-info-row">
                    <span class="dup-info-label">加入书架时间：</span>
                    <span class="dup-info-value">{{ formatAddedTime(book.addToLibraryTime) }}</span>
                  </div>
                </div>
                <div class="dup-arrow" aria-hidden="true">›</div>
              </div>
            </template>

            <!-- 合并模式：按 ISBN 分组，每组用不同浅色背景区分 -->
            <template v-else>
              <div
                v-for="(group, gIdx) in groupedDuplicates"
                :key="group.isbn"
                :ref="(el) => { registerGroupRef(group.isbn, el as HTMLElement | null) }"
                class="dup-group"
                :class="{ 'dup-group--highlighted': highlightedGroupIsbn === group.isbn }"
                :style="{ backgroundColor: getGroupColor(gIdx) }"
              >
                <div class="dup-group-header">
                  <span class="dup-group-title">《{{ group.incomingTitle }}》</span>
                  <span class="dup-group-count">书库中已有 {{ group.items.length }} 本</span>
                </div>
                <div
                  v-for="(book, idx) in group.items"
                  :key="book.id + '-' + idx"
                  class="dup-list-item dup-list-item--in-group"
                  @click="emit('view-existing', book.id)"
                  :title="`点击查看《${book.title}》详情页`"
                >
                  <div class="dup-cover">
                    <img
                      v-if="book.hasCover && book.coverPath"
                      :src="coverUrlFor(book)"
                      :alt="book.title"
                      class="dup-cover-img"
                      @error="onCoverError($event)"
                    />
                    <div v-else class="dup-cover-placeholder">
                      <span>📕</span>
                    </div>
                  </div>
                  <div class="dup-info">
                    <div class="dup-info-title">{{ book.title || '（无标题）' }}</div>
                    <div class="dup-info-row">
                      <span class="dup-info-label">作者：</span>
                      <span class="dup-info-value">{{ book.author || '—' }}</span>
                    </div>
                    <div class="dup-info-row">
                      <span class="dup-info-label">ISBN：</span>
                      <span class="dup-info-value">{{ book.isbn }}</span>
                    </div>
                    <div class="dup-info-row">
                      <span class="dup-info-label">出版社：</span>
                      <span class="dup-info-value">{{ book.publisher || '—' }}</span>
                    </div>
                    <div class="dup-info-row">
                      <span class="dup-info-label">加入书架时间：</span>
                      <span class="dup-info-value">{{ formatAddedTime(book.addToLibraryTime) }}</span>
                    </div>
                  </div>
                  <div class="dup-arrow" aria-hidden="true">›</div>
                </div>
              </div>
            </template>
          </div>
        </transition>
      </div>

      <!-- 底部按钮区 -->
      <div class="dialog-footer">
        <template v-if="mode === 'single'">
          <button class="btn btn-default" @click="emit('cancel')">取消</button>
          <button class="btn btn-primary" @click="emit('continue')">仍然添加</button>
        </template>
        <template v-else>
          <button class="btn btn-default" @click="emit('skip-all')">全部跳过</button>
          <button class="btn btn-primary" @click="emit('continue-all')">全部添加</button>
          <button class="btn btn-warning" @click="emit('review-one-by-one')">逐本处理</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import type { DuplicateBook } from '@/api/book/types';
import { formatDateTime } from '@/utils/dateUtils';
import { normalizeIsbn } from '@/utils/isbnUtils';

const props = withDefaults(
  defineProps<{
    visible: boolean;
    duplicates: DuplicateBook[];
    mode?: 'single' | 'batch-summary';
    /** 批量模式下的统计信息 */
    batchStats?: { totalCount: number; duplicateCount: number };
    /** 批量模式下：会触发重复的待导入书籍（仅含重复的） */
    incomingDuplicateBooks?: Array<{ isbn: string; title: string }>;
    /** 单本/逐本处理模式下：当前正在添加的书籍标题 */
    currentBookTitle?: string;
  }>(),
  {
    mode: 'single',
    batchStats: undefined,
    incomingDuplicateBooks: () => [],
    currentBookTitle: undefined
  }
);

const emit = defineEmits<{
  cancel: [];
  continue: [];
  'view-existing': [bookId: number];
  'skip-all': [];
  'continue-all': [];
  'review-one-by-one': [];
}>();

// 列表展开状态：每次打开弹窗时默认收起
const listExpanded = ref(false);
// 当前点击并高亮的分组 ISBN
const highlightedGroupIsbn = ref<string | null>(null);
// 各分组的 DOM 引用，用于点击书名后滚动定位
const groupRefs = ref<Record<string, HTMLElement | null>>({});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      listExpanded.value = false;
      highlightedGroupIsbn.value = null;
    }
  }
);

/**
 * 分组浅色背景（循环分配 4 种极淡的颜色，相邻分组也能区分但不刺眼）
 */
const GROUP_COLORS = [
  '#f5f7fa', // 极浅蓝灰
  '#faf6ee', // 极浅米黄
  '#f0f5f0', // 极浅灰绿
  '#f7f0f5'  // 极浅灰紫
];
function getGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

/**
 * 注册分组 DOM 引用（template ref 回调）
 */
function registerGroupRef(isbn: string, el: HTMLElement | null) {
  if (el) {
    groupRefs.value[isbn] = el;
  } else {
    delete groupRefs.value[isbn];
  }
}

/**
 * 合并处理模式下：按归一化 ISBN 把重复列表分组
 * incomingDuplicateBooks 已经预归一化（BatchScanner 传入时已处理），
 * duplicates 来自后端，需要本地再次归一化以匹配
 */
const groupedDuplicates = computed(() => {
  if (props.mode !== 'batch-summary') return null;
  const incomingMap = new Map<string, string>();
  for (const b of props.incomingDuplicateBooks || []) {
    if (b.isbn) incomingMap.set(b.isbn, b.title || '（无标题）');
  }
  const groups = new Map<string, { isbn: string; incomingTitle: string; items: DuplicateBook[] }>();
  for (const d of props.duplicates) {
    const nk = normalizeIsbn(d.isbn);
    if (!nk) continue;
    if (!groups.has(nk)) {
      groups.set(nk, {
        isbn: nk,
        incomingTitle: incomingMap.get(nk) || '（未知书名）',
        items: []
      });
    }
    groups.get(nk)!.items.push(d);
  }
  return Array.from(groups.values());
});

let highlightTimer: number | null = null;

/**
 * 点击合并处理中的书名：
 * - 展开已有重复列表
 * - 滚动到对应分组并短暂高亮
 */
function onIncomingTitleClick(book: { isbn: string; title: string }) {
  listExpanded.value = true;
  highlightedGroupIsbn.value = book.isbn;
  nextTick(() => {
    const el = groupRefs.value[book.isbn];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  if (highlightTimer) window.clearTimeout(highlightTimer);
  highlightTimer = window.setTimeout(() => {
    if (highlightedGroupIsbn.value === book.isbn) {
      highlightedGroupIsbn.value = null;
    }
    highlightTimer = null;
  }, 1500);
}

/**
 * 计算 Calibre 静态服务下的封面 URL
 * 后端通过 /api/static/calibre/{path}/cover.jpg 暴露
 */
function coverUrlFor(book: DuplicateBook): string {
  if (!book.coverPath) return '';
  return `/api/static/calibre/${encodeURIComponent(book.coverPath)}/cover.jpg`;
}

function onCoverError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const placeholder = img.nextElementSibling as HTMLElement | null;
  if (placeholder) placeholder.style.display = 'flex';
}

function formatAddedTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return formatDateTime(iso);
}

function onOverlayClick() {
  emit('cancel');
}
</script>

<style scoped>
/* 弹窗遮罩层（独立样式，不依赖任何父级 class） */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.dialog-duplicate {
  position: relative;
  z-index: 10000;
  width: 640px;
  max-width: 92vw;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.dialog-close {
  font-size: 24px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.dialog-close:hover {
  color: #333;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.dup-hint {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

.dup-hint strong {
  color: var(--primary-color, #ff6b35);
  font-weight: 600;
}

/* 查看已有 / 收起 按钮 */
.toggle-list-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  background: #f8f8f8;
  color: #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-list-btn:hover {
  border-color: var(--primary-color, #ff6b35);
  color: var(--primary-color, #ff6b35);
  background: rgba(255, 107, 53, 0.05);
}

.toggle-list-btn--open {
  background: rgba(255, 107, 53, 0.08);
  border-color: var(--primary-color, #ff6b35);
  color: var(--primary-color, #ff6b35);
}

.toggle-list-btn__icon {
  font-size: 12px;
  width: 12px;
  display: inline-block;
  text-align: center;
}

/* 重复列表 */
.dup-list {
  margin-top: 12px;
  border: 1px solid #ececec;
  border-radius: 6px;
  background: #fafafa;
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px;
  scroll-behavior: smooth;
}

.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 50vh;
  opacity: 1;
}

.dup-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 1px solid #ececec;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.dup-list-item:last-child {
  border-bottom: none;
}

.dup-list-item:hover {
  background: rgba(255, 107, 53, 0.06);
}

.dup-list-item:hover .dup-arrow {
  color: var(--primary-color, #ff6b35);
  transform: translateX(2px);
}

/* 封面 */
.dup-cover {
  flex-shrink: 0;
  width: 50px;
  height: 70px;
  border-radius: 4px;
  overflow: hidden;
  background: #f0f0f0;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dup-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dup-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ccc;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

/* 文本信息 */
.dup-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dup-info-title {
  font-size: 14px;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.dup-info-row {
  display: flex;
  font-size: 12px;
  line-height: 1.5;
  color: #666;
}

.dup-info-label {
  flex-shrink: 0;
  color: #999;
  min-width: 88px;
}

.dup-info-value {
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* 跳转箭头 */
.dup-arrow {
  flex-shrink: 0;
  font-size: 24px;
  color: #ccc;
  font-weight: 300;
  transition: all 0.12s ease;
  padding: 0 4px;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.btn {
  font-size: 13px;
  padding: 7px 18px;
  border-radius: 4px;
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #555;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:hover {
  border-color: #bbb;
  background: #f5f5f5;
}

.btn-primary {
  background: var(--primary-color, #ff6b35);
  border-color: var(--primary-color, #ff6b35);
  color: #fff;
}

.btn-primary:hover {
  background: #e85a26;
  border-color: #e85a26;
  color: #fff;
}

.btn-warning {
  background: #fff;
  border-color: #f0a040;
  color: #c97a20;
}

.btn-warning:hover {
  background: #fff7e8;
  border-color: #c97a20;
  color: #c97a20;
}

/* 单本 / 逐本模式下的「当前正在添加的书籍」高亮行 */
.dup-current-line {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #222;
  font-weight: 500;
}

.dup-current-title {
  color: var(--primary-color, #ff6b35);
  font-weight: 600;
}

/* 合并模式：会触发重复的待导入书名列表（可点击） */
.dup-incoming-list {
  list-style: none;
  margin: 0 0 12px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dup-incoming-item {
  display: block;
  padding: 6px 12px;
  background: #fff7e8;
  border: 1px solid #f0c89a;
  border-radius: 4px;
  font-size: 14px;
  color: #5a3b14;
  cursor: pointer;
  transition: all 0.12s ease;
  user-select: none;
}

.dup-incoming-item:hover {
  background: #ffe9c8;
  border-color: var(--primary-color, #ff6b35);
  color: var(--primary-color, #ff6b35);
  transform: translateX(2px);
}

.dup-incoming-title {
  font-weight: 600;
}

/* 合并模式：按 ISBN 分组的浅色块 */
.dup-group {
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid transparent;
}

.dup-group:last-child {
  margin-bottom: 0;
}

.dup-group--highlighted {
  box-shadow: 0 0 0 2px var(--primary-color, #ff6b35);
  animation: dup-group-pulse 1.4s ease;
}

@keyframes dup-group-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.5); }
  40%  { box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.25); }
  100% { box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.6); }
}

.dup-group-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 2px 8px 2px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  margin-bottom: 8px;
}

.dup-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #5a3b14;
}

.dup-group-count {
  font-size: 12px;
  color: #888;
}

/* 分组内部的列表项：使用半透明白底 + 极淡边框，避免和分组背景冲突 */
.dup-list-item--in-group {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.04);
  margin-bottom: 6px;
  border-radius: 4px;
  padding: 10px 12px;
}

.dup-list-item--in-group:last-child {
  margin-bottom: 0;
}

/* 统计行 */
.dup-hint--stats {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #888;
}

.dup-hint--stats strong {
  color: var(--primary-color, #ff6b35);
}
</style>
