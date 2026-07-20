import { defineStore } from 'pinia';
import { BookmarkState, Bookmark } from './types';

const initialState: BookmarkState = {
  bookmarks: [],
  loading: false,
  error: null,
  currentBookmark: null
};

export const useBookmarkStore = defineStore('bookmark', {
  state: () => initialState,
  getters: {
    // 获取所有书摘
    allBookmarks: (state) => state.bookmarks,
    // 根据ID获取书摘
    getBookmarkById: (state) => (id: string | number) => state.bookmarks.find(bookmark => bookmark.id === id),
    // 根据书籍ID获取书摘
    getBookmarksByBookId: (state) => (bookId: number) =>
      state.bookmarks.filter(bookmark => bookmark.bookId === bookId),
    // 根据标签获取书摘
    getBookmarksByTag: (state) => (tagId: string) =>
      state.bookmarks.filter(bookmark => bookmark.tags.includes(tagId)),
    // 获取书摘总数
    bookmarkCount: (state) => state.bookmarks.length
  },
  actions: {
    // 设置加载状态
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    // 设置错误信息
    setError(error: string | null) {
      this.error = error;
    },
    // 设置当前书摘
    setCurrentBookmark(bookmark: Bookmark | null) {
      this.currentBookmark = bookmark;
    },
    // 添加书摘
    addBookmark(bookmark: Bookmark) {
      this.bookmarks.push(bookmark);
    },
    // 更新书摘
    updateBookmark(bookmark: Bookmark) {
      const index = this.bookmarks.findIndex(b => b.id === bookmark.id);
      if (index !== -1) {
        this.bookmarks[index] = bookmark;
      }
    },
    // 删除书摘
    deleteBookmark(id: string | number) {
      this.bookmarks = this.bookmarks.filter(bookmark => bookmark.id !== id);
    },
    // 批量添加书摘
    batchAddBookmarks(bookmarks: Bookmark[]) {
      this.bookmarks.push(...bookmarks);
    },
    // 设置书摘列表
    setBookmarks(bookmarks: Bookmark[]) {
      this.bookmarks.splice(0, this.bookmarks.length, ...bookmarks);
    }
  }
});
