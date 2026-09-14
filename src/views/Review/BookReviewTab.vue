<template>
  <div class="book-review-tab">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">书评</span>
        <span class="toolbar-count" v-if="reviews.length > 0">{{ reviews.length }} 篇</span>
      </div>
      <div class="toolbar-right">
        <button
          class="sync-btn"
          :class="{ disabled: !gitSyncStore.configured || gitSyncStore.syncing }"
          @click="handleSyncAll"
          :disabled="gitSyncStore.syncing"
          :title="gitSyncStore.configured ? '同步到 GitHub' : '请先在设置中配置 GitHub 同步'"
        >
          <svg v-if="!gitSyncStore.syncing" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
          <svg v-else class="spin" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
          <span>{{ gitSyncStore.syncing ? '同步中...' : '同步' }}</span>
        </button>
        <span v-if="pendingCount > 0" class="pending-count" :title="`${pendingCount} 篇未同步`">{{ pendingCount }} 待同步</span>
      </div>
    </div>

    <!-- 书评列表（多列瀑布流：首行齐平，后续按内容高低错落） -->
    <div v-if="reviews.length > 0" class="reviews-grid">
      <div v-for="(col, colIdx) in reviewColumns" :key="colIdx" class="reviews-column">
        <div
          v-for="item in col"
          :key="item.review.id"
          class="review-card"
          :style="{ backgroundColor: getNoteColor(item.colorIdx) }"
          @click="goToEditReview(item.review.id)"
        >
          <!-- 图片缩略图：仅当书评内容含图片时显示，无图不占位 -->
          <img
            v-if="extractImage(item.review.content)"
            class="card-image"
            :src="extractImage(item.review.content) || ''"
            :alt="item.review.title || '书评图片'"
            loading="lazy"
          />
          <!-- 文字内容 -->
          <div class="card-content">
            <div class="card-meta">
              <span v-if="item.review.bookTitle" class="card-book">《{{ item.review.bookTitle }}》</span>
              <span v-if="item.review.rating" class="card-rating">
                <span v-for="i in 5" :key="i" :class="['star', { filled: i <= item.review.rating }]">★</span>
              </span>
            </div>
            <h3 v-if="item.review.title" class="card-title">{{ item.review.title }}</h3>
            <p class="card-preview" :style="{ WebkitLineClamp: getPreviewLines(item.review.content) }">{{ getPreview(item.review.content) }}</p>
            <div class="card-footer">
              <span class="card-time">{{ formatDate(item.review.createTime) }}</span>
              <span
                v-if="item.review.syncStatus === 'pending' || item.review.syncStatus === 'none'"
                class="status-dot pending"
                title="未同步"
              ></span>
              <span v-else-if="item.review.syncStatus === 'synced'" class="status-dot synced" title="已同步"></span>
              <span v-else-if="item.review.syncStatus === 'failed'" class="status-dot failed" title="同步失败"></span>
            </div>
          </div>
          <!-- 操作按钮（hover 显示） -->
          <div class="card-actions" @click.stop>
            <button class="card-action-btn" @click="goToEditReview(item.review.id)" title="编辑">
              <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="card-action-btn" @click="goToHistory(item.review.id)" title="历史版本">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2a2 2 0 0 0 2-2v-.41A7.97 7.97 0 0 1 19 12c0 2.14-.84 4.1-2.1 5.39z"/></svg>
            </button>
            <button class="card-action-btn danger" @click="handleDelete(item.review)" title="删除">
              <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">✍️</span>
      <p>还没有书评</p>
      <button class="btn-primary" @click="goToCreateReview">写第一篇书评</button>
    </div>

    <!-- 浮动添加按钮 -->
    <button v-if="reviews.length > 0" class="fab" @click="goToCreateReview">
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>确认删除</span>
          <span class="dialog-close" @click="showDeleteConfirm = false">×</span>
        </div>
        <div class="dialog-body">
          <p>确定要删除这篇书评吗？</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { reviewService } from '@/api/review';
import { useReviewStore } from '@/stores/review';
import { useGitSyncStore } from '@/stores/gitSync';
import type { Review } from '@/api/review/types';

const router = useRouter();
const reviewStore = useReviewStore();
const gitSyncStore = useGitSyncStore();

const reviews = ref<Review[]>([]);
const showDeleteConfirm = ref(false);
const deletingReview = ref<Review | null>(null);

// 瀑布流列数：根据屏幕宽度自适应
const columnCount = ref(4);

const updateColumnCount = () => {
  const w = window.innerWidth;
  if (w < 520) columnCount.value = 2;
  else if (w < 768) columnCount.value = 3;
  else if (w < 1100) columnCount.value = 4;
  else columnCount.value = 5;
};

// 把书评轮流分配到各列（第一张都在各列顶部，自然齐平）
interface ReviewColumnItem {
  review: Review;
  colorIdx: number;
}

const reviewColumns = computed<ReviewColumnItem[][]>(() => {
  const cols: ReviewColumnItem[][] = Array.from({ length: columnCount.value }, () => []);
  reviews.value.forEach((review, idx) => {
    cols[idx % columnCount.value].push({ review, colorIdx: idx });
  });
  return cols;
});

// 小米笔记风格的柔和彩色背景（按索引循环分配）
const NOTE_COLORS = [
  '#ffffff',   // 白
  '#fff9e6',   // 米黄
  '#fff0f0',   // 粉
  '#e8f5e9',   // 浅绿
  '#e3f2fd',   // 浅蓝
  '#f3e5f5',   // 浅紫
  '#fff3e0',   // 橙
];

const getNoteColor = (idx: number): string => NOTE_COLORS[idx % NOTE_COLORS.length];

const pendingCount = computed(() =>
  reviews.value.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'none').length
);

const handleSyncAll = async () => {
  if (!gitSyncStore.configured) {
    alert('请先在「设置 → GitHub 同步」中配置仓库地址和 Token');
    return;
  }
  try {
    const result = await gitSyncStore.syncAll();
    if (result.note) {
      alert(result.note);
    } else {
      await loadReviews();
      alert(result.pushed ? '同步成功！' : '已提交到本地仓库');
    }
  } catch (err: any) {
    alert('同步失败：' + (err?.message || '未知错误'));
  }
};

const loadReviews = async () => {
  try {
    const data = await reviewService.getAllReviews();
    reviews.value = data;
    reviewStore.setReviews(data);
  } catch (error) {
    console.error('加载书评失败:', error);
  }
};

const getPreview = (content: string): string => {
  if (!content) return '';
  // 去除 markdown 语法，保留纯文本，按卡片自然截断
  const text = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[#*_~`>\\|]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n/g, ' ')
    .trim();
  return text.length > 200 ? text.substring(0, 200) + '…' : text;
};

// 提取书评内容里的第一张 markdown 图片 URL（无图返回 undefined，不占位）
const extractImage = (content: string): string | undefined => {
  if (!content) return undefined;
  const match = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
  return match ? match[1] : undefined;
};

// 根据内容长度决定正文预览行数（3~8 行），内容越多卡片越高，形成错落
const getPreviewLines = (content: string): number => {
  const len = getPreview(content).length;
  if (len <= 30) return 4;
  if (len <= 60) return 6;
  if (len <= 100) return 9;
  if (len <= 150) return 12;
  return 16;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (sameYear) {
    return `${m}月${d}日`;
  }
  return `${date.getFullYear()}/${m}/${d}`;
};

const goToCreateReview = () => {
  router.push('/review/edit');
};

const goToEditReview = (id: string | number) => {
  router.push(`/review/edit/${id}`);
};

const goToHistory = (id: string | number) => {
  router.push(`/review/history/${id}`);
};

const handleDelete = (review: Review) => {
  deletingReview.value = review;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!deletingReview.value) return;
  try {
    await reviewService.deleteReview(deletingReview.value.id);
    reviews.value = reviews.value.filter(r => r.id !== deletingReview.value!.id);
    reviewStore.deleteReview(deletingReview.value.id);
    showDeleteConfirm.value = false;
    deletingReview.value = null;
  } catch (error) {
    console.error('删除书评失败:', error);
  }
};

onMounted(() => {
  updateColumnCount();
  window.addEventListener('resize', updateColumnCount);
  loadReviews();
  gitSyncStore.fetchStatus().catch(() => {});
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateColumnCount);
});
</script>

<style scoped>
.book-review-tab {
  position: relative;
  min-height: 300px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.toolbar-count {
  font-size: 13px;
  color: var(--text-hint, #999);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: var(--radius-md, 8px);
  background-color: #fff;
  color: var(--text-secondary, #555);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.sync-btn:not(.disabled):hover {
  border-color: var(--primary-color, #FF6B35);
  color: var(--primary-color, #FF6B35);
}

.sync-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.sync-btn svg.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pending-count {
  padding: 2px 8px;
  background-color: #fff3e0;
  color: #ff9800;
  border-radius: 10px;
  font-size: 12px;
}

/* 多列瀑布流：JS 分列，首行齐平、各列高低错落 */
.reviews-grid {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.reviews-column {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  width: 100%;
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  min-height: 120px;
  /* 最大高度以屏幕为准：视口高度减去页面头部/tab/工具栏占位，过长内容在卡片内滚动 */
  max-height: calc(100dvh - 220px);
  display: flex;
  flex-direction: column;
}

.review-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 图片缩略图：按图片原始比例展示，限制最大高度 */
.card-image {
  width: 100%;
  display: block;
  max-height: 220px;
  object-fit: cover;
  background-color: #eee;
}

/* 文字内容 */
.card-content {
  padding: 12px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
  /* 内容超出卡片时在卡片内滚动 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.card-book {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}

.card-rating {
  display: flex;
  gap: 1px;
  flex-shrink: 0;
}

.card-rating .star {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.15);
}

.card-rating .star.filled {
  color: #ffb300;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #222;
  line-height: 1.4;
  margin: 0;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-preview {
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary, #666);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-hint, #999);
}

.card-time {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.pending { background-color: #ff9800; }
.status-dot.synced  { background-color: #4caf50; }
.status-dot.failed  { background-color: #f44336; }

/* 操作按钮 */
.card-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.review-card:hover .card-actions {
  opacity: 1;
}

.card-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-action-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.card-action-btn:hover {
  background-color: #fff;
  color: #333;
}

.card-action-btn.danger:hover {
  color: #f44336;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint, #999);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.btn-primary {
  padding: 10px 24px;
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
}

/* FAB */
.fab {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
  z-index: 100;
  transition: all 0.2s;
}

/* 桌面端：无底部导航栏，FAB 回到底部 */
@media (min-width: 1024px) {
  .fab {
    bottom: 24px;
  }
}

.fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
}

.fab svg {
  width: 26px;
  height: 26px;
  fill: currentColor;
}

/* 弹窗 */
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
  z-index: 2000;
}

.dialog {
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-lg, 12px);
  width: 300px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
  font-size: 16px;
  font-weight: 500;
}

.dialog-close {
  font-size: 24px;
  color: var(--text-hint, #999);
  cursor: pointer;
}

.dialog-body {
  padding: 24px 16px;
}

.dialog-body p {
  margin: 0;
  color: var(--text-secondary, #666);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-light, #e0e0e0);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  cursor: pointer;
}

.btn-default {
  background-color: #f5f5f5;
  color: var(--text-secondary, #666);
}

.btn-danger {
  background-color: #f44336;
  color: #fff;
}
</style>
