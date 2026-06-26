/**
 * 书籍筛选与排序 Composable
 *
 * 职责:
 * - 根据 currentGroupId / filterConditions / filterStatus / sortBy 计算最终展示列表
 * - 在分组模式/分页模式/全量模式之间智能选择数据源
 *
 * 依赖:
 * - useBookFilters (filterConditions)
 * - useBookPagination (displayBooks/usePagination)
 * - useBookGroups (currentGroupId)
 * - bookStore (allBooks)
 */
import { computed, type Ref, type ComputedRef } from 'vue';
import type { Book } from '@/services/book/types';
import { useBookStore } from '@/store/book';

export type SortBy = 'createTime' | 'updateTime' | 'title' | 'author' | 'rating';

/** filterConditions 形状（与 useBookFilters 同步） */
export interface BookFilterConditions {
  tags: string[];
  book_type: number | null;
  binding1: number | null;
  binding2: number | null;
  paper1: number | null;
  edge1: number | null;
  edge2: number | null;
  publisher: string;
  author: string;
  readStatus: string;
  favorite: number | null;
  wants: number | null;
}

export interface UseBookListOptions {
  filterConditions: Ref<BookFilterConditions>;
  filterStatus: Ref<string>;
  sortBy: Ref<SortBy>;
  currentGroupId: Ref<string>;
  usePagination: ComputedRef<boolean>;
  displayBooks: Ref<Book[]>;
}

export function useBookList(options: UseBookListOptions) {
  const { filterConditions, filterStatus, sortBy, currentGroupId, usePagination, displayBooks } = options;
  const bookStore = useBookStore();

  /** 是否需要全量数据（分组或高级筛选时） */
  const hasAdvancedFilters = (cond: BookFilterConditions) =>
    cond.tags.length > 0 ||
    cond.book_type !== null ||
    cond.binding1 !== null ||
    cond.binding2 !== null ||
    cond.paper1 !== null ||
    cond.edge1 !== null ||
    cond.edge2 !== null ||
    cond.publisher.trim() !== '' ||
    cond.author.trim() !== '';

  const filteredBooks = computed<Book[]>(() => {
    const needsFullData = !!currentGroupId.value || hasAdvancedFilters(filterConditions.value);

    let books: Book[];
    if (currentGroupId.value && usePagination.value) {
      // 分组 + 分页：使用已过滤的 displayBooks
      books = [...displayBooks.value];
    } else if (usePagination.value && !needsFullData) {
      // 普通分页模式
      books = [...displayBooks.value];
    } else {
      // 全量模式
      books = [...bookStore.allBooks];
    }

    // 在全量模式下二次过滤当前分组
    if (currentGroupId.value && !usePagination.value) {
      books = books.filter(b => b.groups && b.groups.includes(currentGroupId.value));
    }

    // 状态筛选（高级 > 普通）
    const statusFilter = filterConditions.value.readStatus || filterStatus.value;
    if (statusFilter) {
      books = books.filter(b => b.readStatus === statusFilter);
    }

    // 标签筛选
    if (filterConditions.value.tags.length > 0) {
      books = books.filter(b => {
        if (!b.tags || !Array.isArray(b.tags)) return false;
        return filterConditions.value.tags.some((tag: string) => b.tags!.includes(tag));
      });
    }

    // 类型筛选
    const c = filterConditions.value;
    if (c.book_type !== null) books = books.filter(b => b.book_type === c.book_type);
    if (c.binding1 !== null) books = books.filter(b => b.binding1 === c.binding1);
    if (c.binding2 !== null) books = books.filter(b => b.binding2 === c.binding2);
    if (c.paper1 !== null) books = books.filter(b => b.paper1 === c.paper1);
    if (c.edge1 !== null) books = books.filter(b => b.edge1 === c.edge1);
    if (c.edge2 !== null) books = books.filter(b => b.edge2 === c.edge2);

    if (c.publisher.trim()) {
      const q = c.publisher.toLowerCase().trim();
      books = books.filter(b => b.publisher && b.publisher.toLowerCase().includes(q));
    }
    if (c.author.trim()) {
      const q = c.author.toLowerCase().trim();
      books = books.filter(b => b.author && b.author.toLowerCase().includes(q));
    }

    if (c.favorite !== null) {
      books = books.filter(b => (b.favorite || 0) === c.favorite);
    }
    if (c.wants !== null) {
      books = books.filter(b => (b.wants || 0) === c.wants);
    }

    // 排序
    books.sort((a, b) => {
      switch (sortBy.value) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'updateTime':
          return new Date(b.updateTime || 0).getTime() - new Date(a.updateTime || 0).getTime();
        default:
          return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
      }
    });

    return books;
  });

  return { filteredBooks };
}
