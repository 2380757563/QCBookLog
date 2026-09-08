<!--
  BookmarkTimeline.vue
  书摘时间线视图
  - 顶部书籍分类 chips：点击切换展示哪本书的时间线
  - 垂直时间线：节点为页码，节点右侧为书摘卡片（内容、页码、标签、时间）
  - 每本书内部按页码升序排列
  - 点击书籍切换时平滑过渡
-->
<template>
  <div class="timeline-wrap">
    <!-- 书籍分类选择 -->
    <div class="tl-book-switch">
      <button
        v-for="group in bookGroups"
        :key="group.bookId"
        class="tl-book-chip"
        :class="{ active: activeBookId === group.bookId }"
        @click="switchBook(group.bookId)"
      >
        <span class="chip-title">{{ group.title }}</span>
        <span class="chip-count">{{ group.items.length }}</span>
      </button>
      <button class="tl-add-btn" title="新建书摘" @click="emit('add')">
        <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        <span>新建</span>
      </button>
      <div v-if="bookGroups.length === 0" class="tl-chip-empty">暂无书摘</div>
    </div>

    <!-- 当前书籍的时间线 -->
    <Transition name="fade-slide" mode="out-in">
      <div v-if="activeBook" :key="activeBook.bookId" class="tl-scroll">
        <div class="tl-timeline">
          <template v-for="(bm, idx) in activeBook.items" :key="bm.id">
            <div class="tl-node">
              <!-- 左侧节点 / 页码 -->
              <div class="tl-axis">
                <div class="tl-dot" :class="{ first: idx === 0 }"></div>
                <div class="tl-line"></div>
              </div>
              <!-- 右侧书摘卡片 -->
              <div class="tl-card">
                <div v-if="bm.pageNum" class="card-page">第 {{ bm.pageNum }} 页</div>
                <p class="card-content">{{ bm.content }}</p>
                <p v-if="bm.note" class="card-note">💭 {{ bm.note }}</p>
                <div class="card-footer">
                  <span class="card-time">{{ formatDateTime(bm.createTime || bm.created_at) }}</span>
                  <div v-if="bm.tags && bm.tags.length" class="card-tags">
                    <span v-for="tag in bm.tags" :key="tag" class="mini-tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div v-else class="tl-empty">
        <span class="empty-icon">📚</span>
        <p>暂无书摘，快去添加第一条吧</p>
        <button class="tl-empty-btn" @click="emit('add')">添加第一条书摘</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Bookmark } from '@/api/bookmark/types';

const props = defineProps<{
  bookmarks: Bookmark[];
}>();

const emit = defineEmits<{
  (e: 'add'): void;
}>();

/** 按书籍分组（按 bookId），每组书摘按页码升序 */
const bookGroups = computed(() => {
  const map = new Map<string | number, Bookmark[]>();
  for (const bm of props.bookmarks) {
    const id = bm.bookId ?? bm.bookTitle ?? '未知';
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(bm);
  }
  return Array.from(map.entries())
    .map(([bookId, items]) => ({
      bookId,
      title: items[0]?.bookTitle || '未知书籍',
      items: [...items].sort(
        (a, b) => (a.pageNum ?? a.page ?? 0) - (b.pageNum ?? b.page ?? 0)
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

const activeBookId = ref<string | number | null>(null);

const activeBook = computed(() =>
  bookGroups.value.find(g => g.bookId === activeBookId.value) || null
);

function switchBook(id: string | number) {
  activeBookId.value = id;
}

// 默认选中第一本
watch(bookGroups, (groups) => {
  if (groups.length) {
    if (!groups.some(g => g.bookId === activeBookId.value)) {
      activeBookId.value = groups[0].bookId;
    }
  } else {
    activeBookId.value = null;
  }
}, { immediate: true });

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '未知时间';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
};
</script>

<style scoped lang="scss">
.timeline-wrap {
  width: 100%;
}

/* 顶部书籍分类 */
.tl-book-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.tl-book-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #f5f5f5;
  border: 1px solid transparent;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s ease;
  max-width: 220px;
}
.chip-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chip-count {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  padding: 0 7px;
  font-size: 11px;
  min-width: 18px;
  text-align: center;
}
.tl-book-chip.active {
  background: var(--primary-color, #ff6b35);
  border-color: var(--primary-color, #ff6b35);
  color: #fff;
}
.tl-book-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
}
.tl-chip-empty {
  font-size: 13px;
  color: var(--text-hint);
  padding: 6px 0;
}
.tl-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  background: var(--primary-color, #ff6b35);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}
.tl-add-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
.tl-add-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 时间线滚动 */
.tl-scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

/* 时间线主体 */
.tl-timeline {
  display: flex;
  flex-direction: column;
}
.tl-node {
  display: flex;
  gap: 14px;
  position: relative;
}

/* 左侧轴线 + 节点 */
.tl-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  flex-shrink: 0;
}
.tl-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--primary-color, #ff6b35);
  margin-top: 20px;
  z-index: 1;
  flex-shrink: 0;
}
.tl-dot.first {
  box-shadow: 0 0 0 5px rgba(255, 107, 53, 0.18);
}
.tl-line {
  flex: 1;
  width: 2px;
  background: #e5e5e5;
}

/* 右侧卡片 */
.tl-card {
  flex: 1;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #eee);
  border-radius: var(--radius-lg, 12px);
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.tl-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
.card-page {
  display: inline-block;
  background: rgba(255, 107, 53, 0.1);
  color: var(--primary-color, #ff6b35);
  font-size: 12px;
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 8px;
  font-weight: 500;
}
.card-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 0 0 8px;
  white-space: pre-wrap;
  word-break: break-word;
}
.card-note {
  font-size: 13px;
  color: var(--text-secondary);
  background: #fffde7;
  padding: 8px 10px;
  border-radius: var(--radius-md, 8px);
  margin: 0 0 10px;
  font-style: italic;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--text-hint);
  flex-wrap: wrap;
}
.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mini-tag {
  padding: 1px 6px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--primary-color, #ff6b35);
  border-radius: 4px;
  font-size: 11px;
}

/* 切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 空态 */
.tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}
.tl-empty p {
  margin: 0;
}
.tl-empty-btn {
  margin-top: 14px;
  padding: 10px 22px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--primary-color, #ff6b35);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}
.tl-empty-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
</style>