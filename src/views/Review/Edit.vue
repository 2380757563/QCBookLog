<template>
  <div class="review-edit-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <span class="nav-title">{{ isEdit ? '编辑书评' : '写书评' }}</span>
      <!-- 历史版本入口 -->
      <button class="history-btn" :disabled="!form.id" title="查看历史版本" @click="goHistory">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1a2 2 0 0 0 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2a2 2 0 0 0 2-2v-.41A7.97 7.97 0 0 1 19 12c0 2.14-.84 4.1-2.1 5.39z"/></svg>
      </button>
      <button class="save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <!-- 草稿状态提示条 -->
    <div v-if="draftStatus" class="draft-banner" :title="draftStatus">{{ draftStatus }}</div>

    <!-- 表单 -->
    <div class="form-content">
      <!-- 书籍选择 -->
      <div class="form-section">
        <label class="form-label">关联书籍</label>
        <div class="book-selector" @click="showBookPicker = true">
          <div v-if="selectedBook" class="selected-book">
            <img v-if="selectedBook.coverUrl" :src="selectedBook.coverUrl" class="book-cover" />
            <div class="book-info">
              <div class="book-title">{{ selectedBook.title }}</div>
              <div class="book-author">{{ selectedBook.author }}</div>
            </div>
          </div>
          <div v-else class="book-placeholder">
            <span>点击选择书籍</span>
          </div>
        </div>
      </div>

      <!-- 书评标题 -->
      <div class="form-section">
        <label class="form-label">标题</label>
        <input
          v-model="form.title"
          class="title-input"
          placeholder="给书评起个标题..."
          maxlength="100"
        />
      </div>

      <!-- 评分 -->
      <div class="form-section">
        <label class="form-label">评分</label>
        <div class="rating-stars">
          <span
            v-for="i in 5"
            :key="i"
            :class="['star', { filled: i <= form.rating }]"
            @click="form.rating = i"
          >★</span>
          <span v-if="form.rating > 0" class="rating-text">{{ form.rating }} 分</span>
        </div>
      </div>

      <!-- Markdown 编辑器 -->
      <div class="form-section">
        <label class="form-label">正文</label>
        <MarkdownEditor v-model="form.content" />
      </div>
    </div>

    <!-- 书籍选择弹窗 -->
    <div v-if="showBookPicker" class="book-picker-overlay" @click="showBookPicker = false">
      <div class="book-picker" @click.stop>
        <div class="picker-header">
          <input
            v-model="searchKeyword"
            class="picker-search"
            placeholder="搜索书名或作者..."
            @input="handleSearch"
          />
          <button class="picker-close" @click="showBookPicker = false">×</button>
        </div>
        <div class="picker-list">
          <div
            v-for="book in filteredBooks"
            :key="book.id"
            class="picker-item"
            @click="selectBook(book)"
          >
            <img v-if="book.coverUrl" :src="book.coverUrl" class="picker-book-cover" />
            <div class="picker-book-info">
              <div class="picker-book-title">{{ book.title }}</div>
              <div class="picker-book-author">{{ book.author }}</div>
            </div>
          </div>
          <div v-if="filteredBooks.length === 0" class="picker-empty">
            未找到相关书籍
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import MarkdownEditor from '@/components/MarkdownEditor/index.vue';
import { reviewService } from '@/api/review';
import { bookService } from '@/api/book';
import { useBookStore } from '@/stores/book';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const showBookPicker = ref(false);
const searchKeyword = ref('');
const allBooks = ref<any[]>([]);

const selectedBook = ref<any>(null);
const form = ref({
  id: null as number | null,
  bookId: 0,
  title: '',
  content: '',
  rating: 0
});

// ----- 自动草稿：只保留一份，覆盖更新，不进历史、不同步 GitHub -----
const DRAFT_API_KEY = 'qc_review_draft';
const AUTO_SAVE_DELAY = 45000; // 45s 防抖
let draftTimer: ReturnType<typeof setTimeout> | null = null;
const lastSavedPatch = ref(''); // 最近一次草稿快照，避免重复覆盖
const savedSnapshot = ref(''); // 最近一次【手动保存/加载】时的内容快照，用于判断是否有未保存改动
const draftStatus = ref(''); // '' | '草稿已自动保存 HH:MM' | '有未保存的改动...'
const loadedDraftKey = ref(''); // 已加载草稿的标识

// 草稿的 key：新建=固定 new，编辑=review-{id}
const draftKey = computed(() => {
  const id = route.params.id;
  return id ? `review-${id}` : 'new';
});

// 读取指定草稿
function readDraft(key: string) {
  try {
    const raw = localStorage.getItem(DRAFT_API_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.key === key ? data : null;
  } catch {
    return null;
  }
}

// 写入草稿（覆盖式）
function writeDraft() {
  try {
    const snapshot = JSON.stringify({
      key: draftKey.value,
      bookId: form.value.bookId,
      title: form.value.title,
      content: form.value.content,
      rating: form.value.rating,
      updatedAt: Date.now()
    });
    localStorage.setItem(DRAFT_API_KEY, snapshot);
    lastSavedPatch.value = snapshot;
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    draftStatus.value = `草稿已自动保存 ${pad(t.getHours())}:${pad(t.getMinutes())}`;
  } catch (e) {
    console.warn('草稿保存失败:', e);
  }
}

// 清空当前草稿
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_API_KEY);
  } catch {}
  lastSavedPatch.value = '';
  draftStatus.value = '';
}

// 监听表单变化，防抖 30s 自动保存草稿
watch(
  () => [form.value.bookId, form.value.title, form.value.content, form.value.rating] as const,
  () => {
    draftStatus.value = '有未保存的改动，正在自动草稿...';
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (form.value.content || form.value.title || form.value.bookId || form.value.rating) {
        writeDraft();
      }
    }, AUTO_SAVE_DELAY);
  },
  { deep: false }
);

// 加载草稿（编辑页 / 新建页都尝试恢复）
function tryLoadDraft() {
  const draft = readDraft(draftKey.value);
  if (!draft) return;
  const hasContent = draft.content || draft.title || draft.bookId || draft.rating;
  if (!hasContent) return;

  // 编辑已有书评：若草稿内容比已加载内容"有实质不同"则提示恢复
  if (isEdit.value && form.value.id != null) {
    const sameAsLoaded =
      draft.content === form.value.content &&
      draft.title === form.value.title &&
      draft.rating === form.value.rating &&
      draft.bookId === form.value.bookId;
    if (sameAsLoaded) return;
    const apply = () => {
      form.value.content = draft.content;
      form.value.title = draft.title;
      form.value.rating = draft.rating;
      if (draft.bookId) {
        form.value.bookId = draft.bookId;
        const b = allBooks.value.find(x => x.id === draft.bookId);
        if (b) selectedBook.value = b;
      }
      loadedDraftKey.value = draftKey.value;
      draftStatus.value = '已恢复自动草稿';
    };
    // 延迟到书籍列表加载完成后询问
    setTimeout(() => {
      if (confirm('检测到未保存的草稿，是否恢复？')) apply(); else clearDraft();
    }, 50);
  } else {
    form.value.content = draft.content;
    form.value.title = draft.title;
    form.value.rating = draft.rating;
    if (draft.bookId) {
      form.value.bookId = draft.bookId;
      const b = allBooks.value.find(x => x.id === draft.bookId);
      if (b) selectedBook.value = b;
    }
    loadedDraftKey.value = draftKey.value;
    draftStatus.value = '已恢复自动草稿';
  }
}

onBeforeUnmount(() => {
  if (draftTimer) clearTimeout(draftTimer);
});

// 离开页面时：若存在未手动保存的改动，立即保存草稿并弹窗提示
onBeforeRouteLeave(() => {
  if (draftTimer) clearTimeout(draftTimer);

  const curSnapshot = JSON.stringify({
    bookId: form.value.bookId,
    title: form.value.title,
    content: form.value.content,
    rating: form.value.rating
  });

  const hasContent = form.value.content || form.value.title || form.value.bookId || form.value.rating;
  // 有改动内容，且与最近一次手动保存/加载快照不一致 → 属于未保存改动
  if (hasContent && curSnapshot !== savedSnapshot.value) {
    writeDraft();
    draftStatus.value = '草稿已自动保存';
    // 提示用户草稿已保存；确认后再离开
    return window.confirm('您的更改还未手动保存，已自动保存为草稿。\n离开后可在对应书评编辑页恢复。确定离开吗？');
  }
  return true;
});

const filteredBooks = computed(() => {
  if (!searchKeyword.value) return allBooks.value;
  const keyword = searchKeyword.value.toLowerCase();
  return allBooks.value.filter(book =>
    book.title?.toLowerCase().includes(keyword) ||
    book.author?.toLowerCase().includes(keyword)
  );
});

const handleSearch = () => {
  // 计算属性会自动响应
};

const selectBook = (book: any) => {
  selectedBook.value = book;
  form.value.bookId = book.id;
  showBookPicker.value = false;
};

const loadBooks = async () => {
  try {
    const books = await bookService.getAllBooks();
    allBooks.value = books;
    bookStore.setBooks(books);
  } catch (error) {
    console.error('加载书籍列表失败:', error);
  }
};

const loadReview = async () => {
  const id = route.params.id;
  if (!id) return;

  try {
    const review = await reviewService.getReviewById(id as string);
    if (review) {
      form.value = {
        id: review.id as number,
        bookId: review.bookId,
        title: review.title || '',
        content: review.content || '',
        rating: review.rating || 0
      };
      // 记录刚加载的"已保存快照"，用于判断是否有未手动保存的改动
      savedSnapshot.value = JSON.stringify({
        bookId: form.value.bookId,
        title: form.value.title,
        content: form.value.content,
        rating: form.value.rating
      });

      // 加载关联书籍信息
      if (review.bookId) {
        try {
          const book = await bookService.getBookById(review.bookId);
          if (book) {
            selectedBook.value = book;
          } else {
            selectedBook.value = {
              id: review.bookId,
              title: review.bookTitle,
              author: review.bookAuthor,
              coverUrl: review.coverUrl
            };
          }
        } catch {
          selectedBook.value = {
            id: review.bookId,
            title: review.bookTitle,
            author: review.bookAuthor,
            coverUrl: review.coverUrl
          };
        }
      }
    }
  } catch (error) {
    console.error('加载书评失败:', error);
  }
};

const handleSave = async () => {
  if (!form.value.bookId) {
    alert('请先选择关联书籍');
    return;
  }
  if (!form.value.content.trim()) {
    alert('请输入书评内容');
    return;
  }

  saving.value = true;
  try {
    const reviewData = {
      ...form.value,
      bookTitle: selectedBook.value?.title || '',
      bookAuthor: selectedBook.value?.author || ''
    };

    if (isEdit.value && form.value.id) {
      await reviewService.updateReview({
        ...reviewData,
        id: form.value.id,
        createTime: '',
        updateTime: ''
      } as any);
    } else {
      await reviewService.createReview(reviewData as any);
    }

    // 手动保存成功 → 生成正式快照（后端已触发 Git commit），清空临时草稿
    clearDraft();
    savedSnapshot.value = JSON.stringify({
      bookId: form.value.bookId,
      title: form.value.title,
      content: form.value.content,
      rating: form.value.rating
    });
    alert('保存成功');
  } catch (error) {
    console.error('保存书评失败:', error);
    alert('保存失败: ' + (error as Error).message);
  } finally {
    saving.value = false;
  }
};

const goBack = () => {
  // 返回书摘主页的书评选项卡
  router.push('/bookmark?tab=book-review');
};

const goHistory = () => {
  if (!form.value.id) return;
  router.push(`/review/history/${form.value.id}`);
};

onMounted(async () => {
  await loadBooks();
  if (isEdit.value) {
    await loadReview();
  } else {
    // 检查是否从书籍详情页带 bookId 跳来
    const bookId = route.query.bookId;
    if (bookId) {
      form.value.bookId = Number(bookId);
      const book = allBooks.value.find(b => b.id === Number(bookId));
      if (book) {
        selectedBook.value = book;
      }
    }
  }
  // 书籍列表与书评内容加载完成后再尝试恢复草稿
  tryLoadDraft();
});
</script>

<style scoped>
.review-edit-page {
  min-height: 100vh;
  background-color: var(--bg-primary, #f5f5f5);
}

.nav-bar {
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
  flex-shrink: 0;
  padding: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: var(--text-primary, #333);
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary, #333);
  margin: 0;
}

.save-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.save-btn:hover {
  background-color: #e65a2f;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  margin-bottom: 8px;
}

.book-selector {
  padding: 12px 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.book-selector:hover {
  border-color: var(--primary-color, #FF6B35);
}

.selected-book {
  display: flex;
  align-items: center;
  gap: 12px;
}

.book-cover {
  width: 40px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
}

.book-info {
  flex: 1;
}

.book-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.book-author {
  font-size: 13px;
  color: var(--text-hint, #999);
}

.book-placeholder {
  color: var(--text-hint, #999);
  font-size: 14px;
}

.title-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  background: var(--bg-card, #fff);
  color: var(--text-primary, #333);
  box-sizing: border-box;
}

.title-input:focus {
  border-color: var(--primary-color, #FF6B35);
}

.rating-stars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star {
  font-size: 28px;
  color: #ddd;
  cursor: pointer;
  transition: color 0.15s;
}

.star.filled {
  color: #ffc107;
}

.rating-text {
  margin-left: 8px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* 书籍选择弹窗 */
.book-picker-overlay {
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

.book-picker {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-light, #e0e0e0);
}

.picker-search {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-light, #e0e0e0);
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.picker-close {
  font-size: 24px;
  color: var(--text-hint, #999);
  cursor: pointer;
  background: none;
  border: none;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.picker-item:hover {
  background-color: #f5f5f5;
}

.picker-book-cover {
  width: 32px;
  height: 44px;
  object-fit: cover;
  border-radius: 4px;
}

.picker-book-info {
  flex: 1;
}

.picker-book-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.picker-book-author {
  font-size: 12px;
  color: var(--text-hint, #999);
}

.picker-empty {
  text-align: center;
  padding: 32px;
  color: var(--text-hint, #999);
  font-size: 14px;
}

/* 历史版本按钮 */
.history-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
  padding: 0;
}
.history-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.history-btn svg { width: 22px; height: 22px; fill: var(--text-secondary, #666); }

/* 草稿状态提示条 */
.draft-banner {
  background-color: #fff7e6;
  color: #ad6800;
  font-size: 12px;
  padding: 6px 16px;
  text-align: center;
  border-bottom: 1px solid #ffe1a6;
}
</style>
