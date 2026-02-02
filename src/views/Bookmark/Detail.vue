<template>
  <div class="detail-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">书摘详情</h1>
      <button class="action-btn" @click="showActions = !showActions">
        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </button>
      <div v-if="showActions" class="actions-menu">
        <div class="menu-item" @click="handleEdit">编辑</div>
        <div class="menu-item" @click="handleDelete">删除</div>
      </div>
    </div>

    <div v-if="bookmark" class="content">
      <!-- 关联书籍 -->
      <div class="book-info" @click="goToBook">
        <div class="book-cover">
          <img v-if="book?.coverUrl" :src="book.coverUrl" />
          <span v-else>{{ book?.title.charAt(0) }}</span>
        </div>
        <div class="book-meta">
          <span class="book-title">{{ book?.title }}</span>
          <span class="book-author">{{ book?.author }}</span>
        </div>
        <svg class="arrow" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
      </div>

      <!-- 书摘内容 -->
      <div class="card">
        <p class="bookmark-content">{{ bookmark.content }}</p>
        <div v-if="bookmark.pageNum" class="page-info">第 {{ bookmark.pageNum }} 页</div>
      </div>

      <!-- 个人笔记 -->
      <div v-if="bookmark.note" class="card note-card">
        <h3 class="card-title">💭 我的想法</h3>
        <p class="note-content">{{ bookmark.note }}</p>
      </div>

      <!-- 标签 -->
      <div class="card">
        <h3 class="card-title">标签</h3>
        <div v-if="bookmarkTags.length > 0" class="tags-list">
          <span v-for="tag in bookmarkTags" :key="tag" class="tag-item">{{ tag }}</span>
        </div>
        <div v-else class="no-tags">暂无标签</div>
      </div>

      <!-- 元信息 -->
      <div class="meta-info">
        <span>添加于 {{ formatDate(bookmark.createTime) }}</span>
        <span v-if="bookmark.updateTime">更新于 {{ formatDate(bookmark.updateTime) }}</span>
        <span v-if="bookmark.importSource">来源: {{ bookmark.importSource }}</span>
      </div>
    </div>

    <div v-else class="loading">加载中...</div>

    <!-- 删除确认 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">确认删除</div>
        <div class="dialog-body">确定要删除这条书摘吗？</div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useBookmarkStore } from '@/store/bookmark';
import { useBookStore } from '@/store/book';
import { bookmarkService } from '@/services/bookmark';
import { bookService } from '@/services/book';
import { tagApi } from '@/services/apiClient';
import type { Bookmark } from '@/services/bookmark/types';
import type { Book } from '@/services/book/types';

const router = useRouter();
const route = useRoute();
const bookmarkStore = useBookmarkStore();
const bookStore = useBookStore();

const bookmark = ref<Bookmark | null>(null);
const book = ref<Book | null>(null);
const bookmarkTags = ref<string[]>([]); // 改为字符串数组，存储标签名称
const showActions = ref(false);
const showDeleteConfirm = ref(false);

const goBack = () => router.back();

const formatDate = (dateStr: string): string => {
  if (!dateStr) {
    return '未知日期';
  }
  
  const date = new Date(dateStr);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.warn('无效的日期字符串:', dateStr);
    return '未知日期';
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const goToBook = () => {
  if (book.value) router.push(`/book/detail/${book.value.id}`);
};

const handleEdit = () => {
  showActions.value = false;
  router.push(`/bookmark/edit/${bookmark.value?.id}`);
};

const handleDelete = () => {
  showActions.value = false;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!bookmark.value) return;
  try {
    await bookmarkService.deleteBookmark(bookmark.value.id);
    bookmarkStore.deleteBookmark(bookmark.value.id);
    router.back();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

onMounted(async () => {
  const id = route.params.id as string;
  try {
    // 优先从缓存中获取书摘
    let cachedBookmark = bookmarkStore.getBookmarkById(id);

    if (cachedBookmark) {
      console.log('使用缓存的书摘数据');
      console.log('缓存书摘数据:', cachedBookmark);
      console.log('缓存书摘createTime:', cachedBookmark.createTime);
      bookmark.value = cachedBookmark;
    } else {
      console.log('从API加载书摘数据');
      bookmark.value = await bookmarkService.getBookmarkById(id) || null;
      console.log('API返回的书摘数据:', bookmark.value);
      console.log('API返回的书摘createTime:', bookmark.value?.createTime);
      // 加载成功后更新缓存
      if (bookmark.value) {
        bookmarkStore.addBookmark(bookmark.value);
      }
    }

    if (bookmark.value) {
      console.log('最终使用的书摘数据:', bookmark.value);
      console.log('最终使用的书摘createTime:', bookmark.value.createTime);
      
      // 优先使用书摘中存储的书籍信息，其次从缓存或API中获取
      if (bookmark.value.bookTitle || bookmark.value.bookAuthor) {
        // 构造一个简单的书籍对象用于显示
        book.value = {
          id: bookmark.value.bookId,
          title: bookmark.value.bookTitle || '未知书籍',
          author: bookmark.value.bookAuthor || '未知作者',
          coverUrl: `/api/static/calibre/${encodeURIComponent(bookmark.value.bookAuthor || '未知作者')}/${encodeURIComponent(bookmark.value.bookTitle || '未知书名')}/cover.jpg`
        } as Book;
        console.log('使用书摘中存储的书籍信息');
      } else {
        // 尝试从缓存中获取书籍
        const cachedBook = bookStore.getBookById(bookmark.value.bookId);

        if (cachedBook) {
          console.log('使用缓存的书籍数据');
          book.value = cachedBook;
        } else {
          try {
            console.log('从API加载书籍数据');
            book.value = await bookService.getBookById(bookmark.value.bookId) || null;
            // 加载成功后更新缓存
            if (book.value) {
              bookStore.addBook(book.value);
            }
          } catch (error) {
            console.warn('⚠️ 加载书籍信息失败:', error.message);
            book.value = {
              id: bookmark.value.bookId,
              title: '未知书籍',
              author: '未知作者'
            } as Book;
          }
        }
      }

      // 加载书摘标签（从书摘标签 API）
      try {
        bookmarkTags.value = await tagApi.getByBookmarkId(bookmark.value.id);
        console.log('书摘标签加载完成:', bookmarkTags.value);
      } catch (error) {
        console.warn('⚠️ 加载书摘标签失败:', error.message);
        bookmarkTags.value = [];
      }
    }
  } catch (error) {
    console.error('加载失败:', error);
  }
});
</script>

<style scoped>
.detail-container { min-height: 100vh; background-color: var(--bg-primary); }
.header { display: flex; align-items: center; padding: 12px 16px; background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-light); position: sticky; top: 0; z-index: 100; }
.back-btn, .action-btn { width: 36px; height: 36px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.back-btn svg, .action-btn svg { width: 24px; height: 24px; fill: var(--text-primary); }
.title { flex: 1; text-align: center; font-size: 18px; font-weight: 500; margin: 0; }
.actions-menu { position: absolute; top: 100%; right: 16px; background: var(--bg-card); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); }
.menu-item { padding: 12px 24px; cursor: pointer; } .menu-item:hover { background: #f5f5f5; }
.content { padding: 16px; }
.book-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-lg); margin-bottom: 16px; cursor: pointer; }
.book-cover { width: 48px; height: 64px; border-radius: 4px; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; }
.book-cover img { width: 100%; height: 100%; object-fit: cover; }
.book-meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.book-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.book-author { font-size: 12px; color: var(--text-hint); }
.arrow { width: 20px; height: 20px; fill: var(--text-hint); }
.card { background: var(--bg-card); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 500; margin: 0 0 12px 0; color: var(--text-primary); }
.bookmark-content { font-size: 16px; line-height: 1.8; color: var(--text-primary); margin: 0; }
.page-info { font-size: 12px; color: var(--text-hint); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); }
.note-card { background: #fffde7; }
.note-content { font-size: 14px; line-height: 1.6; color: var(--text-secondary); margin: 0; }
.tags-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { padding: 4px 12px; background: rgba(255, 107, 53, 0.1); color: var(--primary-color); border-radius: 12px; font-size: 12px; }
.no-tags { color: var(--text-hint); font-size: 14px; }
.meta-info { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-hint); text-align: center; padding: 16px; }
.loading { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-hint); }
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.dialog { background: var(--bg-card); border-radius: var(--radius-lg); width: 300px; }
.dialog-header { padding: 16px; font-size: 16px; font-weight: 500; border-bottom: 1px solid var(--border-light); }
.dialog-body { padding: 24px 16px; color: var(--text-secondary); }
.dialog-footer { display: flex; gap: 12px; padding: 16px; border-top: 1px solid var(--border-light); }
.btn { flex: 1; padding: 10px; border: none; border-radius: var(--radius-md); font-size: 14px; cursor: pointer; }
.btn-default { background: #f5f5f5; color: var(--text-secondary); }
.btn-danger { background: #f44336; color: #fff; }
</style>