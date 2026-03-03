<template>
  <div class="bookmark-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="search-bar" @click="showSearch = true">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <span>搜索书摘...</span>
      </div>
      <button class="action-btn add-btn" @click="goToAddBookmark">
        <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>
    </div>

    <!-- Tab切换 -->
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 书摘列表 -->
      <div v-show="activeTab === 'list'" class="tab-content">
        <!-- 筛选条件 -->
        <div class="filter-chips">
          <span
            :class="['chip', { active: !selectedTag }]"
            @click="selectedTag = ''"
          >
            全部
            <span class="tag-count">{{ totalBookmarkCount }}</span>
          </span>
          <span
            v-for="tag in allTags"
            :key="tag.tag_id"
            :class="['chip', { active: selectedTag === tag.tag_id }]"
            @click="selectedTag = tag.tag_id"
          >
            {{ tag.tag_id }}
            <span class="tag-count">{{ tag.count }}</span>
          </span>
        </div>

        <div v-if="filteredBookmarks.length > 0" class="bookmarks-list">
          <div
            v-for="bookmark in filteredBookmarks"
            :key="bookmark.id"
            class="bookmark-card"
            @click="goToBookmarkDetail(bookmark.id)"
          >
            <div v-if="bookmark.bookTitle" class="bookmark-book">{{ bookmark.bookTitle }}</div>
            <p class="bookmark-content">{{ bookmark.content }}</p>
            <p v-if="bookmark.note" class="bookmark-note">{{ bookmark.note }}</p>
            <div class="bookmark-footer">
              <span v-if="bookmark.pageNum" class="page-num">第 {{ bookmark.pageNum }} 页</span>
              <span class="create-time">{{ formatDate(bookmark.createTime) }}</span>
              <span v-if="bookmark.updateTime" class="update-time">更新于 {{ formatDate(bookmark.updateTime) }}</span>
              <div class="bookmark-tags">
                <span
                  v-for="tag in bookmark.tags"
                  :key="tag"
                  class="mini-tag"
                >{{ tag }}</span>
              </div>
            </div>
            <div class="bookmark-actions">
              <button class="action-btn-sm" @click.stop="handleEdit(bookmark.id)">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>
              </button>
              <button class="action-btn-sm" @click.stop="handleDelete(bookmark.id)">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📝</span>
          <p>暂无书摘</p>
          <button class="btn-primary" @click="goToAddBookmark">添加第一条书摘</button>
        </div>
      </div>

      <!-- 回顾页面 -->
      <div v-show="activeTab === 'review'" class="tab-content review-tab">
        <div v-if="allBookmarks.length > 0" class="review-card" :style="reviewCardStyle" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
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
            <span class="review-progress">{{ reviewIndex + 1 }} / {{ allBookmarks.length }}</span>
            <button class="nav-btn" @click="nextReview" :disabled="reviewIndex >= allBookmarks.length - 1">
              <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📚</span>
          <p>暂无书摘可回顾</p>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>确认删除</span>
          <span class="dialog-close" @click="showDeleteConfirm = false">×</span>
        </div>
        <div class="dialog-body">
          <p>确定要删除这条书摘吗？</p>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookmarkStore } from '@/store/bookmark';
import { useBookStore } from '@/store/book';
import { bookmarkService } from '@/services/bookmark';
import { bookService } from '@/services/book';
import { tagApi } from '@/services/apiClient';

const router = useRouter();
const route = useRoute();
const bookmarkStore = useBookmarkStore();
const bookStore = useBookStore();

// Tab配置
const tabs = [
  { key: 'list', label: '书摘' },
  { key: 'review', label: '回顾' }
];
const activeTab = ref('list');

// 筛选
const selectedTag = ref('');
const showSearch = ref(false);

// 标签数据
const allTags = ref<{ tag_id: string; count: number }[]>([]);

// 删除确认
const showDeleteConfirm = ref(false);
const deletingId = ref('');

// 回顾索引
const reviewIndex = ref(0);

// 触摸滑动
const touchStartX = ref(0);
const touchEndX = ref(0);
const slideDirection = ref('slide-left');

// 所有书摘（带书名）
const allBookmarks = computed(() => {
  const bookmarks = bookmarkStore.allBookmarks;


  // 验证书摘数据，过滤掉无效的书摘
  const validBookmarks = bookmarks.filter(b => {
    const isValid = b.id !== null && b.id !== undefined && b.id !== '';
    if (!isValid) {

    }
    return isValid;
  });

  return validBookmarks.map((b: any) => {
    // 优先使用书摘中存储的书籍信息，其次从书籍列表中查找
    let bookTitle = b.bookTitle;
    const bookId = b.bookId;
    const book = bookStore.allBooks.find(book => book.id === bookId);
    
    if (!bookTitle && book) {
      bookTitle = book.title;
    } else if (!bookTitle) {
      bookTitle = '未知书籍';
    }
    
    // 确保标签是数组
    const tags = Array.isArray(b.tags) ? b.tags : [];

    // 优先使用后端返回的 coverUrl，其次使用书籍列表中的封面
    const coverUrl = b.coverUrl || book?.coverUrl || book?.localCoverData;

    return {
      ...b,
      bookId: bookId,
      bookTitle: bookTitle,
      tags: tags,
      coverUrl: coverUrl,
      localCoverData: coverUrl,
    };
  });
});

// 书摘总数
const totalBookmarkCount = computed(() => {
  return allBookmarks.value.length;
});

// 筛选后的书摘
const filteredBookmarks = computed(() => {
  if (!selectedTag.value) return allBookmarks.value;
  return allBookmarks.value.filter(b => b.tags.includes(selectedTag.value));
});

// 当前回顾的书摘
const currentReviewBookmark = computed(() => {
  return allBookmarks.value[reviewIndex.value];
});

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
  customBlur: 5
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
  const coverUrl = currentBookmark?.coverUrl || currentBookmark?.localCoverData;
  
  console.log('reviewCardStyle 计算:', {
    背景模式: settings.backgroundMode,
    颜色索引: settings.selectedColorIndex,
    当前书摘: currentBookmark ? {
      书籍: currentBookmark.bookTitle,
      页码: currentBookmark.pageNum,
      bookId: currentBookmark.bookId,
      coverUrl: currentBookmark.coverUrl,
      localCoverData: currentBookmark.localCoverData
    } : null,
    最终封面URL: coverUrl || '无封面'
  });
  
  if (settings.backgroundMode === 'color') {
    return {
      background: gradients[settings.selectedColorIndex] || gradients[0]
    };
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
  const saved = localStorage.getItem('bookmarkSettings');
  console.log('加载书签设置:', saved);
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      bookmarkSettings.value = {
        backgroundMode: settings.backgroundMode || 'color',
        selectedColorIndex: settings.selectedColorIndex || 0,
        coverOpacity: settings.coverOpacity ?? 0.3,
        coverBlur: settings.coverBlur ?? 8,
        customBackground: settings.customBackground || '',
        customOpacity: settings.customOpacity ?? 0.5,
        customBlur: settings.customBlur ?? 5
      };
      console.log('书签设置已加载:', {
        加载状态: '成功',
        背景模式: bookmarkSettings.value.backgroundMode,
        颜色索引: bookmarkSettings.value.selectedColorIndex,
        封面透明度: bookmarkSettings.value.coverOpacity,
        封面模糊: bookmarkSettings.value.coverBlur
      });
    } catch (error) {
      console.error('加载书签设置失败:', error);
    }
  } else {
    console.log('书签设置已加载:', {
      加载状态: '使用默认值',
      背景模式: bookmarkSettings.value.backgroundMode,
      颜色索引: bookmarkSettings.value.selectedColorIndex
    });
  }
};

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return '未知日期';
  }
  
  const date = new Date(dateStr);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {

    return '未知日期';
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) {
    return '';
  }
  
  const date = new Date(dateStr);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// 导航
const goToAddBookmark = () => {
  router.push('/bookmark/edit');
};

const goToBookmarkDetail = (id: string | number) => {
  router.push(`/bookmark/detail/${id}`);
};

const handleEdit = (id: string | number) => {

  if (id === null || id === undefined || id === '') {
    console.error('编辑失败：无效的书摘ID', id);
    return;
  }
  router.push(`/bookmark/edit/${id}`);
};

// 删除
const handleDelete = (id: string | number) => {

  if (id === null || id === undefined || id === '') {
    console.error('删除失败：无效的书摘ID', id);
    return;
  }
  deletingId.value = String(id);
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  try {
    if (!deletingId.value) {
      console.error('删除失败：无效的书摘ID');
      return;
    }
    await bookmarkService.deleteBookmark(deletingId.value);
    bookmarkStore.deleteBookmark(deletingId.value);
    showDeleteConfirm.value = false;
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 回顾导航
const prevReview = () => {
  if (reviewIndex.value > 0) {
    slideDirection.value = 'slide-right';
    reviewIndex.value--;
  }
};

const nextReview = () => {
  if (reviewIndex.value < allBookmarks.value.length - 1) {
    slideDirection.value = 'slide-left';
    reviewIndex.value++;
  }
};

// 触摸滑动处理
const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.changedTouches[0].screenX;
};

const handleTouchEnd = (e: TouchEvent) => {
  touchEndX.value = e.changedTouches[0].screenX;
  const swipeDistance = touchEndX.value - touchStartX.value;
  const minSwipeDistance = 50; // 最小滑动距离

  if (Math.abs(swipeDistance) > minSwipeDistance) {
    if (swipeDistance > 0) {
      // 右滑：上一个
      slideDirection.value = 'slide-right';
      prevReview();
    } else {
      // 左滑：下一个
      slideDirection.value = 'slide-left';
      nextReview();
    }
  }
};

// 加载数据
onMounted(async () => {
  console.log('=== 书摘回顾页面 onMounted ===');
  loadBookmarkSettings();
  
  try {
    const bookmarks = await bookmarkService.getAllBookmarks();
    console.log('加载的书摘数量:', bookmarks.length);
    if (bookmarks.length > 0) {
      console.log('书摘示例:', bookmarks.slice(0, 2).map(b => ({
        书籍: b.bookTitle,
        内容: b.content?.substring(0, 50) + '...',
        页码: b.pageNum
      })));
    }
    bookmarkStore.setBookmarks(bookmarks);

    // 加载书摘标签（从书摘标签 API）
    try {
      allTags.value = await tagApi.getAll();

    } catch (error) {
      console.warn('⚠️ 加载书摘标签失败:', (error as any).message);
    }

    // 尝试加载书籍列表（可选，用于显示更完整的书籍信息）
    try {
      const books = await bookService.getAllBooks();
      if (books && books.length > 0) {
        bookStore.setBooks(books);
        console.log('加载的书籍数量:', books.length);
        console.log('书籍示例:', books.slice(0, 2).map(b => ({
          id: b.id,
          title: b.title,
          coverUrl: b.coverUrl ? '有封面' : '无封面',
          localCoverData: b.localCoverData ? '有本地封面' : '无本地封面'
        })));
      }
    } catch (error) {
      console.warn('⚠️ 加载书籍列表失败，书摘将使用存储的书籍信息:', (error as any).message);
      // 不中断流程，继续执行
    }

    // 处理路由参数
    if (route.query.bookId) {
      // 筛选特定书籍的书摘
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style scoped>
.bookmark-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  gap: 12px;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: var(--text-hint);
  margin-right: 8px;
}

.search-bar span {
  color: var(--text-hint);
  font-size: 14px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #555555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  transition: all 0.2s ease;
  display: block;
  flex-shrink: 0;
}

.action-btn:hover {
  background-color: #e0e0e0;
  color: #333333;
  transform: scale(1.05);
}

.action-btn:active {
  transform: scale(0.95);
  background-color: #d0d0d0;
  color: #333333;
}

.action-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.3);
}

.add-btn {
  background-color: var(--primary-color, #FF6B35);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.15);
}

.add-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background-color: #e65a2f;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
  transform: translateY(-1px);
}

.add-btn:active {
  background-color: #cc5629;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(255, 107, 53, 0.2);
  transform: translateY(0);
}

.add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.4);
}

.tabs {
  display: flex;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 16px;
}

.tab-item {
  padding: 12px 24px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-bottom-color 0.15s ease;
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.content {
  padding: 16px;
}

/* 筛选条件 */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.chip {
  padding: 6px 14px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chip.active {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

.tag-count {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 11px;
  min-width: 18px;
  text-align: center;
}

.chip.active .tag-count {
  background-color: rgba(255, 107, 53, 0.2);
}

/* 书摘列表 */
.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bookmark-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.bookmark-card:hover {
  box-shadow: var(--shadow-md);
}

.bookmark-book {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.bookmark-content {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bookmark-note {
  font-size: 14px;
  color: var(--text-secondary);
  background-color: #fffde7;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  margin: 0 0 12px 0;
  font-style: italic;
}

.bookmark-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-hint);
}

.page-num {
  background-color: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.bookmark-tags {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.mini-tag {
  padding: 2px 6px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 11px;
}

.bookmark-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.bookmark-card:hover .bookmark-actions {
  opacity: 1;
}

.action-btn-sm {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  color: #555555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.action-btn-sm svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  transition: all 0.2s ease;
  display: block;
  flex-shrink: 0;
}

.action-btn-sm:hover {
  background-color: #fff;
  color: #333333;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transform: scale(1.05);
}

.action-btn-sm:active {
  transform: scale(0.95);
  background-color: #f0f0f0;
}

.action-btn-sm:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.3);
}

/* 回顾页面 */
.review-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 16px;
  min-height: calc(100vh - 120px);
}

.review-card {
  width: 100%;
  max-width: 1400px;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-xl);
  padding: 32px;
  color: #fff;
  box-shadow: var(--shadow-lg);
  touch-action: pan-y;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.review-card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.review-card > *:not(.review-card-overlay) {
  position: relative;
  z-index: 1;
}

.review-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  margin-bottom: 24px;
}

.review-text {
  font-size: 18px;
  line-height: 1.8;
  margin: 0 0 16px 0;
  text-align: left;
  word-wrap: break-word;
}

.review-note {
  font-size: 15px;
  opacity: 0.95;
  background-color: rgba(255, 255, 255, 0.15);
  padding: 14px 16px;
  border-radius: var(--radius-md);
  margin: 0;
  text-align: left;
  line-height: 1.6;
}

.review-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
  opacity: 0.9;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  margin-top: 8px;
}

.review-book {
  text-align: left;
  font-weight: 500;
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  opacity: 0.85;
}

.review-time {
  color: rgba(255, 255, 255, 0.8);
}

.review-page {
  color: rgba(255, 255, 255, 0.75);
  font-style: italic;
  margin-left: auto;
}

.review-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-top: 32px;
}

.review-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 24px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-btn svg {
  width: 24px;
  height: 24px;
  fill: #fff;
}

.review-progress {
  font-size: 14px;
  opacity: 0.8;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
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
  width: 300px;
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

/* 卡片滑动动画 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.1s ease-out;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

</style>