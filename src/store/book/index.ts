import { defineStore } from 'pinia';
import { BookState, Book } from './types';

const initialState: BookState = {
  books: [],
  loading: false,
  error: null,
  currentBook: null,
  layout: 'grid'
};

export const useBookStore = defineStore('book', {
  state: () => initialState,
  getters: {
    // 获取所有书籍
    allBooks: (state) => state.books,
    // 根据ID获取书籍
    getBookById: (state) => (id: number) => state.books.find(book => book.id === id),
    // 根据阅读状态筛选书籍
    getBooksByReadStatus: (state) => (status: '未读' | '在读' | '已读') => 
      state.books.filter(book => book.readStatus === status),
    // 获取书籍总数
    bookCount: (state) => state.books.length,
    // 获取当前布局
    currentLayout: (state) => state.layout
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
    // 设置当前书籍
    setCurrentBook(book: Book | null) {
      this.currentBook = book;
    },
    // 设置布局
    setLayout(layout: 'grid' | 'list') {
      this.layout = layout;
    },
    // 添加书籍
    addBook(book: Book) {
      this.books.push(book);
    },
    // 更新书籍
    updateBook(book: Book) {
      const index = this.books.findIndex(b => b.id === book.id);
      if (index !== -1) {
        // 使用 splice 方法确保响应式更新
        this.books.splice(index, 1, book);
      }
    },
    // 删除书籍
    deleteBook(id: number) {
      this.books = this.books.filter(book => book.id !== id);
    },
    // 批量添加书籍
    batchAddBooks(books: Book[]) {
      this.books.push(...books);
    },
    // 设置书籍列表
    setBooks(books: Book[]) {
      this.books.splice(0, this.books.length, ...books);
    }
  }
});
