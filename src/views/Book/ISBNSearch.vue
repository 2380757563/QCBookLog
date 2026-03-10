<template>
  <div class="isbn-search-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">ISBN搜索</h1>
      <div class="header-spacer"></div>
    </div>
    
    <!-- 进度条组件 -->
    <ProgressBar
      :visible="showProgressBar"
      :book-titles="bookTitles"
    />

    <!-- ISBN输入 -->
    <div class="isbn-input-section">
      <div class="input-group">
        <input 
          v-model="isbnInput" 
          class="isbn-input"
          placeholder="请输入ISBN号码"
          @keyup.enter="handleSearch"
        />
        <button class="search-btn" @click="handleSearch" :disabled="searching">
          {{ searching ? '搜索中...' : '搜索' }}
        </button>
        <button class="scan-btn" @click="goToScanner">
          <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          扫描
        </button>
      </div>
      <p class="input-tip">支持ISBN-10和ISBN-13格式</p>
    </div>

    <!-- 搜索结果 -->
    <div v-if="hasSearched" class="search-results">
      <!-- 数据源标签页 -->
      <div class="source-tabs">
        <div 
          v-for="source in sources" 
          :key="source.key"
          :class="['tab-item', { active: activeSource === source.key, disabled: false }]"
          @click="switchSource(source.key)"
        >
          {{ source.name }}
          <span v-if="source.data" class="tab-badge">✓</span>
          <span v-else-if="source.loading" class="tab-badge">⏳</span>
        </div>
      </div>

      <!-- 当前数据源内容 -->
      <div class="source-content">
        <!-- 加载中状态 -->
        <div v-if="currentSource.loading" class="loading-state">
          <div class="spinner"></div>
          <p>正在从{{ currentSource.name }}获取数据...</p>
        </div>

        <!-- 有数据 -->
        <div v-else-if="currentSource.data" class="book-result">
          <div class="book-header">
            <div class="book-cover">
              <img v-if="currentSource.data.coverUrl && getImageUrl(currentSource.data.coverUrl)" :src="getImageUrl(currentSource.data.coverUrl)!" :alt="currentSource.data.title" @error="handleImgError" />
              <div v-else class="cover-placeholder">
                <span>{{ currentSource.data.title.charAt(0) }}</span>
              </div>
            </div>
            <div class="book-info">
              <h2 class="book-title">{{ currentSource.data.title }}</h2>
              <p class="book-author">{{ currentSource.data.author }}</p>
              <p class="book-publisher">{{ currentSource.data.publisher }}</p>
              <div class="book-meta">
              <span v-if="currentSource.data.publishYear">{{ currentSource.data.publishYear }}年</span>
              <span v-if="currentSource.data.pages">{{ currentSource.data.pages }}页</span>
              <span v-if="currentSource.data.binding">{{ currentSource.data.binding }}</span>
              <span v-if="currentSource.data.price">{{ currentSource.data.price }}</span>
            </div>
            </div>
          </div>

          <div class="book-details">
            <div class="detail-item">
              <label>ISBN:</label>
              <span>{{ currentSource.data.isbn }}</span>
            </div>
            <div class="detail-item">
              <label>数据源:</label>
              <span class="source-tag">{{ currentSource.data.source }}</span>
            </div>
            <div v-if="currentSource.data.rating" class="detail-item">
              <label>评分:</label>
              <div class="rating-display">
                <span class="stars">{{ '★'.repeat(Math.max(0, Math.min(5, Math.round(currentSource.data.rating / 2)))) }}{{ '☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.round(currentSource.data.rating / 2))))) }}</span>
                <span class="rating-value">{{ currentSource.data.rating.toFixed(1) }}</span>
              </div>
            </div>
            <div v-if="currentSource.data.series" class="detail-item">
              <label>丛书:</label>
              <span>{{ currentSource.data.series }}</span>
            </div>
            <div v-if="currentSource.data.tags && currentSource.data.tags.length > 0" class="detail-item">
              <label>标签:</label>
              <div class="tags-display">
                <span v-for="tag in currentSource.data.tags" :key="tag" class="tag-chip">{{ tag }}</span>
              </div>
            </div>
            <div v-if="currentSource.data.price" class="detail-item">
              <label>价格:</label>
              <span>{{ currentSource.data.price }}</span>
            </div>
            <div v-if="currentSource.data.description" class="detail-item">
              <label>简介:</label>
              <p class="description">{{ currentSource.data.description }}</p>
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn-primary" @click="useBookInfo">使用此信息</button>
            <button class="btn-outline" @click="saveToLocal">保存到书库</button>
          </div>
        </div>

        <!-- 无数据 -->
        <div v-else class="empty-state">
          <span class="empty-icon">📚</span>
          <p>未找到相关书籍信息</p>
          
          <!-- 当所有免费API都失败时，显示探数API提示 -->
          <div v-if="!sources.douban.data && !sources.isbnWork.data && !sources.dbr.data" class="tanshu-hint">
            <p class="hint-text">💡 免费数据源未找到书籍信息</p>
            <p class="hint-subtext">您可以尝试使用探数图书API（计费服务）</p>
            <button 
              class="tanshu-btn" 
              @click="searchTanshu"
              :disabled="sources.tanshu.loading"
            >
              {{ sources.tanshu.loading ? '正在尝试...' : '尝试探数图书' }}
            </button>
          </div>
          
          <!-- 当探数API已调用但失败时，显示重试按钮 -->
          <button 
            v-else-if="activeSource === 'tanshu' && sources.tanshu.data === null && sources.tanshu.loading === false" 
            class="retry-btn" 
            @click="searchTanshu"
            :disabled="sources.tanshu.loading"
          >
            重新尝试探数图书
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="searchHistory.length > 0 && !hasSearched" class="search-history">
      <h3 class="history-title">搜索历史</h3>
      <div class="history-list">
        <div 
          v-for="history in searchHistory" 
          :key="history.isbn"
          class="history-item"
          @click="selectHistory(history.isbn)"
        >
          <span class="isbn-text">{{ history.isbn }}</span>
          <span class="title-text">{{ history.title || '未知书籍' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookStore } from '@/store/book';
import { bookService } from '@/services/book';
import { searchBookByISBN, searchTanshuByISBN } from '@/services/common/isbnApi';
import type { BookSearchResult } from '@/services/common/isbnApi/types';
import { getImageUrl } from '@/utils/localImageStorage';
import ProgressBar from '@/components/ProgressBar.vue';

const router = useRouter();
const bookStore = useBookStore();

const isbnInput = ref('');
const searching = ref(false);
const hasSearched = ref(false);
const showProgressBar = ref(false);
const bookTitles = ref(new Map<string, string>());

// 搜索历史
const searchHistory = ref<Array<{isbn: string, title: string}>>([]);

// 数据源状态
const sources = ref({
  douban: {
    key: 'douban',
    name: '豆瓣图书',
    data: null as BookSearchResult | null,
    loading: false
  },
  isbnWork: {
    key: 'isbnWork',
    name: '公共图书',
    data: null as BookSearchResult | null,
    loading: false
  },
  tanshu: {
    key: 'tanshu',
    name: '探数图书',
    data: null as BookSearchResult | null,
    loading: false
  },
  dbr: {
    key: 'dbr',
    name: 'DBR图书',
    data: null as BookSearchResult | null,
    loading: false
  }
});

const activeSource = ref('douban');

// 当前激活的数据源
const currentSource = computed(() => sources.value[activeSource.value as keyof typeof sources.value]);

// 返回
const goBack = () => {
  router.back();
};

// 跳转到扫描页面
const goToScanner = () => {
  router.push('/book/isbn-scanner');
};

// 选择历史记录
const selectHistory = (isbn: string) => {
  isbnInput.value = isbn;
  handleSearch();
};

// 从路由参数获取ISBN
onMounted(() => {
  const queryIsbn = router.currentRoute.value.query.isbn;
  if (queryIsbn && typeof queryIsbn === 'string') {
    isbnInput.value = queryIsbn;
    handleSearch();
  }
});

// 搜索处理
const handleSearch = async () => {
  const isbn = isbnInput.value.trim();
  if (!isbn) return;

  searching.value = true;
  hasSearched.value = true;

  // 重置所有数据源
  Object.keys(sources.value).forEach(key => {
    sources.value[key as keyof typeof sources.value].data = null;
    sources.value[key as keyof typeof sources.value].loading = false;
  });

  try {
    // 并行搜索所有免费数据源（DBR、公共图书、豆瓣）
    // 探数API不在搜索时自动调用
    activeSource.value = 'dbr'; // 优先显示DBR
    sources.value.douban.loading = true;
    sources.value.isbnWork.loading = true;
    sources.value.dbr.loading = true;

    const results = await searchBookByISBN(isbn);
    
    sources.value.douban.loading = false;
    sources.value.isbnWork.loading = false;
    sources.value.dbr.loading = false;
    
    sources.value.douban.data = results.douban;
    sources.value.isbnWork.data = results.isbnWork;
    sources.value.dbr.data = results.dbr;
    // 探数API结果保持为null，等待用户主动点击
    
    // 最佳结果选择：DBR > 公共图书 > 豆瓣
    if (results.dbr) {
      activeSource.value = 'dbr';
      addToSearchHistory(isbn, results.dbr.title);

    } else if (results.isbnWork) {
      activeSource.value = 'isbnWork';
      addToSearchHistory(isbn, results.isbnWork.title);

    } else if (results.douban) {
      activeSource.value = 'douban';
      addToSearchHistory(isbn, results.douban.title);

    } else {

      // 自动切换到探数数据源，引导用户点击
      activeSource.value = 'tanshu';
    }
  } catch (error) {
    console.error('❌ 搜索失败:', error);
    sources.value.douban.loading = false;
    sources.value.isbnWork.loading = false;
    sources.value.dbr.loading = false;
    // 出错时也切换到探数数据源，作为备用方案
    activeSource.value = 'tanshu';
  } finally {
    searching.value = false;
  }
};

// 切换数据源
const switchSource = async (sourceKey: string) => {
  // 先切换到目标数据源
  activeSource.value = sourceKey;
  
  // 如果是探数图书且还没有数据，则进行搜索
  if (sourceKey === 'tanshu' && !sources.value.tanshu.data) {
    await searchTanshu();
  }
};

// 搜索探数图书（用户主动点击时调用，计费API）
const searchTanshu = async () => {
  const isbn = isbnInput.value.trim();
  if (!isbn) return;

  // 用户确认提示（仅在首次调用时）
  if (!sources.value.tanshu.data && !sources.value.tanshu.loading) {
    const confirmed = confirm('探数图书API为计费服务，是否确认调用？\n\n该服务仅在免费API无法找到书籍时建议使用。');
    if (!confirmed) {

      return;
    }
  }

  sources.value.tanshu.loading = true;

  try {
    const result = await searchTanshuByISBN(isbn);
    sources.value.tanshu.data = result;
    sources.value.tanshu.loading = false;
    
    if (result) {
      activeSource.value = 'tanshu';
      addToSearchHistory(isbn, result.title);

    } else {

    }
  } catch (error) {
    console.error('❌ 探数图书搜索失败:', error);
    sources.value.tanshu.loading = false;
    alert('探数图书API调用失败，请稍后重试');
  }
};

// 添加到搜索历史
const addToSearchHistory = (isbn: string, title: string) => {
  // 检查是否已存在
  const existingIndex = searchHistory.value.findIndex(item => item.isbn === isbn);
  if (existingIndex !== -1) {
    // 移到最前面
    const item = searchHistory.value.splice(existingIndex, 1)[0];
    searchHistory.value.unshift(item);
  } else {
    // 添加新记录
    searchHistory.value.unshift({ isbn, title });
    // 限制历史记录数量
    if (searchHistory.value.length > 10) {
      searchHistory.value.pop();
    }
  }
  
  // 保存到localStorage
  localStorage.setItem('isbnSearchHistory', JSON.stringify(searchHistory.value));
};

// 使用书籍信息
const useBookInfo = () => {
  if (!currentSource.value.data) return;

  // 传递数据到书籍编辑页面
  router.push({
    path: '/book/edit',
    query: {
      isbn: currentSource.value.data.isbn,
      title: currentSource.value.data.title,
      author: currentSource.value.data.author,
      publisher: currentSource.value.data.publisher || '',
      publishYear: currentSource.value.data.publishYear?.toString() || '',
      pages: currentSource.value.data.pages?.toString() || '',
      binding: currentSource.value.data.binding || '',
      coverUrl: currentSource.value.data.coverUrl || '',
      price: currentSource.value.data.price || '',
      source: currentSource.value.data.source,
      rating: currentSource.value.data.rating?.toString() || '',
      series: currentSource.value.data.series || '',
      tags: currentSource.value.data.tags ? JSON.stringify(currentSource.value.data.tags) : ''
    }
  });
};

// 保存到本地书库
  const saveToLocal = async () => {
    if (!currentSource.value.data) return;

    try {
      const sourceData = currentSource.value.data;
      const now = new Date().toISOString();

      // 将API返回的装帧字符串转换为binding1和binding2
      const bindingText = (sourceData.binding || '').toLowerCase();
      let binding1 = 0; // 默认电子书
      let binding2 = 0;

      if (bindingText.includes('平装') || bindingText.includes('paperback') || bindingText.includes('平裝')) {
        binding1 = 1; // 平装
      } else if (bindingText.includes('精装') || bindingText.includes('hardcover') || bindingText.includes('精裝')) {
        binding1 = 2; // 精装
      }


      console.log('📄 [ISBNSearch.vue] sourceData 完整数据:', JSON.stringify(sourceData, null, 2));

      const bookData = {
        isbn: sourceData.isbn,
        title: sourceData.title,
        author: sourceData.author,
        publisher: sourceData.publisher || '',
        publishYear: sourceData.publishYear,
        pages: sourceData.pages !== undefined && sourceData.pages !== null && !isNaN(Number(sourceData.pages)) ? Number(sourceData.pages) : undefined,
        binding1: binding1,
        binding2: binding2,
        book_type: binding1 === 0 ? 0 : 1,
        coverUrl: sourceData.coverUrl || '',
        purchaseDate: now,
        purchasePrice: undefined,
        // 将API返回的价格字符串转换为数字作为标准价格
        // 去除"元"等非数字字符后再转换
        standardPrice: sourceData.price ? (parseFloat(sourceData.price.toString().replace(/[^\d.]/g, '')) || undefined) : undefined,
        readStatus: '未读' as const,
        readCompleteDate: undefined,
        rating: sourceData.rating,
        // 确保tags和groups是字符串数组
        tags: sourceData.tags || [],
        groups: [],
        series: sourceData.series || '',
        note: '',
        description: sourceData.description || ''
      };

      console.log('📤 [ISBNSearch.vue] 准备发送给后端的书籍数据:', JSON.stringify(bookData, null, 2));

      // 显示进度条
      showProgressBar.value = true;

      // 添加书籍标题映射，用于进度显示
      bookTitles.value.set(sourceData.isbn, sourceData.title);

      const newBook = await bookService.addBook(bookData);
      bookStore.addBook(newBook);

      alert('书籍已保存到书库');
      router.push('/book');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      // 延迟隐藏进度条，让用户看到完成状态
      setTimeout(() => {
        showProgressBar.value = false;
        bookTitles.value.clear();
      }, 1000);
    }
  };

// 加载搜索历史
onMounted(() => {
  const savedHistory = localStorage.getItem('isbnSearchHistory');
  if (savedHistory) {
    try {
      searchHistory.value = JSON.parse(savedHistory);
    } catch (error) {
      console.error('解析搜索历史失败:', error);
    }
  }
});

// 图片加载错误处理
const handleImgError = async (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  console.error('图片加载失败:', {
    src: imgElement.src,
    alt: imgElement.alt,
    event: event,
    errorMessage: event instanceof Error ? event.message : 'Unknown error'
  });
  
  try {
    // 导入图片工具
    const { generatePlaceholderImage } = await import('@/utils/imageUtils');
    // 生成本地占位图片
    const placeholderUrl = await generatePlaceholderImage(120, 180);
    // 直接替换图片src为本地占位图片
    imgElement.src = placeholderUrl;
    imgElement.style.display = 'block';
    
    // 隐藏占位符元素（如果存在）
    const placeholderElement = imgElement.nextElementSibling as HTMLElement;
    if (placeholderElement && placeholderElement.classList.contains('cover-placeholder')) {
      placeholderElement.style.display = 'none';
    }
  } catch (error) {
    console.error('生成占位图片失败:', error);
    // 降级处理：隐藏错误图片，显示占位符
    imgElement.style.display = 'none';
    const placeholder = imgElement.nextElementSibling as HTMLElement;
    if (placeholder && placeholder.classList.contains('cover-placeholder')) {
      placeholder.style.display = 'flex';
    }
  }
};
</script>

<style scoped>
.isbn-search-container {
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

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn svg {
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

.header-spacer {
  width: 36px;
}

.isbn-input-section {
  padding: 24px 16px;
  background-color: var(--bg-card);
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.isbn-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 16px;
  outline: none;
}

.isbn-input:focus {
  border-color: var(--primary-color);
}

.search-btn {
  padding: 12px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.search-btn:disabled {
  background-color: var(--text-disabled);
  cursor: not-allowed;
}

.scan-btn {
  padding: 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.scan-btn:hover {
  background-color: #0b7dda;
}

.scan-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.input-tip {
  font-size: 12px;
  color: var(--text-hint);
  margin: 0;
  text-align: center;
}

.source-tabs {
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
  font-weight: 500;
}

.tab-item.disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.tab-badge {
  font-size: 12px;
}

.source-content {
  padding: 16px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.book-result {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.book-header {
  display: flex;
  gap: 16px;
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

.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.book-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.book-author {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.book-publisher {
  font-size: 13px;
  color: var(--text-hint);
  margin: 0;
}

.book-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-hint);
}

.book-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  color: var(--text-hint);
  font-weight: 500;
}

.detail-item span {
  font-size: 14px;
  color: var(--text-primary);
}

.source-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* 评分显示 */
.rating-display {
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
  color: var(--text-primary);
}

/* 标签显示 */
.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-block;
  padding: 4px 12px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-primary {
  flex: 1;
  padding: 12px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-outline {
  flex: 1;
  padding: 12px;
  background-color: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-outline:hover {
  background-color: rgba(255, 107, 53, 0.1);
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
  margin-bottom: 16px;
}

/* 探数API提示样式 */
.tanshu-hint {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
  border-radius: 12px;
  text-align: center;
  max-width: 320px;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
}

.hint-text {
  font-size: 14px;
  font-weight: 500;
  color: #d32f2f;
  margin: 0 0 8px 0;
}

.hint-subtext {
  font-size: 13px;
  color: #f57c00;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.tanshu-btn {
  padding: 10px 24px;
  background-color: #d32f2f;
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tanshu-btn:hover {
  background-color: #b71c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);
}

.tanshu-btn:disabled {
  background-color: #ffcdd2;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.retry-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
}

.retry-btn:disabled {
  background-color: var(--text-disabled);
  cursor: not-allowed;
}

.search-history {
  padding: 16px;
}

.history-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  background-color: #f5f5f5;
}

.isbn-text {
  font-size: 14px;
  font-family: monospace;
  color: var(--primary-color);
}

.title-text {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>