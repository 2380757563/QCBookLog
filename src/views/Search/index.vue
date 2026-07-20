<template>
  <div class="search-container">
    <!-- 搜索栏 -->
    <div class="search-header">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          class="search-input"
          placeholder="搜索书籍、书摘..."
          @input="handleSearch"
          autofocus
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">×</button>
      </div>
      <button class="cancel-btn" @click="goBack">取消</button>
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
        <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <span class="loading-icon">⏳</span>
        <p>正在加载数据...</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="error" class="error-state">
        <span class="error-icon">❌</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="retryLoad">重试</button>
      </div>
      
      <!-- 书籍结果 -->
      <div v-else-if="activeTab === 'books'" class="results">
        <div v-if="bookResults.length > 0" class="result-list">
          <div 
            v-for="book in bookResults" 
            :key="book.id"
            class="result-item book-item"
            @click="goToBookDetail(book.id)"
          >
            <div class="book-cover">
              <img v-if="getBookCoverUrl(book)" :src="getBookCoverUrl(book)" @load="handleImgLoad" @error="handleImgError" />
              <span v-else>{{ book.title.charAt(0) }}</span>
            </div>
            <div class="result-info">
              <span class="result-title" v-html="highlightText(book.title)"></span>
              <span class="result-desc" v-html="highlightText(book.author)"></span>
              <div :class="['book-status', `status--${book.readStatus}`]">{{ book.readStatus }}</div>
            </div>
          </div>
        </div>
        <div v-else-if="searchQuery" class="empty-state">
          <span class="empty-icon">📚</span>
          <p>未找到相关书籍</p>
        </div>
      </div>

      <!-- 书摘结果 -->
      <div v-if="activeTab === 'bookmarks'" class="results">
        <div v-if="bookmarkResults.length > 0" class="result-list">
          <div 
            v-for="bookmark in bookmarkResults" 
            :key="bookmark.id"
            class="result-item bookmark-item"
            @click="goToBookmarkDetail(bookmark.id)"
          >
            <div class="result-info">
              <span class="result-book">{{ bookmark.bookTitle }}</span>
              <p class="result-content" v-html="highlightText(bookmark.content)"></p>
            </div>
          </div>
        </div>
        <div v-else-if="searchQuery" class="empty-state">
          <span class="empty-icon">📝</span>
          <p>未找到相关书摘</p>
        </div>
      </div>

      <!-- 空状态（未搜索） -->
      <div v-if="!searchQuery" class="search-tips">
        <div class="tip-title">搜索提示</div>
        <div class="tip-list">
          <span class="tip-item" @click="searchQuery = '小王子'">小王子</span>
          <span class="tip-item" @click="searchQuery = '海明威'">海明威</span>
          <span class="tip-item" @click="searchQuery = '文学'">文学</span>
          <span class="tip-item" @click="searchQuery = '编程'">编程</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { useBookmarkStore } from '@/stores/bookmark';
import { bookService } from '@/api/book';
import { bookmarkService } from '@/api/bookmark';
import { useBookImage } from '@/views/Book/composables/useBookImage';

const router = useRouter();
const bookStore = useBookStore();
const bookmarkStore = useBookmarkStore();
const { handleImgLoad, handleImgError, getBookCoverUrl } = useBookImage();

const searchQuery = ref('');
const activeTab = ref('books');
const loading = ref(false);
const error = ref<string | null>(null);

// 搜索结果
const bookResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  const query = searchQuery.value.toLowerCase();
  return bookStore.allBooks.filter(book => 
    (book.title && book.title.toLowerCase().includes(query)) ||
    (book.author && book.author.toLowerCase().includes(query)) ||
    (book.isbn && book.isbn.includes(query)) ||
    (book.publisher && book.publisher.toLowerCase().includes(query))
  );
});

const bookmarkResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  const query = searchQuery.value.toLowerCase();
  return bookmarkStore.allBookmarks
    .filter(b => (b.content && b.content.toLowerCase().includes(query)) || (b.note && b.note.toLowerCase().includes(query)))
    .map(b => {
      const book = bookStore.allBooks.find(book => book.id === b.bookId);
      return { ...b, bookTitle: book?.title || '未知书籍' };
    });
});

// Tab配置
const tabs = computed(() => [
  { key: 'books', label: '书籍', count: bookResults.value.length },
  { key: 'bookmarks', label: '书摘', count: bookmarkResults.value.length }
]);

// 高亮匹配文本
const highlightText = (text: string): string => {
  if (!text || !searchQuery.value.trim()) return text || '';
  const regex = new RegExp(`(${searchQuery.value})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

// 搜索处理
const handleSearch = () => {
  // 防抖已在computed中实现
};

const clearSearch = () => {
  searchQuery.value = '';
};

const goBack = () => {
  router.back();
};

const goToBookDetail = (id: string | number) => {
  router.push(`/book/detail/${id}`);
};

const goToBookmarkDetail = (id: string | number) => {
  router.push(`/bookmark/detail/${id}`);
};

const retryLoad = async () => {
  loading.value = true;
  error.value = null;
  try {
    console.log('🔍 重新加载数据...');
    const [books, bookmarks] = await Promise.all([
      bookService.getAllBooks(),
      bookmarkService.getAllBookmarks()
    ]);
    bookStore.setBooks(books);
    bookmarkStore.setBookmarks(bookmarks);
    console.log('✅ 数据重新加载成功');
  } catch (err) {
    console.error('❌ 重新加载失败:', err);
    error.value = err instanceof Error ? err.message : '加载数据失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 加载数据
onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    console.log('🔍 搜索页面开始加载数据...');
    
    // 并行加载书籍和书摘数据
    const [books, bookmarks] = await Promise.all([
      bookService.getAllBooks(),
      bookmarkService.getAllBookmarks()
    ]);
    
    console.log(`🔍 加载完成: ${books.length} 本书, ${bookmarks.length} 条书摘`);
    
    bookStore.setBooks(books);
    bookmarkStore.setBookmarks(bookmarks);
    
    console.log('✅ 搜索页面数据加载成功');
  } catch (err) {
    console.error('❌ 加载数据失败:', err);
    error.value = err instanceof Error ? err.message : '加载数据失败，请稍后重试';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.search-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background-color: #f5f5f5;
  border-radius: 20px;
  height: 40px;
}

.search-icon {
  width: 20px;
  height: 20px;
  fill: var(--text-hint);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  padding: 0 8px;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-hint);
}

.clear-btn {
  width: 20px;
  height: 20px;
  border: none;
  background-color: var(--text-hint);
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.tabs {
  display: flex;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 16px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-count {
  font-size: 12px;
  padding: 1px 6px;
  background-color: #f0f0f0;
  border-radius: 10px;
}

.tab-item.active .tab-count {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

.content {
  padding: 16px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s;
}

.result-item:hover {
  box-shadow: var(--shadow-md);
}

.book-cover {
  width: 48px;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.result-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-desc {
  font-size: 13px;
  color: var(--text-hint);
}

.result-book {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 500;
}

.result-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 4px 0 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  margin-top: 4px;
  width: fit-content;
}

.status--未读 { background-color: #9e9e9e; }
.status--在读 { background-color: var(--primary-color); }
.status--已读 { background-color: #4caf50; }

:deep(mark) {
  background-color: rgba(255, 107, 53, 0.3);
  color: var(--primary-color);
  padding: 0 2px;
  border-radius: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.search-tips {
  padding: 24px 0;
}

.tip-title {
  font-size: 14px;
  color: var(--text-hint);
  margin-bottom: 16px;
}

.tip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tip-item {
  padding: 8px 16px;
  background-color: var(--bg-card);
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
}

.tip-item:hover {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.loading-icon,
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.error-state p {
  color: var(--text-secondary);
  margin-bottom: 16px;
  text-align: center;
}

.retry-btn {
  padding: 8px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.retry-btn:hover {
  opacity: 0.9;
}
</style>