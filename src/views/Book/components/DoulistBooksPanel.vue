<template>
  <div class="doulist-panel">
    <!-- 工具条 -->
    <div class="panel-toolbar">
      <div class="panel-toolbar__row">
        <!-- 分类：购书清单 / 阅读清单 -->
        <div class="seg-group">
          <button
            v-for="tab in categoryTabs"
            :key="tab.value"
            :class="['seg-btn', { active: filterCategory === tab.value }]"
            @click="setCategory(tab.value)"
          >{{ tab.label }}</button>
        </div>
        <input
          v-model="keyword"
          type="text"
          class="filter-input"
          placeholder="搜索书名 / 作者"
          @input="onSearchInput"
        />
      </div>

      <!-- 选中具体书单时的书单操作 -->
      <div v-if="selectedImport" class="panel-toolbar__row panel-toolbar__sub">
        <span class="sub-label">书单分类</span>
        <div class="seg-group seg-group--sm">
          <button
            :class="['seg-btn', { active: (selectedImport.category || 'buy') === 'buy' }]"
            @click="changeDoulistCategory('buy')"
          >购书清单</button>
          <button
            :class="['seg-btn', { active: selectedImport.category === 'read' }]"
            @click="changeDoulistCategory('read')"
          >阅读清单</button>
        </div>
        <span class="toolbar-spacer"></span>
        <button
          v-if="isDoubanDoulist"
          class="tool-btn"
          :disabled="refreshing"
          @click="openRefreshDialog"
        >⟳ 刷新豆列</button>
      </div>

      <div class="panel-toolbar__actions">
        <button class="tool-btn" @click="openAddDialog">+ 添加</button>
        <button class="tool-btn tool-btn--primary" @click="goImport">导入豆列</button>
      </div>
    </div>

    <!-- 面包屑（文件夹 → 书单内） -->
    <div v-if="filterDoulistId" class="breadcrumb-nav">
      <span class="breadcrumb-item" @click="backToFolders">全部书单</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item breadcrumb-item--current">
        {{ selectedImport?.doulist_title || filterDoulistId }}
      </span>
    </div>

    <!-- 文件夹视图：全部书单且无搜索关键字 -->
    <div v-if="showFolders" class="folders-grid">
      <div
        v-for="imp in visibleImports"
        :key="imp.doulist_id"
        class="folder-card"
        @click="openFolder(imp)"
      >
        <!-- 2x2 封面缩略图（3:4，与书库分组卡同款结构） -->
        <div class="folder-card__thumbs">
          <div class="folder-card__thumbs-grid">
            <div v-for="(c, idx) in folderCovers(imp)" :key="idx" class="folder-card__thumb">
              <img :src="doubanCoverProxy(c)" class="thumb__image" loading="lazy" decoding="async" />
            </div>
            <div
              v-for="i in Math.max(0, 4 - folderCovers(imp).length)"
              :key="`p-${i}`"
              class="folder-card__thumb folder-card__thumb--empty"
            ></div>
          </div>
        </div>
        <!-- 名称行 -->
        <div class="folder-card__info">
          <span v-if="isDoubanId(imp.doulist_id)" class="dou-badge">豆</span>
          <span class="folder-card__name">{{ imp.doulist_title || `书单 ${imp.doulist_id}` }}</span>
        </div>
        <!-- 分类角标 -->
        <span class="folder-card__cat" :class="`folder-card__cat--${imp.category === 'read' ? 'read' : 'buy'}`">
          {{ imp.category === 'read' ? '阅读清单' : '购书清单' }}
        </span>
        <!-- 数量角标 -->
        <div class="folder-card__count">
          <span class="count-number">{{ imp.item_count }}</span>
          <span class="count-label">本</span>
        </div>
      </div>

      <div v-if="visibleImports.length === 0 && !loading" class="empty-text">
        还没有书单，可从豆瓣豆列导入，或点「+ 添加」手动创建
      </div>
    </div>

    <!-- 书单内 / 搜索结果：书籍列表 -->
    <template v-else>
      <div v-if="loading && books.length === 0" class="empty-text">加载中...</div>
      <div v-else-if="books.length === 0" class="empty-text">
        {{ keyword ? '没有找到相关书籍' : '该书单还是空的，可以在书单页点「⟳ 刷新豆列」补充新书' }}
      </div>

      <div v-else class="book-list">
        <template v-for="book in books" :key="book.douban_id">
          <!-- 已加入书架：划线折叠成一行 -->
          <div v-if="book.shelf_status === 'shelf'" class="book-card book-card--shelved" @click="openDouban(book)">
            <div class="shelved-row">
              <span class="doulist-tag">
                <span v-if="book.doulist_id" class="dou-badge">豆</span>
                {{ book.doulist_title || '未分组' }}
              </span>
              <span class="shelved-title">{{ book.title || `豆瓣 ${book.douban_id}` }}</span>
              <span v-if="book.rating" class="shelved-rating">{{ book.rating.toFixed(1) }}</span>
              <span v-if="book.shelved_at" class="shelved-date">{{ book.shelved_at.slice(0, 10) }} 入架</span>
              <button class="btn-undo" @click.stop="setShelf(book, 'pending')">撤回</button>
            </div>
          </div>

          <!-- 未入书架：完整卡片 -->
          <div v-else class="book-card" @click="openDouban(book)">
            <img v-if="book.cover_url" :src="doubanCoverProxy(book.cover_url)" class="cover" loading="lazy" />
            <div v-else class="cover cover--empty">无封面</div>
            <div class="info">
              <div class="doulist-tag">
                <span v-if="book.doulist_id" class="dou-badge">豆</span>
                {{ book.doulist_title || '未分组' }}
                <span v-if="book.list_added_at" class="added-date">{{ book.list_added_at }}</span>
              </div>
              <div class="book-title">{{ book.title || `豆瓣 ${book.douban_id}` }}</div>
              <div class="meta">
                <span v-if="book.author">{{ book.author }}</span>
                <span v-if="book.publisher">{{ book.publisher }}</span>
                <span v-if="book.publish_year">{{ book.publish_year }}</span>
              </div>
              <div class="extra">
                <span v-if="book.isbn13" class="isbn">ISBN {{ book.isbn13 }}</span>
                <span v-if="book.pages">{{ book.pages }}页</span>
                <span v-if="book.price">¥{{ book.price }}</span>
                <span v-if="book.binding">{{ book.binding }}</span>
              </div>

              <!-- 购书清单：待购买标签 + 加入书架（书源） + 划去项目 -->
              <div v-if="effectiveCategory === 'buy'" class="tags-row">
                <span class="tag tag--todo">待购买</span>
                <span class="action-spacer"></span>
                <button
                  class="btn-strike"
                  @click.stop="setShelf(book, 'shelf')"
                >划去项目</button>
                <button
                  class="btn-shelf"
                  :class="{ 'btn-shelf--disabled': shelfChecking[book.douban_id] }"
                  :disabled="shelfChecking[book.douban_id]"
                  :data-douban="book.douban_id"
                  @click.stop="onShelfBtnClick(book)"
                >加入书架</button>
              </div>

              <!-- 阅读清单：未读 / 在读 / 已读 -->
              <div v-else class="tags-row">
                <div class="read-status-group">
                  <button
                    :class="['rs-btn', { active: (book.read_status || 'unread') === 'unread' }]"
                    @click.stop="setReadStatus(book, 'unread')"
                  >未读</button>
                  <button
                    :class="['rs-btn', { active: book.read_status === 'reading' }]"
                    @click.stop="setReadStatus(book, 'reading')"
                  >在读</button>
                  <button
                    :class="['rs-btn', { active: book.read_status === 'read' }]"
                    @click.stop="setReadStatus(book, 'read')"
                  >已读</button>
                </div>
                <span class="action-spacer"></span>
                <button
                  class="btn-shelf"
                  :class="{ 'btn-shelf--disabled': shelfChecking[book.douban_id] }"
                  :disabled="shelfChecking[book.douban_id]"
                  :data-douban="book.douban_id"
                  @click.stop="onShelfBtnClick(book)"
                >加入书架</button>
              </div>
            </div>
            <div v-if="book.rating" class="rating">
              {{ book.rating.toFixed(1) }}
              <span class="rating-count">{{ book.rating_count }}人</span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="hasMore" class="load-more">
        <button class="tool-btn" :disabled="loading" @click="loadMore">
          {{ loading ? '加载中...' : `加载更多（${total - books.length} 本）` }}
        </button>
      </div>
    </template>

    <!-- 手动添加弹窗 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
      <div class="dialog">
        <div class="dialog-header">
          <span>手动添加到书单</span>
          <span class="dialog-close" @click="closeAddDialog">×</span>
        </div>
        <div class="dialog-body">
          <div class="dialog-field">
            <label class="field-label">所属书单 <span class="required">*</span></label>
            <select v-model="addDoulistChoice" class="form-input">
              <option value="" disabled>请选择书单</option>
              <option v-if="filterDoulistId" :value="filterDoulistId">
                当前书单：{{ selectedImport?.doulist_title || filterDoulistId }}
              </option>
              <option value="__new__">＋ 新建书单...</option>
              <option v-for="imp in imports" :key="imp.doulist_id" :value="imp.doulist_id">
                {{ imp.doulist_title || `豆列 ${imp.doulist_id}` }}（{{ imp.item_count }}）
              </option>
            </select>
          </div>
          <div v-if="addDoulistChoice === '__new__'" class="dialog-field">
            <label class="field-label">新书单名称 <span class="required">*</span></label>
            <input v-model="addForm.newDoulistTitle" type="text" class="form-input" placeholder="如 2026 想读" />
            <div class="seg-group seg-group--sm seg-group--field">
              <button
                :class="['seg-btn', { active: addForm.newDoulistCategory === 'buy' }]"
                @click="addForm.newDoulistCategory = 'buy'"
              >购书清单</button>
              <button
                :class="['seg-btn', { active: addForm.newDoulistCategory === 'read' }]"
                @click="addForm.newDoulistCategory = 'read'"
              >阅读清单</button>
            </div>
          </div>
          <div class="dialog-field">
            <label class="field-label">书名 <span class="required">*</span></label>
            <input v-model="addForm.title" type="text" class="form-input" placeholder="请输入书名" />
          </div>
          <div class="dialog-field">
            <label class="field-label">作者</label>
            <input v-model="addForm.author" type="text" class="form-input" placeholder="选填" />
          </div>
          <div class="dialog-field dialog-field--row">
            <div>
              <label class="field-label">出版社</label>
              <input v-model="addForm.publisher" type="text" class="form-input" placeholder="选填" />
            </div>
            <div>
              <label class="field-label">出版年</label>
              <input v-model="addForm.publishYear" type="text" class="form-input" placeholder="选填" />
            </div>
          </div>
          <div class="dialog-field">
            <label class="field-label">豆瓣链接或 ID</label>
            <input v-model="addForm.doubanRef" type="text" class="form-input" placeholder="选填，填了可避免重复" />
          </div>
          <div v-if="addError" class="error-text">{{ addError }}</div>
        </div>
        <div class="dialog-footer">
          <button class="tool-btn" @click="closeAddDialog">取消</button>
          <button class="tool-btn tool-btn--primary" :disabled="adding" @click="submitAdd">
            {{ adding ? '添加中...' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 增量刷新弹窗 -->
    <div v-if="showRefreshDialog" class="dialog-overlay" @click.self="!refreshing && closeRefreshDialog()">
      <div class="dialog">
        <div class="dialog-header">
          <span>刷新豆列（增量）</span>
          <span v-if="!refreshing" class="dialog-close" @click="closeRefreshDialog">×</span>
        </div>
        <div class="dialog-body">
          <p class="refresh-hint">
            重新抓取豆列，仅<b>补充新书</b>；已有的书不做任何更改（不覆盖字段、不动书架状态）。
          </p>

          <div v-if="refreshing" class="progress-block">
            <div class="progress-text">
              正在抓取第 {{ refreshFetchedPages }} 页... 已获取 {{ refreshBooks.length }} 本
              <span v-if="refreshMeta && refreshMeta.totalPages">/ 约 {{ refreshMeta.totalPages * 25 }} 本</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: refreshMeta && refreshMeta.totalPages ? Math.min(100, Math.round(refreshFetchedPages / refreshMeta.totalPages * 100)) + '%' : '50%' }"
              ></div>
            </div>
            <button class="tool-btn" @click="cancelRefresh">停止抓取</button>
          </div>

          <template v-if="!refreshing">
            <div v-if="refreshError" class="error-text">{{ refreshError }}</div>
            <div v-else-if="refreshResult" class="refresh-result">
              ✅ 刷新完成：新增 <b>{{ refreshResult.imported }}</b> 本<template v-if="refreshResult.duplicates">，已有 {{ refreshResult.duplicates }} 本未更改</template>
            </div>
            <span v-else-if="refreshBlocked" class="error-text">⚠️ 豆瓣暂时限制了访问，已抓到 {{ refreshBooks.length }} 本，请稍后重试</span>
          </template>
        </div>
        <div class="dialog-footer">
          <button class="tool-btn" :disabled="refreshing" @click="closeRefreshDialog">
            {{ refreshResult ? '关闭' : '取消' }}
          </button>
          <button
            v-if="!refreshing && !refreshResult"
            class="tool-btn tool-btn--primary"
            :disabled="refreshBlocked"
            @click="startRefresh"
          >{{ refreshBooks.length ? '继续抓取' : '开始刷新' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  doulistApi,
  doubanCoverProxy,
  type DoulistBook,
  type DoulistImportRecord,
  type DoulistMeta,
  type DoulistPreviewBook
} from '@/api/doulistService';
import { searchBookByISBN } from '@/api/common/isbnApi';
import { bookService } from '@/api/book';

const router = useRouter();

const books = ref<DoulistBook[]>([]);
const imports = ref<DoulistImportRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 50;
const loading = ref(false);
const hasMore = ref(false);

const filterCategory = ref<'' | 'buy' | 'read'>('');
const filterDoulistId = ref('');
const keyword = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// 单次抓取页数上限（读自豆列设置）
const maxPagesLimit = ref(0);
// 是否隐藏已划去/已入书架的书（读自第三方设置，持久化）
const hideShelved = ref(false);

// 加入书架按钮的置灰状态（按 douban_id 缓存）
const shelfChecking = reactive<Record<string, boolean>>({});

const selectedImport = computed(() =>
  imports.value.find((imp) => imp.doulist_id === filterDoulistId.value) || null
);
const isDoubanDoulist = computed(() => /^\d+$/.test(filterDoulistId.value));

// 当前展示的分类：选中具体书单时取书单分类，否则取筛选分类
const effectiveCategory = computed<'buy' | 'read'>(() => {
  if (selectedImport.value) return selectedImport.value.category === 'read' ? 'read' : 'buy';
  return filterCategory.value === 'read' ? 'read' : 'buy';
});

const categoryTabs = [
  { value: '' as const, label: '全部' },
  { value: 'buy' as const, label: '购书清单' },
  { value: 'read' as const, label: '阅读清单' }
];

/* ---------- 文件夹视图 ---------- */
const showFolders = computed(() => filterDoulistId.value === '' && keyword.value.trim() === '');

const visibleImports = computed(() =>
  imports.value.filter((imp) => {
    // 断点续跑进度占位行（抓取中未导入）不显示为文件夹
    if (imp.status === 'running') return false;
    if (!filterCategory.value) return true;
    const cat = imp.category === 'read' ? 'read' : 'buy';
    return cat === filterCategory.value;
  })
);

const folderCovers = (imp: DoulistImportRecord): string[] =>
  String(imp.covers || '').split('|').filter(Boolean).slice(0, 4);

const isDoubanId = (id: string) => /^\d+$/.test(id);

const openFolder = (imp: DoulistImportRecord) => {
  filterDoulistId.value = imp.doulist_id;
  filterCategory.value = ''; // 进入书单后显示该书单全部书
  reload();
};

const backToFolders = () => {
  filterDoulistId.value = '';
  reload();
};

const goImport = () => router.push('/book/doulist-import');

const openDouban = (book: DoulistBook) => {
  if (book.douban_url) window.open(book.douban_url, '_blank');
};

/* ---------- 列表 ---------- */
const fetchBooks = async (append = false) => {
  loading.value = true;
  try {
    const res = await doulistApi.books({
      doulistId: filterDoulistId.value || undefined,
      category: (filterCategory.value || undefined) as 'buy' | 'read' | undefined,
      hideShelved: hideShelved.value || undefined,
      page: page.value,
      pageSize
    });
    total.value = res.total;
    books.value = append ? [...books.value, ...res.data] : res.data;
    hasMore.value = books.value.length < res.total;
    // 列表加载后异步检查每本书是否已在书架
    checkShelfStatus(books.value);
  } catch (err) {
    console.error('读取书单失败:', err);
  } finally {
    loading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  fetchBooks(false);
};

const loadMore = () => {
  page.value++;
  fetchBooks(true);
};

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 300);
};

const setCategory = (value: '' | 'buy' | 'read') => {
  if (filterCategory.value === value) return;
  filterCategory.value = value;
  reload();
};

const fetchImports = async () => {
  try {
    const res = await doulistApi.imports();
    imports.value = res.data || [];
  } catch { /* 忽略 */ }
};

/* ---------- 加入书架按钮置灰检查（按 ISBN 查本地书库） ---------- */
const checkShelfStatus = async (list: DoulistBook[]) => {
  for (const book of list) {
    if (!book.isbn13 && !book.isbn10) continue;
    if (shelfChecking[book.douban_id] !== undefined) continue;
    try {
      const res = await doulistApi.shelfCheck(book.douban_id);
      shelfChecking[book.douban_id] = res.exists;
    } catch { /* 忽略 */ }
  }
};

/* ---------- 书单分类 ---------- */
const changeDoulistCategory = async (category: 'buy' | 'read') => {
  const imp = selectedImport.value;
  if (!imp || imp.category === category) return;
  try {
    await doulistApi.setDoulistCategory(imp.doulist_id, category);
    imp.category = category;
    reload();
  } catch (err: any) {
    console.error('设置书单分类失败:', err);
  }
};

/* ---------- 划去项目（原 shelf_status 切换） ---------- */
const setShelf = async (book: DoulistBook, status: 'shelf' | 'pending') => {
  try {
    await doulistApi.setShelf(book.douban_id, status);
    book.shelf_status = status;
    if (status === 'shelf') book.shelved_at = new Date().toISOString();
    else book.shelved_at = null;
    // 如果开启了隐藏划去的书，刷新列表
    if (hideShelved.value && status === 'shelf') {
      reload();
    }
  } catch (err: any) {
    console.error('更新书架状态失败:', err);
  }
};

/* ---------- 加入书架（调用书源 API 搜索 + 创建到本地书库，手动操作，与第三方设置无关） ---------- */
const addToShelfByApi = async (book: DoulistBook) => {
  const isbn = book.isbn13 || book.isbn10;
  if (!isbn) {
    alert('这本书没有 ISBN，无法通过书源加入书架，可手动在书库添加');
    return;
  }
  try {
    // 1) 调书源 API 按 ISBN 搜索元数据
    const searchRes = await searchBookByISBN(isbn);
    const best = searchRes.dbr || searchRes.isbnWork || searchRes.douban || null;
    // 2) 整合：书源结果优先，缺失字段用豆列书数据补
    const baseData = {
      title: best?.title || book.title || '未知书名',
      author: best?.author || book.author || '未知作者',
      isbn,
      publisher: best?.publisher || book.publisher || '',
      publishYear: best?.publishYear || (book.publish_year ? Number(book.publish_year) : undefined),
      pages: best?.pages || book.pages || undefined,
      binding1: best?.binding1 ?? 1,
      book_type: 1,
      rating: best?.rating || book.rating || undefined,
      tags: best?.tags || [],
      hasCover: false
    };
    // 3) 调书籍 API 创建到本地书库
    await bookService.addBook(baseData as any);
    // 4) 加入成功 → 置灰按钮
    shelfChecking[book.douban_id] = true;
  } catch (err: any) {
    console.error('通过书源加入书架失败:', err);
    alert(`加入书架失败：${err?.message || '未知错误'}`);
  }
};

// 双击确认：单击提示「双击确认」，400ms 内再次点击才真正加入书架
const shelfClickState: Record<string, { last: number }> = {};
const onShelfBtnClick = async (book: DoulistBook) => {
  if (shelfChecking[book.douban_id]) return;
  const now = Date.now();
  const state = shelfClickState[book.douban_id] || (shelfClickState[book.douban_id] = { last: 0 });
  if (now - state.last < 400) {
    delete shelfClickState[book.douban_id];
    await addToShelfByApi(book);
    return;
  }
  state.last = now;
  const btn = document.querySelector<HTMLButtonElement>(`[data-douban="${book.douban_id}"]`);
  if (btn && btn.textContent !== '双击确认') {
    const original = btn.textContent;
    btn.textContent = '双击确认';
    setTimeout(() => {
      if (btn.isConnected && btn.textContent === '双击确认') btn.textContent = original;
    }, 1500);
  }
};

/* ---------- 阅读状态 ---------- */
const setReadStatus = async (book: DoulistBook, status: 'unread' | 'reading' | 'read') => {
  try {
    await doulistApi.setReadStatus(book.douban_id, status);
    book.read_status = status;
  } catch (err: any) {
    console.error('更新阅读状态失败:', err);
  }
};

/* ---------- 手动添加 ---------- */
const showAddDialog = ref(false);
const adding = ref(false);
const addError = ref('');
const addDoulistChoice = ref('');
const addForm = reactive({
  title: '',
  author: '',
  publisher: '',
  publishYear: '',
  doubanRef: '',
  newDoulistTitle: '',
  newDoulistCategory: 'buy' as 'buy' | 'read'
});

const openAddDialog = () => {
  addDoulistChoice.value = filterDoulistId.value || '';
  showAddDialog.value = true;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  addError.value = '';
  addDoulistChoice.value = filterDoulistId.value || '';
  addForm.title = '';
  addForm.author = '';
  addForm.publisher = '';
  addForm.publishYear = '';
  addForm.doubanRef = '';
  addForm.newDoulistTitle = '';
  addForm.newDoulistCategory = 'buy';
};

const submitAdd = async () => {
  if (!addForm.title.trim()) {
    addError.value = '书名不能为空';
    return;
  }
  if (!addDoulistChoice.value) {
    addError.value = '必须选择一个书单（书籍必须属于一个书单）';
    return;
  }
  if (addDoulistChoice.value === '__new__' && !addForm.newDoulistTitle.trim()) {
    addError.value = '请填写新书单名称';
    return;
  }
  adding.value = true;
  addError.value = '';
  try {
    const res = await doulistApi.createBook({
      title: addForm.title.trim(),
      author: addForm.author.trim() || undefined,
      publisher: addForm.publisher.trim() || undefined,
      publishYear: addForm.publishYear.trim() || undefined,
      doubanRef: addForm.doubanRef.trim() || undefined,
      doulistId: addDoulistChoice.value === '__new__' ? undefined : addDoulistChoice.value,
      doulistTitle: addDoulistChoice.value === '__new__' ? addForm.newDoulistTitle.trim() : undefined,
      category: addDoulistChoice.value === '__new__' ? addForm.newDoulistCategory : undefined
    });
    if (!res.created) {
      addError.value = '这本书已存在于该书单中';
      return;
    }
    closeAddDialog();
    fetchImports();
    reload();
  } catch (err: any) {
    addError.value = err?.message || '添加失败';
  } finally {
    adding.value = false;
  }
};

/* ---------- 增量刷新 ---------- */
const showRefreshDialog = ref(false);
const refreshing = ref(false);
const cancelRefreshFlag = ref(false);
const refreshFetchedPages = ref(0);
const refreshBooks = ref<DoulistPreviewBook[]>([]);
const refreshMeta = ref<DoulistMeta | null>(null);
const refreshError = ref('');
const refreshResult = ref<{ imported: number; duplicates: number } | null>(null);
const refreshBlocked = ref(false);

const closeRefreshDialog = () => {
  if (refreshing.value) return;
  showRefreshDialog.value = false;
  refreshError.value = '';
  refreshResult.value = null;
  refreshBooks.value = [];
  refreshMeta.value = null;
  refreshFetchedPages.value = 0;
  refreshBlocked.value = false;
};

const openRefreshDialog = () => {
  refreshResult.value = null;
  refreshError.value = '';
  refreshBooks.value = [];
  refreshMeta.value = null;
  refreshFetchedPages.value = 0;
  refreshBlocked.value = false;
  showRefreshDialog.value = true;
};

const startRefresh = async () => {
  if (refreshing.value || !isDoubanDoulist.value) return;
  refreshing.value = true;
  cancelRefreshFlag.value = false;
  refreshError.value = '';
  refreshBlocked.value = false;
  const input = filterDoulistId.value;
  let start = 0;

  try {
    while (!cancelRefreshFlag.value) {
      if (maxPagesLimit.value > 0 && refreshFetchedPages.value >= maxPagesLimit.value) {
        refreshError.value = `已达设置的单次最多 ${maxPagesLimit.value} 页上限，本次仅导入已抓到的书`;
        break;
      }

      const result = await doulistApi.preview(input, start, 1);
      refreshMeta.value = result.doulist;
      refreshFetchedPages.value += result.pagesFetched || 0;
      refreshBlocked.value = result.blocked;

      // 去重合并
      const existing = new Set(refreshBooks.value.map((b) => b.doubanId));
      for (const b of result.books) {
        if (!existing.has(b.doubanId)) refreshBooks.value.push(b);
      }

      if (result.blocked) break;
      if (result.reachedEnd || result.nextStart === null || result.nextStart <= start) break;
      start = result.nextStart;
    }

    if (refreshBooks.value.length > 0) {
      const importRes = await doulistApi.import(refreshBooks.value, refreshMeta.value!, true);
      refreshResult.value = { imported: importRes.imported, duplicates: importRes.duplicates };
      fetchImports();
      reload();
    } else if (!refreshError.value) {
      refreshResult.value = { imported: 0, duplicates: 0 };
    }
  } catch (err: any) {
    refreshError.value = err?.message || '刷新失败';
  } finally {
    refreshing.value = false;
  }
};

const cancelRefresh = () => {
  cancelRefreshFlag.value = true;
};

/* ---------- 初始化 ---------- */
onMounted(async () => {
  reload();
  fetchImports();
  try {
    const res = await doulistApi.getSettings();
    maxPagesLimit.value = res.data.doulistMaxPages || 0;
    hideShelved.value = res.data.doulistHideShelved === 1;
    if (hideShelved.value) reload();
  } catch { /* 忽略 */ }
});
</script>

<style scoped>
.doulist-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 工具条 */
.panel-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-toolbar__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel-toolbar__sub {
  padding: 8px 10px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.sub-label {
  font-size: 12px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.toolbar-spacer {
  flex: 1;
}

.panel-toolbar__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 分段按钮 */
.seg-group {
  display: flex;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
  flex-shrink: 0;
}

.seg-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.seg-btn.active {
  background-color: #fff;
  color: var(--primary-color);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.seg-group--sm .seg-btn {
  padding: 3px 10px;
  font-size: 12px;
}

.seg-group--field {
  margin-top: 8px;
  display: inline-flex;
}

.filter-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
}

/* 面包屑 */
.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.breadcrumb-item {
  color: var(--text-hint);
  cursor: pointer;
}

.breadcrumb-item:hover {
  color: var(--primary-color);
}

.breadcrumb-item--current {
  color: var(--text-primary);
  font-weight: 600;
  cursor: default;
}

.breadcrumb-separator {
  color: var(--text-hint);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: var(--bg-card, #fff);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-btn--primary {
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.tool-btn--primary:hover:not(:disabled) {
  color: #fff;
  transform: translateY(-1px);
}

.empty-text {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: var(--text-hint);
}

/* ========== 文件夹视图 ========== */
.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}

.folder-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.folder-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.folder-card__thumbs {
  position: relative;
  width: 100%;
  padding-top: 133.33%;
  background-color: var(--bg-secondary);
  flex-shrink: 0;
  overflow: hidden;
}

.folder-card__thumbs-grid {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
}

.folder-card__thumb {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
  background-color: #e0e0e0;
}

.folder-card__thumb--empty {
  background-color: transparent;
}

.thumb__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.folder-card__info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  min-height: 44px;
}

.folder-card__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-card__cat {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  z-index: 10;
}

.folder-card__cat--buy {
  background-color: rgba(255, 107, 53, 0.9);
  color: #fff;
}

.folder-card__cat--read {
  background-color: rgba(0, 181, 29, 0.9);
  color: #fff;
}

.folder-card__count {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #1a1a1a;
  color: #fff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 10;
}

.folder-card__count .count-number {
  color: #fff;
}

.folder-card__count .count-label {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
}

.dou-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background-color: #00b51d;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ========== 书单内列表 ========== */
.book-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.book-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.book-card:hover {
  transform: translateY(-2px);
}

.book-card--shelved {
  padding: 8px 12px;
  opacity: 0.75;
}

.book-card--shelved:hover {
  transform: none;
}

.shelved-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.shelved-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--text-hint);
  text-decoration: line-through;
  text-decoration-color: rgba(0, 0, 0, 0.35);
}

.shelved-rating {
  font-size: 13px;
  font-weight: 700;
  color: #ff9800;
  flex-shrink: 0;
}

.shelved-date {
  font-size: 11px;
  color: var(--text-hint);
  flex-shrink: 0;
}

.btn-undo {
  padding: 3px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: transparent;
  font-size: 12px;
  color: var(--text-hint);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.btn-undo:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.cover {
  width: 64px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
}

.cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-hint);
}

.info {
  flex: 1;
  min-width: 0;
}

.doulist-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin-bottom: 4px;
  padding: 1px 8px 1px 2px;
  border-radius: 10px;
  background-color: rgba(0, 181, 29, 0.08);
  font-size: 11px;
  color: #007722;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.added-date {
  color: var(--text-hint);
  font-size: 10px;
}

.book-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.meta,
.extra {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}

.isbn {
  font-family: monospace;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-hint);
}

/* 购书清单：待购买标签（橙色） */
.tag--todo {
  background-color: rgba(255, 107, 53, 0.12);
  color: #e65100;
  font-weight: 600;
}

.action-spacer {
  flex: 1;
}

/* 划去项目按钮 */
.btn-strike {
  padding: 3px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: transparent;
  font-size: 12px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-strike:hover {
  border-color: var(--text-hint);
  color: var(--text-primary);
}

/* 加入书架按钮（调书源 API） */
.btn-shelf {
  padding: 3px 12px;
  border: 1px solid var(--primary-color);
  border-radius: var(--radius-md);
  background-color: rgba(255, 107, 53, 0.06);
  font-size: 12px;
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-shelf:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: #fff;
}

/* 已在书架：置灰 */
.btn-shelf--disabled {
  border-color: var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-hint);
  cursor: not-allowed;
  opacity: 0.7;
}

/* 阅读清单：阅读状态分段按钮 */
.read-status-group {
  display: flex;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 2px;
}

.rs-btn {
  padding: 3px 10px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-hint);
  cursor: pointer;
  transition: all 0.2s ease;
}

.rs-btn.active {
  background-color: #fff;
  color: #2e7d32;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rating {
  flex-shrink: 0;
  text-align: right;
  font-size: 16px;
  font-weight: 700;
  color: #ff9800;
}

.rating-count {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--text-hint);
}

.load-more {
  text-align: center;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 420px;
  background-color: var(--bg-card, #fff);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-close {
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  color: var(--text-hint);
}

.dialog-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

.dialog-field--row {
  display: flex;
  gap: 12px;
}

.dialog-field--row > div {
  flex: 1;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 6px;
}

.required {
  color: #f44336;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  background-color: #fff;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary-color);
}

select.form-input {
  appearance: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
}

.error-text {
  font-size: 13px;
  color: #f44336;
}

/* 刷新弹窗 */
.refresh-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-hint);
  line-height: 1.6;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-text {
  font-size: 13px;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.refresh-result {
  font-size: 14px;
  color: var(--text-primary);
}
</style>
