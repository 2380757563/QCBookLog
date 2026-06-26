/**
 * 书籍列表分页与加载 Composable
 *
 * 职责:
 * - 管理分页状态 (currentPage, pageSize, displayBooks)
 * - 处理首屏加载、加载更多、错误重试
 * - 管理 IntersectionObserver 哨兵
 *
 * 依赖:
 * - bookStore (Pinia)
 * - 父组件传入的 sentinelRef
 */
import { ref, computed, onUnmounted } from 'vue';
import { useBookStore } from '@/store/book';
import { useReaderStore } from '@/store/reader';
import { bookService } from '@/services/book';
import type { Book } from '@/services/book/types';

export function useBookPagination() {
  const bookStore = useBookStore();
  const readerStore = useReaderStore();

  const isLoading = ref(true);
  const isLoadingMore = ref(false);
  const hasMoreBooks = ref(true);
  const currentPage = ref(1);
  const pageSize = ref(50);
  const totalBooksCount = ref(0);
  const displayBooks = ref<Book[]>([]);
  const loadError = ref<string | null>(null);
  const loadMoreError = ref<string | null>(null);

  // 是否启用分页（超过 100 本）
  const usePagination = computed(() => totalBooksCount.value > 100);

  // 加载总数
  async function loadBooksCount() {
    try {
      totalBooksCount.value = await bookService.getBooksCount();
    } catch (e) {
      console.error('获取书籍总数失败:', e);
      totalBooksCount.value = bookStore.allBooks.length;
    }
  }

  // 加载首页
  async function loadBooksFirstPage() {
    isLoading.value = true;
    loadError.value = null;
    try {
      if (!usePagination.value) {
        const books = await bookService.getAllBooks(readerStore.currentReaderId);
        bookStore.setBooks(books);
        displayBooks.value = books;
        hasMoreBooks.value = false;
      } else {
        const result = await bookService.getBooksPaginated({
          page: 1,
          pageSize: pageSize.value,
          readerId: readerStore.currentReaderId,
        });
        displayBooks.value = result.list;
        totalBooksCount.value = result.total;
        hasMoreBooks.value = result.hasMore;
        currentPage.value = result.page;
        bookStore.setBooks(result.list);
      }
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : '加载失败';
    } finally {
      isLoading.value = false;
    }
  }

  // 加载更多
  async function loadMoreBooks() {
    if (isLoadingMore.value || !hasMoreBooks.value || isLoading.value) return;
    isLoadingMore.value = true;
    loadMoreError.value = null;
    try {
      const next = currentPage.value + 1;
      const result = await bookService.getBooksPaginated({
        page: next,
        pageSize: pageSize.value,
        readerId: readerStore.currentReaderId,
      });
      if (result.list.length > 0) {
        displayBooks.value = [...displayBooks.value, ...result.list];
        currentPage.value = result.page;
        hasMoreBooks.value = result.hasMore;
        bookStore.setBooks(displayBooks.value);
      } else {
        hasMoreBooks.value = false;
      }
    } catch (e) {
      loadMoreError.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoadingMore.value = false;
    }
  }

  function retryLoad() {
    loadError.value = null;
    loadBooksFirstPage();
  }

  function retryLoadMore() {
    loadMoreError.value = null;
    loadMoreBooks();
  }

  // IntersectionObserver 哨兵
  const loadMoreSentinelRef = ref<HTMLElement | null>(null);
  let intersectionObserver: IntersectionObserver | null = null;

  function setupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    if (!loadMoreSentinelRef.value) return;
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) loadMoreBooks();
      },
      { rootMargin: '0px 0px 200px 0px', threshold: 0 }
    );
    intersectionObserver.observe(loadMoreSentinelRef.value);
  }

  onUnmounted(() => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  });

  return {
    isLoading,
    isLoadingMore,
    hasMoreBooks,
    currentPage,
    pageSize,
    totalBooksCount,
    displayBooks,
    loadError,
    loadMoreError,
    usePagination,
    loadMoreSentinelRef,
    loadBooksCount,
    loadBooksFirstPage,
    loadMoreBooks,
    retryLoad,
    retryLoadMore,
    setupIntersectionObserver,
  };
}
