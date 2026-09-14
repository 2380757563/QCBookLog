<!--
  BookmarkReviewSection.vue
  书摘"回顾"区域 —— 两个子 tab：
  1. 书摘卡片：随机回顾单条书摘（原回顾卡片样式，支持背景/滑动切换）
  2. 时间线：按书籍封面卡片展示，右上角灰色圆形徽章显示书摘数量，点击进入对应书的时间线
-->
<template>
  <div class="review-section">
    <!-- 子 tab 切换 -->
    <div class="sub-tabs">
      <div
        v-for="t in subTabs"
        :key="t.key"
        :class="['sub-tab-item', { active: activeSubTab === t.key }]"
        @click="activeSubTab = t.key"
      >{{ t.label }}</div>
    </div>

    <!-- 书摘卡片子 tab -->
    <div v-show="activeSubTab === 'card'" class="sub-content">
      <div v-if="bookmarks.length > 0" class="review-card" :style="reviewCardStyle" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
        <div class="review-card-overlay" :style="overlayStyle"></div>
        <transition :name="slideDirection" mode="out-in">
          <div :key="reviewIndex" class="review-content">
            <p class="review-text">{{ currentReviewBookmark?.content }}</p>
            <p v-if="currentReviewBookmark?.note" class="review-note">
              💭 {{ currentReviewBookmark.note }}
            </p>
          </div>
        </transition>
        <div class="review-meta">
          <span class="review-book">《{{ currentReviewBookmark?.bookTitle }}》</span>
          <div class="review-info">
            <span class="review-time">{{ formatDateTime(currentReviewBookmark?.createTime) }}</span>
            <span class="review-page" v-if="currentReviewBookmark?.pageNum">—— 引自第{{ currentReviewBookmark.pageNum }}页</span>
          </div>
        </div>
        <div class="review-nav">
          <button class="nav-btn" @click="prevReview" :disabled="reviewIndex === 0">
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
          <span class="review-progress">{{ reviewIndex + 1 }} / {{ bookmarks.length }}</span>
          <button class="nav-btn" @click="nextReview" :disabled="reviewIndex >= bookmarks.length - 1">
            <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        </div>
      </div>
      <div v-else class="empty-state">
        <span class="empty-icon">📚</span>
        <p>暂无书摘可回顾</p>
      </div>
    </div>

    <!-- 时间线子 tab：书籍卡片网格 -->
    <div v-show="activeSubTab === 'timeline'" class="sub-content">
      <!-- 书籍卡片列表视图 -->
      <div v-if="!selectedBookId" class="book-grid">
        <div
          v-for="group in bookGroups"
          :key="group.bookId"
          class="book-tile"
          @click="selectBook(group.bookId)"
        >
          <div class="book-cover-wrap">
            <img v-if="group.cover" :src="group.cover" :alt="group.title" loading="lazy" />
            <div v-else class="cover-placeholder">{{ group.title.charAt(0) }}</div>
            <span class="book-count-badge">{{ group.items.length }}</span>
          </div>
          <div class="book-tile-title">{{ group.title }}</div>
          <div v-if="group.author" class="book-tile-author">{{ group.author }}</div>
        </div>
        <div v-if="bookGroups.length === 0" class="empty-state">
          <span class="empty-icon">📚</span>
          <p>暂无书摘</p>
        </div>
      </div>

      <!-- 单本书的时间线视图 -->
      <div v-else class="book-timeline-view">
        <div class="back-bar">
          <button class="back-btn" @click="selectedBookId = null">
            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          </button>
          <span class="back-title">{{ activeBook?.title || '书籍时间线' }}</span>
          <span class="back-spacer"></span>
        </div>

        <Transition name="fade-slide" mode="out-in">
          <div v-if="activeBook && activeBook.items.length > 0" :key="activeBook.bookId" class="tl-scroll">
            <div class="tl-timeline">
              <template v-for="(bm, idx) in activeBook.items" :key="bm.id">
                <div class="tl-node">
                  <div class="tl-axis">
                    <div class="tl-dot" :class="{ first: idx === 0 }"></div>
                    <div class="tl-line"></div>
                  </div>
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
            <span class="empty-icon">📝</span>
            <p>这本书暂无书摘</p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Bookmark } from '@/api/bookmark/types';

const props = defineProps<{
  bookmarks: Bookmark[];
}>();

const subTabs = [
  { key: 'card', label: '书摘卡片' },
  { key: 'timeline', label: '时间线' },
];
const activeSubTab = ref('card');

// ========== 书摘卡片 ==========
const reviewIndex = ref(0);
const touchStartX = ref(0);
const touchEndX = ref(0);
const slideDirection = ref('slide-left');

const currentReviewBookmark = computed(() => props.bookmarks[reviewIndex.value]);

// 背景设置（沿用 localStorage 配置）
interface BookmarkSettings {
  backgroundMode: 'color' | 'cover' | 'custom';
  selectedColorIndex: number;
  coverOpacity: number;
  coverBlur: number;
  customBackground: string;
  customOpacity: number;
  customBlur: number;
}
const bookmarkSettings = ref<BookmarkSettings>({
  backgroundMode: 'color',
  selectedColorIndex: 0,
  coverOpacity: 0.3,
  coverBlur: 8,
  customBackground: '',
  customOpacity: 0.5,
  customBlur: 5,
});

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #0c0c0c 0%, #434343 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
  'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
];

const reviewCardStyle = computed(() => {
  const settings = bookmarkSettings.value;
  const currentBookmark = currentReviewBookmark.value;
  const coverUrl = (currentBookmark as any)?.coverUrl || (currentBookmark as any)?.localCoverData;

  if (settings.backgroundMode === 'color') {
    return { background: gradients[settings.selectedColorIndex] || gradients[0] };
  } else if (settings.backgroundMode === 'cover') {
    if (coverUrl) {
      return {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative' as const,
      };
    }
    return { background: gradients[0] };
  } else if (settings.backgroundMode === 'custom' && settings.customBackground) {
    return {
      backgroundImage: `url(${settings.customBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { background: gradients[0] };
});

const overlayStyle = computed(() => {
  const settings = bookmarkSettings.value;
  if (settings.backgroundMode === 'cover') {
    return {
      background: `rgba(0, 0, 0, ${settings.coverOpacity})`,
      backdropFilter: `blur(${settings.coverBlur}px)`,
    };
  } else if (settings.backgroundMode === 'custom' && settings.customBackground) {
    return {
      background: `rgba(0, 0, 0, ${settings.customOpacity})`,
      backdropFilter: `blur(${settings.customBlur}px)`,
    };
  }
  return { background: 'transparent' };
});

const loadBookmarkSettings = () => {
  try {
    const saved = localStorage.getItem('bookmarkSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      bookmarkSettings.value = {
        backgroundMode: settings.backgroundMode || 'color',
        selectedColorIndex: settings.selectedColorIndex || 0,
        coverOpacity: settings.coverOpacity ?? 0.3,
        coverBlur: settings.coverBlur ?? 8,
        customBackground: settings.customBackground || '',
        customOpacity: settings.customOpacity ?? 0.5,
        customBlur: settings.customBlur ?? 5,
      };
    }
  } catch {
    /* 忽略 */
  }
};

const prevReview = () => {
  if (reviewIndex.value > 0) {
    slideDirection.value = 'slide-right';
    reviewIndex.value--;
  }
};
const nextReview = () => {
  if (reviewIndex.value < props.bookmarks.length - 1) {
    slideDirection.value = 'slide-left';
    reviewIndex.value++;
  }
};
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
};
const handleTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].clientX;
  const diff = touchStartX.value - touchEndX.value;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextReview();
    else prevReview();
  }
};

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

// ========== 时间线子 tab：书籍分组 ==========
interface BookGroup {
  bookId: string | number;
  title: string;
  author?: string;
  cover?: string;
  items: Bookmark[];
}

const bookGroups = computed<BookGroup[]>(() => {
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
      author: (items[0] as any)?.bookAuthor || (items[0] as any)?.author || '',
      cover: (items[0] as any)?.coverUrl || (items[0] as any)?.localCoverData || '',
      items: [...items].sort((a, b) => {
        const pa = a.pageNum ?? (a as any).page ?? 0;
        const pb = b.pageNum ?? (b as any).page ?? 0;
        return pa - pb;
      }),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
});

const selectedBookId = ref<string | number | null>(null);
const selectBook = (id: string | number) => {
  selectedBookId.value = id;
};

const activeBook = computed<BookGroup | null>(() =>
  bookGroups.value.find(g => g.bookId === selectedBookId.value) || null
);

// 书摘列表变化时，若当前选中的书已不存在则清空选择
watch(bookGroups, (groups) => {
  if (selectedBookId.value && !groups.some(g => g.bookId === selectedBookId.value)) {
    selectedBookId.value = null;
  }
});

// 组件挂载时加载设置
loadBookmarkSettings();
</script>

<style scoped>
.review-section {
  width: 100%;
}

/* 子 tab */
.sub-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 12px;
  margin-bottom: 16px;
}
.sub-tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.sub-tab-item.active {
  background: var(--bg-main, #fff);
  color: var(--text-primary, #222);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.sub-content {
  min-height: 400px;
}

/* ========== 书摘卡片样式（沿用原回顾卡片） ========== */
.review-card {
  position: relative;
  /* 高度贴合屏幕：上限为视口高度减去页面头部/tab 占位，过长内容在卡片内滚动 */
  min-height: min(360px, calc(100dvh - 220px));
  max-height: calc(100dvh - 220px);
  border-radius: 20px;
  padding: 36px 28px 24px;
  color: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}
.review-card-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.review-content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  /* grid + safe center：内容短时垂直居中，过长时顶部对齐并可滚动 */
  display: grid;
  align-content: safe center;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.review-text {
  font-size: 18px;
  line-height: 1.8;
  margin: 0 0 16px;
  white-space: pre-wrap;
  word-break: break-word;
}
.review-note {
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
  opacity: 0.85;
}
.review-meta {
  position: relative;
  z-index: 1;
  margin-top: 16px;
}
.review-book {
  font-size: 14px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}
.review-info {
  font-size: 12px;
  opacity: 0.8;
}
.review-nav {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
}
.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.nav-btn svg { width: 20px; height: 20px; fill: currentColor; }
.review-progress {
  font-size: 13px;
  font-weight: 500;
}

.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.3s ease;
}
.slide-left-enter-from { opacity: 0; transform: translateX(30px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.slide-right-leave-to { opacity: 0; transform: translateX(30px); }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-hint, #999);
}
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }

/* ========== 时间线子 tab：书籍卡片网格 ========== */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 16px 14px;
}
.book-tile {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s;
}
.book-tile:active { transform: scale(0.97); }

.book-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary, #eee);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 8px;
}
.book-cover-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
/* 右上角灰色圆形徽章：书摘数量 */
.book-count-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(2px);
}

.book-tile-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #222);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.book-tile-author {
  font-size: 11px;
  color: var(--text-hint, #999);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 单本书时间线视图 */
.book-timeline-view {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}
.back-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0 12px;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 50%;
  cursor: pointer;
  color: #333;
}
.back-btn svg { width: 20px; height: 20px; fill: currentColor; }
.back-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.back-spacer { width: 32px; }

/* 时间线主体（沿用 BookmarkTimeline 样式） */
.tl-scroll {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 4px;
}
.tl-timeline { display: flex; flex-direction: column; }
.tl-node { display: flex; gap: 14px; position: relative; }
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
.tl-dot.first { box-shadow: 0 0 0 5px rgba(255, 107, 53, 0.18); }
.tl-line { flex: 1; width: 2px; background: #e5e5e5; }

.tl-card {
  flex: 1;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #eee);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
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
  border-radius: 8px;
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
.card-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.mini-tag {
  padding: 1px 6px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--primary-color, #ff6b35);
  border-radius: 4px;
  font-size: 11px;
}

.tl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* 响应式：大屏适当调宽 */
@media (min-width: 768px) {
  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
