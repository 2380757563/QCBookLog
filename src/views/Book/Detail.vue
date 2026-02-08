<template>
  <div class="detail-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书籍详情</h1>
      <button class="action-btn" @click="showActions = !showActions">
        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </button>
      <!-- 操作菜单 -->
      <div v-if="showActions" class="actions-menu">
        <div class="menu-item" @click="handleEdit">
          <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>编辑</span>
        </div>
        <div class="menu-item" @click="handleDelete">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          <span>删除</span>
        </div>
      </div>
    </div>

    <div v-if="book" class="content">
      <!-- 书籍基本信息 -->
      <div class="book-hero">
        <div class="book-cover">
          <img v-if="book.coverUrl" :src="book.coverUrl" :alt="book.title" />
          <div v-else class="cover-placeholder">
            <span>{{ book.title.charAt(0) }}</span>
          </div>
        </div>
        <div class="book-meta">
          <h2 class="book-title">{{ book.title }}</h2>
          <p class="book-author">{{ book.author }}</p>
          <div class="book-status" :class="`status--${book.readStatus}`">
            {{ book.readStatus }}
          </div>
          <div v-if="book.rating" class="book-rating">
            <span class="stars">{{ '★'.repeat(Math.floor(book.rating)) }}{{ '☆'.repeat(5 - Math.floor(book.rating)) }}</span>
            <span class="rating-value">{{ book.rating.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <!-- 书籍详细信息 -->
      <div class="card">
        <h3 class="card-title">书籍信息</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">ISBN</span>
            <span class="info-value">{{ book.isbn }}</span>
          </div>
          <div class="info-item" v-if="book.publisher">
            <span class="info-label">出版社</span>
            <span class="info-value">{{ book.publisher }}</span>
          </div>
          <div class="info-item" v-if="book.publishYear">
            <span class="info-label">出版年份</span>
            <span class="info-value">{{ book.publishYear }}</span>
          </div>
          <div class="info-item" v-if="book.pages">
            <span class="info-label">页数</span>
            <span class="info-value">{{ book.pages }} 页</span>
          </div>
          <div class="info-item" v-if="book.binding1 !== undefined">
            <span class="info-label">装帧</span>
            <span class="info-value">
              {{ 
                book.binding1 === 0 ? '电子书' : 
                book.binding1 === 1 ? '平装' : 
                book.binding1 === 2 ? '精装' : '特殊装帧' 
              }}
              <span v-if="book.binding2 !== undefined && book.binding2 !== 0">
                - {{ 
                  (book.binding1 === 0 && book.binding2 === 1) ? '精校版' :
                  (book.binding1 === 0 && book.binding2 === 2) ? '魔改版' :
                  (book.binding1 === 0 && book.binding2 === 3) ? '原版' :
                  (book.binding1 === 1 && book.binding2 === 1) ? '无线胶装' :
                  (book.binding1 === 1 && book.binding2 === 2) ? '骑马钉装订' :
                  (book.binding1 === 1 && book.binding2 === 3) ? '活页装订' :
                  (book.binding1 === 1 && book.binding2 === 4) ? '锁线胶装' :
                  (book.binding1 === 2 && book.binding2 === 1) ? '硬壳精装（圆脊）' :
                  (book.binding1 === 2 && book.binding2 === 2) ? '硬壳精装（方脊）' :
                  (book.binding1 === 2 && book.binding2 === 3) ? '布面精装' :
                  (book.binding1 === 2 && book.binding2 === 4) ? 'PU 皮面精装' :
                  (book.binding1 === 2 && book.binding2 === 5) ? '真皮精装（头层牛皮）' :
                  (book.binding1 === 2 && book.binding2 === 6) ? '真皮精装（羊皮）' :
                  (book.binding1 === 2 && book.binding2 === 7) ? '仿皮（人造革）精装' :
                  (book.binding1 === 3 && book.binding2 === 1) ? '线装' :
                  (book.binding1 === 3 && book.binding2 === 2) ? '经折装' : ''
                }}
              </span>
            </span>
          </div>
          <div class="info-item" v-if="book.paper1 !== undefined && book.paper1 !== 0">
            <span class="info-label">纸张</span>
            <span class="info-value">
              {{ 
                book.paper1 === 1 ? '胶版纸（双胶纸）' :
                book.paper1 === 2 ? '轻型纸' :
                book.paper1 === 3 ? '道林纸' :
                book.paper1 === 4 ? '铜版纸' :
                book.paper1 === 5 ? '牛皮纸' :
                book.paper1 === 6 ? '宣纸' :
                book.paper1 === 7 ? '进口特种纸' : ''
              }}
            </span>
          </div>
          <div class="info-item" v-if="book.edge1 !== undefined && book.edge1 !== 0">
            <span class="info-label">刷边</span>
            <span class="info-value">
              {{ 
                book.edge1 === 1 ? '书口单侧' :
                book.edge1 === 2 ? '多侧（书口+天头/地脚）' :
                book.edge1 === 3 ? '全三边' : ''
              }}
              <span v-if="book.edge2 !== undefined && book.edge2 !== 0">
                - {{ 
                  book.edge2 === 1 ? '基础单色' :
                  book.edge2 === 2 ? '烫边（烫金/银）' :
                  book.edge2 === 3 ? '磨边（毛边）' :
                  book.edge2 === 4 ? '彩绘艺术刷边' :
                  book.edge2 === 5 ? '鎏金高端刷边' : ''
                }}
              </span>
            </span>
          </div>
          <div class="info-item" v-if="book.standardPrice">
            <span class="info-label">标准价格</span>
            <span class="info-value">¥{{ book.standardPrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.purchasePrice">
            <span class="info-label">购入价格</span>
            <span class="info-value">¥{{ book.purchasePrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.series">
            <span class="info-label">丛书</span>
            <span class="info-value">{{ book.series }}</span>
          </div>
        </div>
      </div>

      <!-- 阅读信息 -->
      <div class="card" v-if="book.readStatus === '已读' || book.purchaseDate || book.read_pages">
        <h3 class="card-title">阅读信息</h3>
        <div class="info-list">
          <!-- 阅读进度条 -->
          <div v-if="readingStore.progressDisplayMode === 'progress' && book.read_pages && (book.pages || book.page_count)" class="reading-progress-section">
            <ReadingProgressBarList :book="book" :show-duration="true" />
          </div>
          <div class="info-item" v-if="book.readCompleteDate">
            <span class="info-label">完成日期</span>
            <span class="info-value">{{ formatDate(book.readCompleteDate) }}</span>
          </div>
          <div class="info-item" v-if="book.purchaseDate">
            <span class="info-label">购买日期</span>
            <span class="info-value">{{ formatDate(book.purchaseDate) }}</span>
          </div>
          <div class="info-item" v-if="book.purchasePrice">
            <span class="info-label">购买价格</span>
            <span class="info-value">¥{{ book.purchasePrice.toFixed(2) }}</span>
          </div>
          <div class="info-item" v-if="book.standardPrice">
            <span class="info-label">标准价格</span>
            <span class="info-value">¥{{ book.standardPrice.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- 开始阅读按钮 -->
      <button
        v-if="book && !isCurrentlyReadingBook"
        class="start-reading-btn"
        @click="handleStartReading"
      >
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        <span>开始阅读</span>
      </button>

      <!-- 分组 -->
      <div class="card" v-if="bookGroups.length > 0 || (book.calibreTags && book.calibreTags.length > 0)">
        <h3 class="card-title">分组与标签</h3>
        <div v-if="bookGroups.length > 0" class="tags-section">
          <span class="tags-label">分组</span>
          <div class="tags-list">
            <span v-for="group in bookGroups" :key="group.id" class="tag-item">
              {{ group.name }}
            </span>
          </div>
        </div>
        <div v-if="book.calibreTags && book.calibreTags.length > 0" class="tags-section">
          <span class="tags-label">Calibre标签</span>
          <div class="tags-list">
            <span v-for="tag in book.calibreTags" :key="tag" class="tag-item calibre-tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 书籍简介 -->
      <div class="card" v-if="book.description">
        <h3 class="card-title">书籍简介</h3>
        <div class="description-content">
          <p>{{ book.description }}</p>
        </div>
      </div>

      <!-- 备注 -->
      <div class="card" v-if="book.note">
        <h3 class="card-title">备注</h3>
        <p class="note-content">{{ book.note }}</p>
      </div>

      <!-- 相关书摘 -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">相关书摘</h3>
          <span class="card-count">{{ filteredBookmarks.length }} 条</span>
        </div>
        <div v-if="filteredBookmarks.length > 0" class="bookmarks-list">
          <div
            v-for="bookmark in filteredBookmarks.slice(0, 5)"
            :key="bookmark.id"
            class="bookmark-item"
            @click="goToBookmarkDetail(bookmark.id)"
          >
            <p class="bookmark-content">{{ bookmark.content }}</p>
            <div class="bookmark-meta">
              <span v-if="bookmark.pageNum">第 {{ bookmark.pageNum }} 页</span>
              <span>{{ formatDate(bookmark.createTime) }}</span>
            </div>
          </div>
          <button
            v-if="filteredBookmarks.length > 5"
            class="btn-text"
            @click="goToBookmarks"
          >
            查看全部 {{ filteredBookmarks.length }} 条书摘
          </button>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📝</span>
          <p>暂无书摘</p>
          <button class="btn-primary" @click="goToAddBookmark">添加书摘</button>
        </div>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>确认删除</span>
          <span class="dialog-close" @click="showDeleteConfirm = false">×</span>
        </div>
        <div class="dialog-body">
          <p>确定要删除《{{ book?.title }}》吗？删除后无法恢复。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookStore } from '@/store/book';
import { useReaderStore } from '@/store/reader';
import { useReadingStore } from '@/store/reading';
import { bookService } from '@/services/book';
import { bookmarkService } from '@/services/bookmark';
import readingTrackingService from '@/services/readingTracking';
import type { Book, BookGroup, ReadingState } from '@/services/book/types';
import type { Bookmark } from '@/services/bookmark/types';
import ReadingProgressBarList from '@/components/ReadingProgressBarList/ReadingProgressBarList.vue';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();
const readerStore = useReaderStore();
const readingStore = useReadingStore();

const book = ref<Book | null>(null);
const bookmarks = ref<Bookmark[]>([]);
const bookGroups = ref<BookGroup[]>([]);
const showActions = ref(false);
const showDeleteConfirm = ref(false);
const readingState = ref<ReadingState>({
  book_id: 0,
  reader_id: 0,
  favorite: 0,
  favorite_date: null,
  wants: 0,
  wants_date: null,
  read_state: 0,
  read_date: null,
  online_read: 0,
  download: 0
});
const currentReadingState = ref<number>(0);

// 过滤后的书摘列表，确保只显示与当前书籍ID匹配的书摘
const filteredBookmarks = computed(() => {
  if (!book.value) return [];

  const result = bookmarks.value.filter(bm => {
    // 兼容 bookId 和 bookId 字段
    const bookmarkBookId = bm.bookId !== undefined ? bm.bookId : bm.book_id;
    const isValid = bookmarkBookId === book.value?.id;

    if (!isValid && bm.id) {
      console.warn(`⚠️ 书摘 ${bm.id} 的书籍ID (${bookmarkBookId}) 不匹配当前书籍ID (${book.value?.id})，将被过滤掉`);
    }

    return isValid;
  });

  return result;
});

// 判断当前是否正在阅读这本书
const isCurrentlyReadingBook = computed(() => {
  return readingStore.isReading && readingStore.currentBookId === book.value?.id;
});

// 返回
const goBack = () => {
  router.back();
};

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 编辑
const handleEdit = () => {
  showActions.value = false;
  router.push(`/book/edit/${book.value?.id}`);
};

// 删除
const handleDelete = () => {
  showActions.value = false;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!book.value) return;
  try {
    await bookService.deleteBook(book.value.id);
    bookStore.deleteBook(book.value.id);
    router.back();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 导航
const goToBookmarkDetail = (id: string) => {
  router.push(`/bookmark/detail/${id}`);
};

const goToBookmarks = () => {
  // 使用正确的书籍ID（数字类型）
  const bookId = book.value?.id;

  router.push({ path: '/bookmark', query: { bookId: bookId } });
};

const goToAddBookmark = () => {
  router.push({ path: '/bookmark/edit', query: { bookId: book.value?.id } });
};

// 更新阅读进度
const handleUpdateProgress = async (page: number) => {
  if (!book.value) return;

  try {
    // 将页码转换为进度百分比
    const progress = book.value.pages ? Math.round((page / book.value.pages) * 100) : 0;

    await bookService.updateBook(book.value.id, {
      progress
    });

    if (book.value) {
      book.value.progress = progress;
      bookStore.addBook(book.value);
    }
  } catch (error) {
    console.error('更新阅读进度失败:', error);
  }
};

// 加载阅读状态
const loadReadingState = async () => {
  if (!book.value) return;

  try {
    const state = await bookService.getReadingState(book.value.id, readerStore.currentReaderId);
    if (state) {
      readingState.value = state;
      currentReadingState.value = state.read_state;
    }
  } catch (error) {
    console.error('加载阅读状态失败:', error);
  }
};

// 加载阅读统计
const loadReadingStats = async () => {
  if (!book.value) return;

  try {
    const stats = await readingTrackingService.getBookReadingStats(book.value.id);
    // 将统计信息应用到书籍对象
    if (stats && book.value) {
      book.value.read_pages = stats.readPages;
      book.value.page_count = stats.totalPages;
      book.value.total_reading_time = stats.totalReadingTime;
      book.value.reading_count = stats.readingCount;
      book.value.last_read_date = stats.lastReadDate;
      book.value.last_read_duration = stats.lastReadDuration;
      // 使用 page_count 作为 pages（兼容不同字段名）
      if (!book.value.pages && stats.totalPages) {
        book.value.pages = stats.totalPages;
      }

    }
  } catch (error) {
    console.error('加载阅读统计失败:', error);
  }
};

// 开始阅读
const handleStartReading = () => {
  if (!book.value) return;

  // 计算开始页码（基于当前已读页数）
  const startPage = book.value.read_pages || 0;

  // 调用 store 开始阅读
  readingStore.startReading(
    book.value.id,
    book.value.title || '未知书名',
    startPage
  );

  // 跳转到阅读页面
  router.push(`/book/reading/${book.value.id}`);
};

// 加载数据
onMounted(async () => {
  // 加载阅读设置中的进度显示模式
  readingStore.loadProgressDisplayMode();

  const bookIdStr = route.params.id as string;
  const bookId = Number(bookIdStr);


  try {
    // 优先从缓存中获取书籍信息
    let cachedBook = bookStore.getBookById(bookId);

    if (cachedBook) {

      book.value = cachedBook;
    } else {

      book.value = await bookService.getBookById(bookId) || null;
      // 加载成功后更新缓存
      if (book.value) {
        // 将API返回的tags字段（Calibre标签）复制到calibreTags
        if (Array.isArray(book.value.tags)) {
          book.value.calibreTags = book.value.tags as string[];
          // 清空tags字段，用于应用自己的Tag系统
          book.value.tags = [];
        }
        bookStore.addBook(book.value);
      }
    }

    if (book.value) {

      // 加载相关书摘
      bookmarks.value = await bookmarkService.getBookmarksByBookId(bookId);

      console.log('书摘详情:', bookmarks.value.map(b => ({
        id: b.id,
        bookId: b.bookId,
        content: b.content?.substring(0, 30) + '...'
      })));

      // 加载分组信息
      const allGroups = await bookService.getAllGroups();
      bookGroups.value = allGroups.filter(g => book.value?.groups.includes(g.id));

      // 加载阅读状态
      await loadReadingState();

      // 加载阅读统计
      await loadReadingStats();
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style scoped>
.detail-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn,
.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn svg,
.action-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.actions-menu {
  position: absolute;
  top: 100%;
  right: 16px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 200;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item svg {
  width: 20px;
  height: 20px;
  fill: var(--text-secondary);
}

.content {
  padding: 16px;
}

/* 书籍头部 */
.book-hero {
  display: flex;
  gap: 16px;
  padding: 24px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.book-cover {
  width: 100px;
  height: 133px;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
}

.book-cover img {
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32px;
  font-weight: 500;
}

.book-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.book-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.book-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  margin-bottom: 8px;
}

.status--未读 { background-color: #9e9e9e; }
.status--在读 { background-color: var(--primary-color); }
.status--已读 { background-color: #4caf50; }

.book-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  color: #ffc107;
  font-size: 16px;
}

.rating-value {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 卡片 */
.card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.card-count {
  font-size: 14px;
  color: var(--text-hint);
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: var(--text-hint);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

/* 开始阅读按钮 */
.start-reading-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
  margin-bottom: 16px;
}

.start-reading-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}

.start-reading-btn:active {
  transform: translateY(0);
}

.start-reading-btn svg {
  width: 24px;
  height: 24px;
  fill: white;
}

/* 阅读状态 */
.reading-state-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reading-status-buttons {
  display: flex;
  gap: 8px;
}

.status-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-light);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  background-color: var(--bg-hover);
}

.status-btn.active {
  background-color: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
}

.reading-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

/* 标签 */
.tags-section {
  margin-bottom: 12px;
}

.tags-section:last-child {
  margin-bottom: 0;
}

.tags-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 8px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.calibre-tag {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

/* 书籍简介 */
.description-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap; /* 保留换行符 */
  overflow-wrap: break-word; /* 长单词换行 */
}

.description-content p {
  margin: 0 0 12px 0;
}

.description-content p:last-child {
  margin-bottom: 0;
}

/* 备注 */
.note-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 书摘列表 */
.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bookmark-item {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.3s;
}

.bookmark-item:hover {
  background-color: #f0f0f0;
}

.bookmark-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bookmark-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-hint);
}

.btn-text {
  width: 100%;
  padding: 12px;
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  color: var(--text-hint);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-primary {
  padding: 10px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

/* 加载 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-hint);
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
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 320px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 500;
}

.dialog-close {
  font-size: 24px;
  color: var(--text-hint);
  cursor: pointer;
}

.dialog-body {
  padding: 24px 16px;
}

.dialog-body p {
  margin: 0;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

.btn-default {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

.btn-danger {
  background-color: #f44336;
  color: #fff;
}
</style>