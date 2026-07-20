<template>
  <div class="batch-scanner-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">批量ISBN扫描</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- 进度条 -->
    <div v-if="isProcessing || isReseearching" class="progress-section">
      <div class="progress-header">
        <span class="progress-label">{{ isReseearching ? `更换书源 ${reseearchProgress.current}/${reseearchProgress.total}` : progressText }}</span>
        <span class="progress-percent">{{ isReseearching ? Math.round((reseearchProgress.current / reseearchProgress.total) * 100) : progressPercent }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: (isReseearching ? Math.round((reseearchProgress.current / reseearchProgress.total) * 100) : progressPercent) + '%' }"></div>
      </div>
      <div class="progress-detail">
        正在处理: {{ currentProcessingBook?.title || '加载中...' }}
      </div>
      <button v-if="isReseearching" class="cancel-btn" @click="cancelReseearch = true">取消</button>
    </div>

    <!-- 扫描输入区域 -->
    <div class="scan-input-section">
      <div class="input-group">
        <input
          v-model="manualIsbn"
          class="isbn-input"
          placeholder="输入ISBN或扫描条码"
          @keyup.enter="addIsbn"
          :disabled="isProcessing"
        />
        <button class="add-btn" @click="addIsbn" :disabled="!manualIsbn.trim() || isProcessing">
          添加
        </button>
        <button class="scan-btn" @click="goToScanner" :disabled="isProcessing">
          <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          扫描
        </button>
      </div>
      <div class="scan-tip">
        支持手动输入或摄像头扫描ISBN，可连续添加多个
      </div>
    </div>

    <!-- 已扫描的ISBN列表 -->
    <div v-if="isbnList.length > 0" class="isbn-list-section">
      <div class="section-header">
        <h2>已扫描ISBN ({{ isbnList.length }})</h2>
        <div class="header-actions">
          <button class="clear-btn" @click="clearAll" :disabled="isProcessing || isReseearching">
            清空
          </button>
        </div>
      </div>
      <div class="isbn-selection-actions">
        <button
          class="selection-btn small"
          @click="selectAllIsbnItems"
          :disabled="isProcessing || isReseearching"
        >
          全选
        </button>
        <button
          class="selection-btn small"
          @click="invertIsbnSelection"
          :disabled="isProcessing || isReseearching"
        >
          反选
        </button>
        <button
          class="selection-btn small danger"
          @click="deleteSelectedIsbnItems"
          :disabled="isProcessing || isReseearching || selectedIsbnItems.length === 0"
        >
          删除({{ selectedIsbnItems.length }})
        </button>
        <button
          class="selection-btn small primary"
          @click="batchSearchSelected"
          :disabled="isProcessing || isReseearching"
        >
          批量搜索
        </button>
        <span class="selection-hint">点击复选框选择ISBN</span>
      </div>
      <div class="isbn-list">
        <div
          v-for="(item, index) in isbnList"
          :key="item.isbn"
          :class="['isbn-item', { 
            'searching': item.searching, 
            'found': item.data, 
            'not-found': !item.data && !item.searching, 
            'error': item.error,
            'new': item.isNew || newlyAddedIsbns.includes(item.isbn),
            'selected': selectedIsbnItems.includes(item.isbn)
          }]"
          @click="toggleIsbnSelection(item.isbn)"
          @contextmenu.prevent="toggleIsbnSelection(item.isbn)"
        >
          <div class="isbn-checkbox">
            <input
              type="checkbox"
              :checked="selectedIsbnItems.includes(item.isbn)"
              @change="toggleIsbnSelection(item.isbn)"
              @click.stop
              :disabled="isProcessing || isReseearching"
            />
          </div>
          <div class="isbn-info">
            <span v-if="item.isNew || newlyAddedIsbns.includes(item.isbn)" class="new-badge">新</span>
            <span class="isbn-number">{{ item.isbn }}</span>
            <span v-if="item.data" class="book-title">{{ item.data.title }}</span>
            <span v-else-if="item.searching" class="status-text searching">搜索中...</span>
            <span v-else-if="item.error" class="status-text error">{{ item.error }}</span>
            <span v-else class="status-text pending">待搜索</span>
            <span v-if="item.data" class="source-indicator">来源: {{ item.data.source }}</span>
          </div>
          <div class="isbn-actions">
            <button
              v-if="!item.data && !item.searching"
              class="action-btn search-again"
              @click.stop="searchSingle(index)"
              :disabled="isProcessing || isReseearching"
            >
              搜索
            </button>
            <button
              v-if="!item.data && !item.searching"
              class="action-btn remove"
              @click.stop="removeIsbn(index)"
              :disabled="isProcessing || isReseearching"
            >
              删除
            </button>
            <button
              v-if="item.data"
              class="action-btn remove"
              @click.stop="removeIsbn(index)"
              :disabled="isProcessing || isReseearching"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 书籍预览区域 -->
    <div v-if="previewBooks.length > 0" class="preview-section">
      <div class="section-header">
        <h2>书籍预览 ({{ previewBooks.length }})</h2>
        <div class="header-actions">
          <div class="selection-actions">
            <button
              class="selection-btn"
              @click="selectAllBooks"
              :disabled="isProcessing || previewBooks.length === 0"
              title="全选所有书籍"
            >
              全选
            </button>
            <button
              class="selection-btn"
              @click="deselectAllBooks"
              :disabled="isProcessing || previewBooks.length === 0"
              title="取消全选"
            >
              全不选
            </button>
            <button
              class="selection-btn"
              @click="invertSelection"
              :disabled="isProcessing || previewBooks.length === 0"
              title="反转选择状态"
            >
              反选
            </button>
            <button
              class="change-source-btn"
              @click="openSourceSelector"
              :disabled="isProcessing || isReseearching || previewBooks.length === 0"
              title="更换书源重新搜索"
            >
              更换书源
            </button>
          </div>
          <button
            class="import-all-btn"
            @click="importAll"
            :disabled="isProcessing || previewBooks.length === 0"
          >
            {{ isProcessing ? '导入中...' : '一键导入' }}
          </button>
        </div>
      </div>
      <div class="preview-grid">
        <div
          v-for="book in previewBooks"
          :key="book.isbn"
          class="book-card"
        >
          <div class="book-cover">
            <img
              v-if="book.coverUrl"
              :src="book.coverUrl"
              :alt="book.title"
              @error="handleCoverError($event, book)"
            />
            <div v-else class="cover-placeholder">
              <span>{{ book.title.charAt(0) }}</span>
            </div>
          </div>
          <div class="book-info">
            <h3 class="book-title">{{ book.title }}</h3>
            <p class="book-author">{{ book.author }}</p>
            <p class="book-isbn">ISBN: {{ book.isbn }}</p>
            <div class="book-tags">
              <span class="source-tag">{{ book.source }}</span>
              <span v-if="book.publisher" class="publisher-tag">{{ book.publisher }}</span>
            </div>
          </div>
          <div class="book-check">
            <input
              type="checkbox"
              :id="`book-${book.isbn}`"
              v-model="selectedBooks"
              :value="book.isbn"
              :disabled="isProcessing"
            />
            <label :for="`book-${book.isbn}`">导入</label>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入结果提示 -->
    <div v-if="importResult" class="import-result" :class="importResult.type">
      <div class="result-icon">{{ importResult.icon }}</div>
      <div class="result-content">
        <h3>{{ importResult.title }}</h3>
        <p>{{ importResult.message }}</p>
        <button class="close-btn" @click="closeResult">关闭</button>
      </div>
    </div>

    <!-- 退出确认弹窗 -->
    <div v-if="showExitConfirmDialog" class="exit-confirm-dialog">
      <div class="confirm-dialog-content">
        <div class="dialog-icon">⚠️</div>
        <h3 class="dialog-title">退出确认</h3>
        <p class="dialog-message">
          是否将当前批量扫描结果加入书库？<br>
          若选择"否"或关闭弹窗，本次批量扫描过程中缓存的所有书籍信息将被永久清除。
        </p>
        <div class="dialog-buttons">
          <button class="dialog-btn cancel-btn" @click="confirmExit">
            否，退出并清除缓存
          </button>
          <button class="dialog-btn confirm-btn" @click="cancelExit">
            取消，返回继续扫描
          </button>
        </div>
      </div>
    </div>

    <!-- 书源选择弹窗 -->
    <div v-if="showSourceSelector" class="source-selector-dialog">
      <div class="source-dialog-content">
        <div class="dialog-icon">📚</div>
        <h3 class="dialog-title">选择书源</h3>
        <p class="dialog-message">
          已选择 {{ selectedBooks.length }} 本书籍，请选择要使用的书源进行重新搜索
        </p>
        <div class="source-list">
          <div
            v-for="(config, key) in API_CONFIGS"
            :key="key"
            :class="['source-option', { 'selected': selectedSource === key }]"
            @click="selectedSource = key"
          >
            <div class="source-radio">
              <input
                type="radio"
                :id="`source-${key}`"
                :value="key"
                v-model="selectedSource"
              />
              <label :for="`source-${key}`">
                <span class="source-name">{{ config.name }}</span>
                <span class="source-desc">{{ config.description }}</span>
              </label>
            </div>
            <div class="source-badges">
              <span v-if="config.isFree" class="badge free">免费</span>
              <span v-else class="badge paid">计费</span>
              <span v-if="lastUsedSource === key" class="badge recent">最近使用</span>
            </div>
          </div>
        </div>
        <div class="dialog-buttons">
          <button class="dialog-btn cancel-btn" @click="closeSourceSelector">
            取消
          </button>
          <button class="dialog-btn confirm-btn" @click="reSearchWithSource">
            开始搜索
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索结果对比视图 -->
    <div v-if="showCompareView" class="compare-view-dialog">
      <div class="compare-dialog-content">
        <div class="compare-header">
          <h3 class="dialog-title">搜索结果对比</h3>
          <button class="close-icon" @click="closeCompareView">✕</button>
        </div>
        <div class="compare-actions">
          <button class="apply-all-btn" @click="applyAllNewData">
            应用所有新结果
          </button>
          <button class="close-btn" @click="closeCompareView">
            关闭
          </button>
        </div>
        <div class="compare-list">
          <div
            v-for="[isbn, data] in Array.from(compareData.entries())"
            :key="isbn"
            class="compare-item"
          >
            <div class="compare-item-header">
              <span class="compare-isbn">ISBN: {{ isbn }}</span>
              <div class="compare-item-actions">
                <button
                  v-if="data.new"
                  class="apply-btn"
                  @click="applyNewData(isbn)"
                >
                  应用新结果
                </button>
                <button
                  v-if="!data.new"
                  class="retry-btn"
                  @click="retryFailedSearch(isbn)"
                >
                  重试
                </button>
              </div>
            </div>
            <div class="compare-content">
              <div class="compare-column old-data">
                <h4>原数据 {{ data.old ? `(${data.old.source})` : '(无)' }}</h4>
                <div v-if="data.old" class="data-card">
                  <div class="data-row">
                    <span class="data-label">书名:</span>
                    <span class="data-value">{{ data.old.title }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">作者:</span>
                    <span class="data-value">{{ data.old.author }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">出版社:</span>
                    <span class="data-value">{{ data.old.publisher || '无' }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">出版年:</span>
                    <span class="data-value">{{ data.old.publishYear || '无' }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">评分:</span>
                    <span class="data-value">{{ data.old.rating || '无' }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">丛书:</span>
                    <span class="data-value">{{ data.old.series || '无' }}</span>
                  </div>
                  <div class="data-row">
                    <span class="data-label">标签:</span>
                    <span class="data-value">{{ data.old.tags?.join(', ') || '无' }}</span>
                  </div>
                </div>
                <div v-else class="no-data">无原数据</div>
              </div>
              <div class="compare-arrow">→</div>
              <div class="compare-column new-data">
                <h4>新数据 {{ data.new ? `(${data.new.source})` : '(搜索失败)' }}</h4>
                <div v-if="data.new" class="data-card">
                  <div class="data-row" :class="{ 'changed': data.old?.title !== data.new.title }">
                    <span class="data-label">书名:</span>
                    <span class="data-value">{{ data.new.title }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': data.old?.author !== data.new.author }">
                    <span class="data-label">作者:</span>
                    <span class="data-value">{{ data.new.author }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': data.old?.publisher !== data.new.publisher }">
                    <span class="data-label">出版社:</span>
                    <span class="data-value">{{ data.new.publisher || '无' }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': data.old?.publishYear !== data.new.publishYear }">
                    <span class="data-label">出版年:</span>
                    <span class="data-value">{{ data.new.publishYear || '无' }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': data.old?.rating !== data.new.rating }">
                    <span class="data-label">评分:</span>
                    <span class="data-value">{{ data.new.rating || '无' }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': data.old?.series !== data.new.series }">
                    <span class="data-label">丛书:</span>
                    <span class="data-value">{{ data.new.series || '无' }}</span>
                  </div>
                  <div class="data-row" :class="{ 'changed': JSON.stringify(data.old?.tags) !== JSON.stringify(data.new.tags) }">
                    <span class="data-label">标签:</span>
                    <span class="data-value">{{ data.new.tags?.join(', ') || '无' }}</span>
                  </div>
                </div>
                <div v-else class="no-data error">搜索失败</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookStore } from '@/stores/book';
import { bookService } from '@/api/book';
import { searchBookByISBN, searchBookByISBNWithSource } from '@/api/common/isbnApi';
import type { BookSearchResult } from '@/api/common/isbnApi/types';
import { API_CONFIGS } from '@/api/common/isbnApi/apiConfig';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();

// 状态管理
const manualIsbn = ref('');
const isProcessing = ref(false);
const selectedBooks = ref<string[]>([]);
const importResult = ref<any>(null);
const currentProcessingBook = ref<any>(null);
const newlyAddedIsbns = ref<string[]>([]); // 新添加的ISBN，用于高亮显示
const showExitConfirmDialog = ref(false); // 是否显示退出确认弹窗

const selectedIsbnItems = ref<string[]>([]); // 选中的ISBN项（用于更换书源）
const showSourceSelector = ref(false); // 是否显示书源选择弹窗
const selectedSource = ref<string>('dbr'); // 选中的书源
const isReseearching = ref(false); // 是否正在重新搜索
const reseearchProgress = ref({ current: 0, total: 0 }); // 重新搜索进度
const showCompareView = ref(false); // 是否显示对比视图
const compareData = ref<Map<string, { old: BookSearchResult | null; new: BookSearchResult | null }>>(new Map()); // 对比数据
const lastUsedSource = ref<string>(localStorage.getItem('batch_scanner_last_source') || 'dbr'); // 记忆上次使用的书源
const cancelReseearch = ref(false); // 是否取消重新搜索

// ISBN列表
interface IsbnItem {
  isbn: string;
  searching: boolean;
  data: BookSearchResult | null;
  error: string | null;
  isNew?: boolean; // 是否为新增
}

const isbnList = ref<IsbnItem[]>([]);

// 本地存储key
const STORAGE_KEY = 'batch_scanner_isbn_list';
const BOOK_CACHE_KEY = 'batch_scanner_book_cache';

// 从本地存储加载列表
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 确保加载的数据包含书籍信息
      isbnList.value = parsed.map((item: IsbnItem) => {
        // 如果数据中没有书籍信息，尝试从缓存恢复
        const data = item.data || getBookFromCache(item.isbn);
        if (data) {
          console.log(`📊 [BatchScanner.loadFromStorage] ISBN ${item.isbn} 恢复数据:`, {
            rating: data.rating,
            series: data.series,
            tags: data.tags,
            tagsCount: data.tags?.length || 0
          });
        }
        return {
          ...item,
          data: data
        };
      });
      
      return true;
    }
  } catch (e: unknown) {
    console.error('📊 [BatchScanner.loadFromStorage] 加载失败:', e);
  }
  return false;
};

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isbnList.value));
  } catch (e: unknown) {
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e: unknown) {
  }
};

const getBookFromCache = (isbn: string): BookSearchResult | null => {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      return cache[isbn] || null;
    }
  } catch (e: unknown) {
  }
  return null;
};

const saveBookToCache = (isbn: string, bookData: BookSearchResult) => {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    const cache = cacheData ? JSON.parse(cacheData) : {};
    cache[isbn] = bookData;
    localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(cache));
  } catch (e: unknown) {
  }
};

const clearBookCache = () => {
  try {
    localStorage.removeItem(BOOK_CACHE_KEY);
  } catch (e: unknown) {
  }
};

const hasCachedBooks = () => {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      return Object.keys(cache).length > 0;
    }
  } catch (e: unknown) {
  }
  return false;
};

// 页面加载时从本地存储恢复
const hasLoadedFromStorage = loadFromStorage();

// 预览书籍列表
const previewBooks = computed(() => {
  const books = isbnList.value
    .filter(item => item.data !== null)
    .map(item => {
      console.log(`📊 [previewBooks] ISBN ${item.isbn} 数据:`, {
        rating: item.data?.rating,
        series: item.data?.series,
        tags: item.data?.tags,
        tagsCount: item.data?.tags?.length || 0,
        source: item.data?.source
      });
      return item.data!;
    })
    .filter(book => book !== null);
  
  console.log(`📊 [previewBooks] 共 ${books.length} 本书籍预览`);
  return books;
});

// 进度文本
const progressText = computed(() => {
  return `${currentIndex.value}/${totalItems.value}`;
});

// 进度百分比
const progressPercent = computed(() => {
  if (totalItems.value === 0) return 0;
  return Math.round((currentIndex.value / totalItems.value) * 100);
});

const currentIndex = ref(0);
const totalItems = ref(0);

// 返回上一页
const goBack = () => {
  // 检查是否有缓存的书籍信息
  if (hasCachedBooks() || isbnList.value.some(item => item.data !== null)) {
    showExitConfirmDialog.value = true;
  } else {
    router.back();
  }
};

// 确认退出并清除缓存
const confirmExit = () => {
  showExitConfirmDialog.value = false;
  // 清空所有缓存
  clearStorage();
  clearBookCache();
  // 返回上一页
  router.back();
};

// 取消退出
const cancelExit = () => {
  showExitConfirmDialog.value = false;
};

// 跳转到扫描页面（带来源标识）
const goToScanner = () => {
  router.push({
    path: '/book/isbn-scanner',
    query: { from: 'batch' }
  });
};

// 添加ISBN
const addIsbn = () => {
  const isbn = manualIsbn.value.trim();
  if (!isbn) return;

  // 检查是否已存在
  if (isbnList.value.some(item => item.isbn === isbn)) {
    alert('该ISBN已存在');
    return;
  }

  // 添加到列表
  isbnList.value.push({
    isbn,
    searching: false,
    data: null,
    error: null
  });

  // 自动搜索
  const index = isbnList.value.length - 1;
  searchSingle(index);

  // 清空输入
  manualIsbn.value = '';
};

// 移除ISBN
const removeIsbn = (index: number) => {
  const removedIsbn = isbnList.value[index]?.isbn;
  // 从isbnList中移除
  isbnList.value.splice(index, 1);
  selectedBooks.value = selectedBooks.value.filter(isbn => isbn !== removedIsbn);

  // 从缓存中移除该书籍
  if (removedIsbn) {
    try {
      const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
      if (cacheData) {
        const cache = JSON.parse(cacheData);
        if (cache[removedIsbn]) {
          delete cache[removedIsbn];
          localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(cache));
        }
      }
    } catch (e: unknown) {
    }
  }

  // 保存到本地存储
  saveToStorage();
};

// 清空所有
const clearAll = () => {
  if (confirm('确定要清空所有ISBN吗？')) {
    isbnList.value = [];
    selectedBooks.value = [];
    newlyAddedIsbns.value = [];

    // 清空本地存储和书籍缓存
    clearStorage();
    clearBookCache();
  }
};

// 全选书籍
const selectAllBooks = () => {
  selectedBooks.value = previewBooks.value.map(book => book.isbn);
};

// 全不选书籍
const deselectAllBooks = () => {
  selectedBooks.value = [];
};

// 反选书籍
const invertSelection = () => {
  const allIsbns = previewBooks.value.map(book => book.isbn);
  selectedBooks.value = allIsbns.filter(isbn => !selectedBooks.value.includes(isbn));
};

const toggleIsbnSelection = (isbn: string) => {
  const index = selectedIsbnItems.value.indexOf(isbn);
  if (index > -1) {
    selectedIsbnItems.value.splice(index, 1);
  } else {
    selectedIsbnItems.value.push(isbn);
  }
};

const selectAllIsbnItems = () => {
  selectedIsbnItems.value = isbnList.value.map(item => item.isbn);
};

const deselectAllIsbnItems = () => {
  selectedIsbnItems.value = [];
};

const invertIsbnSelection = () => {
  const allIsbns = isbnList.value.map(item => item.isbn);
  selectedIsbnItems.value = allIsbns.filter(isbn => !selectedIsbnItems.value.includes(isbn));
};

const deleteSelectedIsbnItems = () => {
  if (selectedIsbnItems.value.length === 0) return;
  
  if (!confirm(`确定要删除选中的 ${selectedIsbnItems.value.length} 个ISBN吗？`)) {
    return;
  }
  
  isbnList.value = isbnList.value.filter(item => !selectedIsbnItems.value.includes(item.isbn));
  selectedIsbnItems.value = [];
  saveToStorage();
};

const batchSearchSelected = async () => {
  const itemsToSearch = selectedIsbnItems.value.length > 0 
    ? isbnList.value.filter(item => selectedIsbnItems.value.includes(item.isbn) && !item.data)
    : isbnList.value.filter(item => !item.data);
  
  if (itemsToSearch.length === 0) {
    alert('所有选中的ISBN都已搜索完成');
    return;
  }
  
  isProcessing.value = true;
  totalItems.value = itemsToSearch.length;
  currentIndex.value = 0;
  
  for (let i = 0; i < itemsToSearch.length; i++) {
    const item = itemsToSearch[i];
    const index = isbnList.value.findIndex(i => i.isbn === item.isbn);
    if (index === -1) continue;
    
    currentIndex.value++;
    currentProcessingBook.value = item;
    
    await searchSingle(index);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isProcessing.value = false;
  currentIndex.value = 0;
  currentProcessingBook.value = null;
  totalItems.value = 0;
};

const openSourceSelector = () => {
  if (selectedBooks.value.length === 0) {
    alert('请先选择要更换书源的书籍');
    return;
  }
  selectedSource.value = lastUsedSource.value;
  showSourceSelector.value = true;
};

const closeSourceSelector = () => {
  showSourceSelector.value = false;
};

const saveLastUsedSource = (source: string) => {
  lastUsedSource.value = source;
  localStorage.setItem('batch_scanner_last_source', source);
};

const reSearchWithSource = async () => {
  if (selectedBooks.value.length === 0) return;
  
  showSourceSelector.value = false;
  isReseearching.value = true;
  cancelReseearch.value = false;
  reseearchProgress.value = { current: 0, total: selectedBooks.value.length };
  
  saveLastUsedSource(selectedSource.value);
  compareData.value.clear();
  
  const failedItems: string[] = [];
  
  for (let i = 0; i < selectedBooks.value.length; i++) {
    if (cancelReseearch.value) {
      break;
    }
    
    const isbn = selectedBooks.value[i];
    const item = isbnList.value.find(i => i.isbn === isbn);
    
    if (!item) continue;
    
    reseearchProgress.value.current = i + 1;
    currentProcessingBook.value = { title: item.data?.title || isbn, isbn };
    
    const oldData = item.data ? { ...item.data } : null;
    
    try {
      const result = await searchBookByISBNWithSource(isbn, selectedSource.value);
      
      if (result) {
        compareData.value.set(isbn, { old: oldData, new: result });
        item.data = result;
        item.error = null;
        saveBookToCache(isbn, result);
      } else {
        failedItems.push(isbn);
        compareData.value.set(isbn, { old: oldData, new: null });
      }
    } catch (error) {
      console.error(`重新搜索失败 [${isbn}]:`, error);
      failedItems.push(isbn);
      compareData.value.set(isbn, { old: oldData, new: null });
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  isReseearching.value = false;
  currentProcessingBook.value = null;
  
  if (compareData.value.size > 0 && !cancelReseearch.value) {
    showCompareView.value = true;
  }
  
  if (failedItems.length > 0 && !cancelReseearch.value) {
    alert(`以下ISBN搜索失败: ${failedItems.join(', ')}`);
  }
};

const closeCompareView = () => {
  showCompareView.value = false;
  compareData.value.clear();
};

const applyNewData = (isbn: string) => {
  const data = compareData.value.get(isbn);
  if (data?.new) {
    const item = isbnList.value.find(i => i.isbn === isbn);
    if (item) {
      item.data = data.new;
      saveBookToCache(isbn, data.new);
    }
  }
};

const applyAllNewData = () => {
  compareData.value.forEach((data, isbn) => {
    if (data.new) {
      const item = isbnList.value.find(i => i.isbn === isbn);
      if (item) {
        item.data = data.new;
        saveBookToCache(isbn, data.new);
      }
    }
  });
  closeCompareView();
};

const retryFailedSearch = async (isbn: string) => {
  const item = isbnList.value.find(i => i.isbn === isbn);
  if (!item) return;
  
  item.searching = true;
  item.error = null;
  
  try {
    const result = await searchBookByISBNWithSource(isbn, selectedSource.value);
    if (result) {
      item.data = result;
      saveBookToCache(isbn, result);
    } else {
      item.error = '未找到书籍信息';
    }
  } catch (error) {
    console.error(`重试搜索失败 [${isbn}]:`, error);
    item.error = '搜索失败，请重试';
  } finally {
    item.searching = false;
  }
};

// 搜索单个ISBN
const searchSingle = async (index: number) => {
  const item = isbnList.value[index];
  if (!item) return;

  // 先检查缓存
  const cachedBook = getBookFromCache(item.isbn);
  if (cachedBook) {
    console.log(`📊 [BatchScanner] ISBN ${item.isbn} 从缓存获取数据:`, {
      rating: cachedBook.rating,
      series: cachedBook.series,
      tags: cachedBook.tags,
      tagsCount: cachedBook.tags?.length || 0
    });
    item.data = cachedBook;
    item.error = null;
    return;
  }

  item.searching = true;
  item.error = null;
  item.data = null;

  try {
    // 使用豆瓣和DBR作为数据源
    const results = await searchBookByISBN(item.isbn);

    console.log(`📊 [BatchScanner] ISBN ${item.isbn} 搜索结果:`, JSON.stringify(results, null, 2));

    // 优先使用DBR，然后是豆瓣
    const bestResult = results.dbr || results.douban || results.isbnWork || results.tanshu;

    if (bestResult) {
      console.log(`📊 [BatchScanner] ISBN ${item.isbn} 最佳结果详情:`, {
        source: bestResult.source,
        title: bestResult.title,
        rating: bestResult.rating,
        series: bestResult.series,
        tags: bestResult.tags,
        tagsCount: bestResult.tags?.length || 0
      });
      item.data = bestResult;
      // 立即存储到缓存
      saveBookToCache(item.isbn, bestResult);
      console.log(`📊 [BatchScanner] ISBN ${item.isbn} 已缓存`);
    } else {
      item.error = '未找到书籍信息';
    }
  } catch (error) {
    console.error(`搜索失败 [${item.isbn}]:`, error);
    item.error = '搜索失败';
  } finally {
    item.searching = false;
  }
};

// 搜索所有ISBN
const searchAll = async () => {
  if (isProcessing.value || isbnList.value.length === 0) return;

  isProcessing.value = true;
  totalItems.value = isbnList.value.filter(item => !item.data && !item.searching).length;
  currentIndex.value = 0;

  for (let i = 0; i < isbnList.value.length; i++) {
    const item = isbnList.value[i];
    if (item.data || item.searching) continue;

    currentIndex.value++;
    currentProcessingBook.value = item;

    await searchSingle(i);

    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  isProcessing.value = false;
  currentIndex.value = 0;
  currentProcessingBook.value = null;
  totalItems.value = 0;
};

// 导入所有书籍
const importAll = async () => {
  const booksToImport = selectedBooks.value.length > 0
    ? previewBooks.value.filter(book => selectedBooks.value.includes(book.isbn))
    : previewBooks.value;

  if (booksToImport.length === 0) {
    alert('请选择要导入的书籍');
    return;
  }

  if (!confirm(`确定要导入 ${booksToImport.length} 本书籍到书库吗？`)) {
    return;
  }

  isProcessing.value = true;
  totalItems.value = booksToImport.length;
  currentIndex.value = 0;

  let successCount = 0;
  let failedBooks: string[] = [];

  for (let i = 0; i < booksToImport.length; i++) {
    const bookData = booksToImport[i];
    currentIndex.value++;
    currentProcessingBook.value = bookData;

    console.log(`📊 [BatchScanner.importAll] 导入书籍 ${i + 1}/${booksToImport.length}:`, {
      isbn: bookData.isbn,
      title: bookData.title,
      rating: bookData.rating,
      series: bookData.series,
      tags: bookData.tags,
      source: bookData.source
    });

    // 检查是否从缓存获取
    const fromCache = getBookFromCache(bookData.isbn);
    if (fromCache) {
      console.log(`📊 [BatchScanner.importAll] 从缓存获取的数据:`, {
        rating: fromCache.rating,
        series: fromCache.series,
        tags: fromCache.tags
      });
    }

    try {
      const newBook = await bookService.addBook({
        isbn: bookData.isbn,
        title: bookData.title,
        author: bookData.author,
        publisher: bookData.publisher || '',
        publishYear: bookData.publishYear,
        pages: bookData.pages,
        binding1: bookData.binding1 || 0,
        binding2: bookData.binding2 || 0,
        book_type: bookData.book_type || 1,
        coverUrl: bookData.coverUrl || '',
        purchaseDate: undefined,
        purchasePrice: undefined,
        standardPrice: bookData.price ? parseFloat(bookData.price.replace(/[^\d.]/g, '')) : undefined,
        readStatus: '未读' as const,
        readCompleteDate: undefined,
        rating: bookData.rating,
        tags: bookData.tags?.filter((t): t is string => typeof t === 'string') || [],
        groups: [],
        series: bookData.series || '',
        note: '',
        description: bookData.description || ''
      });

      bookStore.addBook(newBook);
      successCount++;

      // 导入成功后，从isbnList中移除该项
      const index = isbnList.value.findIndex(item => item.isbn === bookData.isbn);
      if (index !== -1) {
        isbnList.value.splice(index, 1);
      }
    } catch (error) {
      console.error(`导入失败 [${bookData.isbn}]:`, error);
      failedBooks.push(bookData.title);
    }

    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  isProcessing.value = false;
  currentIndex.value = 0;
  currentProcessingBook.value = null;
  totalItems.value = 0;

  // 清空选择
  selectedBooks.value = [];

  // 保存更新后的列表到本地存储
  saveToStorage();

  // 显示导入结果
  if (failedBooks.length === 0) {
    importResult.value = {
      type: 'success',
      icon: '✅',
      title: '导入成功',
      message: `成功导入 ${successCount} 本书籍到书库`
    };
  } else {
    importResult.value = {
      type: 'partial',
      icon: '⚠️',
      title: '部分导入成功',
      message: `成功导入 ${successCount} 本，失败 ${failedBooks.length} 本\n失败书籍: ${failedBooks.join('、')}`
    };
  }
};

// 关闭结果提示
const closeResult = () => {
  if (importResult.value?.type === 'success') {
    // 导入成功，清空所有缓存
    clearStorage();
    clearBookCache();
    importResult.value = null;
    // 返回书库列表
    router.push('/book');
  } else {
    importResult.value = null;
  }
};

// 封面加载错误处理
const handleCoverError = (event: Event, book: BookSearchResult) => {
  const imgElement = event.target as HTMLImageElement;
  console.error('封面加载失败:', book.title);

  // 生成占位图片
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(book.title.charAt(0), canvas.width / 2, canvas.height / 2);
  }
  imgElement.src = canvas.toDataURL();
};

// 从路由参数获取ISBN
const isUnmounted = ref(false); // 标记组件是否已卸载
const isProcessingRoute = ref(false); // 防止重复处理路由

const processRouteIsbn = () => {
  // 如果组件已卸载或正在处理，不再处理
  if (isUnmounted.value || isProcessingRoute.value) {
    return;
  }
  
  const isbnParam = route.query.isbn;
  if (!isbnParam) {
    return;
  }
  console.log('📊 处理前列表状态:', isbnList.value.map(item => item.isbn));
  
  // 开始处理
  isProcessingRoute.value = true;
  
  let isbns: string[] = [];
  
  // 处理单个ISBN或多个ISBN（逗号分隔）
  if (typeof isbnParam === 'string') {
    isbns = isbnParam.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(isbnParam)) {
    isbns = isbnParam.map(s => s?.trim()).filter((s): s is string => Boolean(s));
  }
  // 记录新添加的ISBN
  newlyAddedIsbns.value = isbns;
  
  // 添加所有ISBN到列表（去重）
  let addedCount = 0;
  isbns.forEach(isbn => {
    // 检查是否已存在
    if (!isbnList.value.some(item => item.isbn === isbn)) {
      // 先尝试从缓存获取书籍信息
      const cachedBook = getBookFromCache(isbn);
      
      isbnList.value.push({
        isbn,
        searching: false,
        data: cachedBook,  // 使用缓存的书籍信息
        error: null,
        isNew: true // 标记为新添加
      });
      addedCount++;
    } else {
    }
  });
  
  // 保存到本地存储
  if (addedCount > 0) {
    saveToStorage();
  }
  // 清空 isbn 参数，避免重复处理（保留其他参数）
  if (isbns.length > 0) {
    // 只移除 isbn 参数，不清空所有参数
    const currentQuery = { ...route.query };
    delete currentQuery.isbn;
    
    router.replace({ query: currentQuery }).then(() => {
      isProcessingRoute.value = false; // 清空完成后重置标记
    });
    
    // 自动搜索所有新添加的ISBN
    const startIndex = isbnList.value.length - isbns.length;
    for (let i = startIndex; i < isbnList.value.length; i++) {
      searchSingle(i);
    }
    
    // 3秒后移除新标记
    setTimeout(() => {
      newlyAddedIsbns.value = [];
      isbnList.value.forEach(item => {
        item.isNew = false;
      });
    }, 3000);
  }
};

// 使用 watch 监听路由 query.isbn 的变化
watch(
  () => route.query.isbn,
  (newIsbn) => {
    processRouteIsbn();
  },
  { immediate: true } // 立即执行一次
);

// 组件挂载时的处理
onMounted(() => {
  // 如果列表为空，尝试从本地存储恢复
  if (isbnList.value.length === 0 && !hasLoadedFromStorage) {
    loadFromStorage();
  }
});

// 组件卸载时标记
onUnmounted(() => {
  isUnmounted.value = true;
  isProcessingRoute.value = false;
});
</script>

<style scoped>
.batch-scanner-container {
  min-height: 100vh;
  background-color: var(--bg-primary, #f5f5f5);
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary, #fff);
  border-bottom: 1px solid var(--border-light, #e0e0e0);
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
  fill: var(--text-primary, #333);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  color: var(--text-primary, #333);
}

.header-spacer {
  width: 36px;
}

/* 进度条 */
.progress-section {
  padding: 16px;
  background-color: var(--bg-card, #fff);
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  color: var(--text-secondary, #666);
  font-weight: 500;
}

.progress-percent {
  font-size: 16px;
  color: var(--primary-color, #4CAF50);
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--bg-disabled, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color, #4CAF50);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-detail {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-hint, #999);
  text-align: center;
}

/* 扫描输入区域 */
.scan-input-section {
  padding: 20px 16px;
  background-color: var(--bg-card, #fff);
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.isbn-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 16px;
  font-family: monospace;
  outline: none;
  transition: border-color 0.2s ease;
}

.isbn-input:focus {
  border-color: var(--primary-color, #4CAF50);
}

.isbn-input:disabled {
  background-color: var(--bg-disabled, #f5f5f5);
  cursor: not-allowed;
}

.add-btn {
  padding: 12px 24px;
  background-color: var(--primary-color, #4CAF50);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.add-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.add-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.scan-btn {
  padding: 12px 20px;
  background-color: #2196F3;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s ease;
}

.scan-btn:hover:not(:disabled) {
  background-color: #0b7dda;
}

.scan-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.scan-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.scan-tip {
  font-size: 13px;
  color: var(--text-hint, #999);
  text-align: center;
  margin: 0;
}

/* ISBN列表 */
.isbn-list-section {
  padding: 16px;
  background-color: var(--bg-primary, #f5f5f5);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #333);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.selection-actions {
  display: flex;
  gap: 6px;
}

.selection-btn {
  padding: 8px 16px;
  background-color: #fff;
  color: var(--primary-color, #4CAF50);
  border: 1px solid var(--primary-color, #4CAF50);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.selection-btn:hover:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.1);
}

.selection-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.selection-btn.danger {
  color: #f44336;
  border-color: #f44336;
}

.selection-btn.danger:hover:not(:disabled) {
  background-color: #ffebee;
}

.selection-btn.primary {
  background-color: #4CAF50;
  color: #fff;
  border-color: #4CAF50;
}

.selection-btn.primary:hover:not(:disabled) {
  background-color: #45a049;
}

.selection-btn:disabled {
  background-color: var(--text-disabled, #f5f5f5);
  border-color: var(--text-disabled, #ccc);
  color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.clear-btn {
  padding: 8px 16px;
  background-color: #f44336;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clear-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.clear-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.isbn-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.isbn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-card, #fff);
  border-radius: 8px;
  border-left: 4px solid var(--border-light, #e0e0e0);
  transition: all 0.2s ease;
}

.isbn-item.searching {
  border-left-color: #2196F3;
}

.isbn-item.found {
  border-left-color: #4CAF50;
}

.isbn-item.not-found {
  border-left-color: #ff9800;
}

.isbn-item.error {
  border-left-color: #f44336;
}

.isbn-item.new {
  background-color: #e3f2fd;
  border-left-color: #2196F3;
  animation: highlight 0.3s ease;
}

@keyframes highlight {
  from {
    background-color: #bbdefb;
    transform: scale(1.02);
  }
  to {
    background-color: #e3f2fd;
    transform: scale(1);
  }
}

.new-badge {
  display: inline-block;
  padding: 2px 6px;
  background-color: #2196F3;
  color: white;
  font-size: 11px;
  border-radius: 4px;
  margin-right: 6px;
  font-weight: 500;
}

.isbn-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.isbn-number {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.book-title {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.status-text {
  font-size: 13px;
}

.status-text.pending {
  color: var(--text-hint, #999);
}

.status-text.searching {
  color: #2196F3;
}

.status-text.error {
  color: #f44336;
}

.isbn-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.action-btn.search-again {
  background-color: #2196F3;
  color: #fff;
}

.action-btn.search-again:hover:not(:disabled) {
  background-color: #0b7dda;
}

.action-btn.remove {
  background-color: #f44336;
  color: #fff;
}

.action-btn.remove:hover:not(:disabled) {
  background-color: #d32f2f;
}

/* 书籍预览 */
.preview-section {
  padding: 16px;
  background-color: var(--bg-primary, #f5f5f5);
  flex: 1;
}

.import-all-btn {
  padding: 10px 24px;
  background-color: var(--primary-color, #4CAF50);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.import-all-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.import-all-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.book-card {
  display: flex;
  background-color: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 12px;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.book-cover {
  width: 80px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f5f5f5;
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
  gap: 6px;
  overflow: hidden;
}

.book-info .book-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-author {
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-isbn {
  font-size: 12px;
  font-family: monospace;
  color: var(--text-hint, #999);
  margin: 0;
}

.book-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.source-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color, #FF6B35);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.publisher-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border-radius: 10px;
  font-size: 11px;
}

.book-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.book-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.book-check label {
  font-size: 12px;
  color: var(--text-secondary, #666);
  cursor: pointer;
}

/* 导入结果 */
.import-result {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.import-result.success {
  background-color: rgba(76, 175, 80, 0.95);
}

.import-result.partial {
  background-color: rgba(255, 152, 0, 0.95);
}

.import-result.error {
  background-color: rgba(244, 67, 54, 0.95);
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-content {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
}

.result-content h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--text-primary, #333);
}

.result-content p {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 0 0 16px 0;
  white-space: pre-line;
}

.close-btn {
  padding: 10px 24px;
  background-color: var(--primary-color, #4CAF50);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.close-btn:hover {
  background-color: #45a049;
}

/* 退出确认弹窗 */
.exit-confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.confirm-dialog-content {
  background-color: #fff;
  padding: 32px;
  border-radius: 16px;
  text-align: center;
  max-width: 480px;
  margin: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-primary, #333);
}

.dialog-message {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 0 0 24px 0;
  line-height: 1.6;
  white-space: pre-line;
}

.dialog-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
}

.dialog-btn.cancel-btn {
  background-color: #f44336;
  color: #fff;
}

.dialog-btn.cancel-btn:hover {
  background-color: #d32f2f;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.dialog-btn.confirm-btn {
  background-color: #4CAF50;
  color: #fff;
}

.dialog-btn.confirm-btn:hover {
  background-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* 响应式 */
@media (max-width: 640px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .input-group {
    flex-direction: column;
  }

  .add-btn, .scan-btn {
    width: 100%;
  }

  .isbn-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .isbn-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .selection-actions {
    flex: 1;
    justify-content: space-between;
  }

  .selection-btn {
    flex: 1;
    padding: 8px 12px;
    font-size: 12px;
  }

  .import-all-btn {
    width: 100%;
  }
}

/* ISBN多选相关样式 */
.isbn-checkbox {
  display: flex;
  align-items: center;
  padding-right: 12px;
}

.isbn-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.isbn-item.selected {
  background-color: #e3f2fd;
  border-left-color: #2196F3;
}

.isbn-selection-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: rgba(33, 150, 243, 0.1);
  border-radius: 8px;
}

.selection-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.selection-hint {
  font-size: 12px;
  color: var(--text-hint, #999);
  margin-left: auto;
}

.source-indicator {
  font-size: 11px;
  color: #FF6B35;
  background-color: rgba(255, 107, 53, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.change-source-btn {
  padding: 8px 16px;
  background-color: #FF6B35;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.change-source-btn:hover:not(:disabled) {
  background-color: #e55a2b;
}

.change-source-btn:disabled {
  background-color: var(--text-disabled, #ccc);
  cursor: not-allowed;
}

.cancel-btn {
  margin-top: 12px;
  padding: 8px 24px;
  background-color: #f44336;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
}

.cancel-btn:hover {
  background-color: #d32f2f;
}

/* 书源选择弹窗 */
.source-selector-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.source-dialog-content {
  background-color: #fff;
  padding: 32px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.source-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--border-light, #e0e0e0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-option:hover {
  border-color: #2196F3;
  background-color: rgba(33, 150, 243, 0.05);
}

.source-option.selected {
  border-color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
}

.source-radio {
  display: flex;
  align-items: center;
  gap: 12px;
}

.source-radio input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.source-radio label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.source-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.source-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.source-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.badge.free {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.badge.paid {
  background-color: #fff3e0;
  color: #FF9800;
}

.badge.recent {
  background-color: #e3f2fd;
  color: #2196F3;
}

/* 对比视图弹窗 */
.compare-view-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.compare-dialog-content {
  background-color: #fff;
  border-radius: 16px;
  max-width: 900px;
  width: 95%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.compare-header .dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 20px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.close-icon:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.compare-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.apply-all-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.apply-all-btn:hover {
  background-color: #45a049;
}

.compare-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.compare-item {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 12px;
}

.compare-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.compare-isbn {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.compare-item-actions {
  display: flex;
  gap: 8px;
}

.apply-btn {
  padding: 6px 12px;
  background-color: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.apply-btn:hover {
  background-color: #45a049;
}

.retry-btn {
  padding: 6px 12px;
  background-color: #2196F3;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-btn:hover {
  background-color: #0b7dda;
}

.compare-content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: start;
}

.compare-column {
  background-color: var(--bg-primary, #f5f5f5);
  border-radius: 8px;
  padding: 12px;
}

.compare-column h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.compare-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-hint, #999);
}

.data-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.data-row.changed {
  background-color: rgba(255, 193, 7, 0.2);
  padding: 4px;
  border-radius: 4px;
  margin: -4px;
  padding: 4px;
}

.data-label {
  font-weight: 500;
  color: var(--text-secondary, #666);
  min-width: 60px;
}

.data-value {
  color: var(--text-primary, #333);
  flex: 1;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: var(--text-hint, #999);
  font-size: 14px;
}

.no-data.error {
  color: #f44336;
}

@media (max-width: 768px) {
  .compare-content {
    grid-template-columns: 1fr;
  }
  
  .compare-arrow {
    transform: rotate(90deg);
    justify-content: flex-start;
    padding-left: 20px;
  }
  
  .compare-dialog-content {
    max-height: 90vh;
  }
}
</style>
