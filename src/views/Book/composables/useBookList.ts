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
import type { Book } from '@/api/book/types';
import { useBookStore } from '@/stores/book';

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

  /**
   * 是否需要全量数据（分组或任一筛选条件激活时）
   *
   * 注意：分页模式下 bookStore.allBooks 只保存已加载的部分数据（首屏 pageSize 条），
   * 若在分页数据上做筛选，会出现「筛未读得到 50 本、筛已读得到 0 本」的假结果。
   * 因此这里必须与 useBookFilters 的 hasActiveFilters 保持完全一致，
   * 任一条件激活都切换到全量数据源。
   */
  const hasAdvancedFilters = (cond: BookFilterConditions) =>
    cond.tags.length > 0 ||
    cond.readStatus !== '' ||
    cond.book_type !== null ||
    cond.binding1 !== null ||
    cond.binding2 !== null ||
    cond.paper1 !== null ||
    cond.edge1 !== null ||
    cond.edge2 !== null ||
    cond.publisher.trim() !== '' ||
    cond.author.trim() !== '' ||
    cond.favorite !== null ||
    cond.wants !== null;

  const filteredBooks = computed<Book[]>(() => {
    // 普通状态筛选（filterStatus）同样需要全量数据
    const needsFullData =
      !!currentGroupId.value ||
      !!filterStatus.value ||
      hasAdvancedFilters(filterConditions.value);

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
    // 优化：把 switch 提到比较函数之外，避免每次两两比较都做分支判断；
    // 时间字段改用 Date.parse 直接解析字符串，并做 NaN 兜底，避免反复 new Date 构造对象。
    const toTime = (v?: string | number) => {
      if (!v) return 0;
      const t = typeof v === 'number' ? v : Date.parse(v);
      return Number.isNaN(t) ? 0 : t;
    };
    const key = sortBy.value;
    let comparator: (a: Book, b: Book) => number;
    switch (key) {
      case 'title':
        comparator = (a, b) => (a.title || '').localeCompare(b.title || '');
        break;
      case 'author':
        comparator = (a, b) => (a.author || '').localeCompare(b.author || '');
        break;
      case 'rating':
        comparator = (a, b) => (b.rating || 0) - (a.rating || 0);
        break;
      case 'updateTime':
        comparator = (a, b) => toTime(b.updateTime) - toTime(a.updateTime);
        break;
      default:
        comparator = (a, b) => toTime(b.createTime) - toTime(a.createTime);
    }
    books.sort(comparator);

    return books;
  });

  return { filteredBooks };
}
