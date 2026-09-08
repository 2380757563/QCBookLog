/**
 * 阅读统计 Composable
 *
 * 职责:
 * - 提供分类标签常量 (BINDING_LABELS / PAPER_LABELS / EDGE_LABELS / SOURCE_LABELS)
 * - 来源显示转换 (getSourceDisplay)
 * - 阅读核心统计 (readingStats: totalBooks, readBooks, statusBreakdown, bindingStats, trends)
 * - 月度书摘趋势 (bookmarkTrendStats)
 *
 * 依赖:
 * - useTimeRange (filterBooksByTimeRange / filterBookmarksByTimeRange / resolveTimeRange / resolveMonthRangeFromCounts)
 * - bookStore / bookmarkStore (Pinia)
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { computed, type ComputedRef } from 'vue';
import { useBookStore } from '@/stores/book';
import { useBookmarkStore } from '@/stores/bookmark';
import type { useTimeRange } from './useTimeRange';

/** 装帧类型映射：binding1 -> 中文标签（参考 Book/Edit.vue 中的 binding1Options） */
export const BINDING_LABELS: Record<number, string> = {
  0: '电子书',
  1: '平装',
  2: '精装',
  3: '特殊装帧',
  4: '套装',
};

/** 纸张类型映射：paper1 -> 中文标签（参考 Book/Edit.vue paper1Options） */
export const PAPER_LABELS: Record<number, string> = {
  0: '未指定',
  1: '胶版纸（双胶纸）',
  2: '轻型纸',
  3: '道林纸',
  4: '铜版纸',
  5: '牛皮纸',
  6: '宣纸',
  7: '进口特种纸',
};

/** 刷边一级（位置）映射：edge1 -> 中文标签 */
export const EDGE_LABELS: Record<number, string> = {
  0: '无刷边',
  1: '基础单色刷边',
  2: '烫金/银刷边',
  3: '磨边（毛边）',
  4: '彩绘艺术刷边',
  5: '鎏金高端刷边',
};

/** 书籍来源渠道显示映射（与 Book/Detail.vue sourceLabelMap 保持一致） */
export const SOURCE_LABELS: Record<string, string> = {
  douban: '豆瓣读书',
  dbr: '豆瓣读书 (DBR)',
  google: 'Google Books',
  openlibrary: 'Open Library',
};

/**
 * 把 source 字段转为显示名
 * 优先匹配 SOURCE_LABELS，找不到则返回原值（首字母大写）
 */
export function getSourceDisplay(source: string): string {
  if (!source) return '';
  const lower = source.toLowerCase();
  if (SOURCE_LABELS[lower]) return SOURCE_LABELS[lower];
  // 兜底：原值首字母大写
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export interface ReadingStatusBreakdownItem {
  label: string;
  count: number;
  color: string;
}

export interface BindingStatItem {
  label: string;
  count: number;
}

export interface ReadingStats {
  totalBooks: number;
  readBooks: number;
  readingBooks: number;
  unreadBooks: number;
  readStatusBreakdown: ReadingStatusBreakdownItem[];
  bindingStats: BindingStatItem[];
  totalBookmarks: number;
  totalSpent: number;
  totalStandardPrice: number;
  trendMonths: string[];
  trendCounts: number[];
}

export interface BookmarkTrendStats {
  months: string[];
  counts: number[];
  hasData: boolean;
}

export type UseReadingStatsTimeRange = ReturnType<typeof useTimeRange>;

export function useReadingStats(timeRange: UseReadingStatsTimeRange) {
  const bookStore = useBookStore();
  const bookmarkStore = useBookmarkStore();

  /** 阅读核心统计 */
  const readingStats: ComputedRef<ReadingStats> = computed(() => {
    const { filterBooksByTimeRange, filterBookmarksByTimeRange, resolveTimeRange, resolveMonthRangeFromCounts } = timeRange;
    // 应用全局时间范围过滤
    const books = filterBooksByTimeRange(bookStore.allBooks);
    const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);

    // 阅读状态分布
    const unreadCount = books.filter(b => b.readStatus === '未读').length;
    const readingCount = books.filter(b => b.readStatus === '在读').length;
    const readCount = books.filter(b => b.readStatus === '已读').length;

    // 装帧分布：按 binding1 聚合（缺失/null 归入"未设置"）
    // 电子书判定与书库高级筛选保持一致：以 book_type === 0 为准
    const bindingMap: Record<string, number> = {};
    for (const b of books) {
      let key: string;
      if (b.book_type === 0) {
        key = '电子书';
      } else if (b.binding1 === null || b.binding1 === undefined) {
        key = '未设置';
      } else {
        key = BINDING_LABELS[b.binding1] ?? `装帧#${b.binding1}`;
      }
      bindingMap[key] = (bindingMap[key] || 0) + 1;
    }
    // 排序：按数量降序；过滤 0
    const bindingStats = Object.entries(bindingMap)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

    return {
      totalBooks: books.length,
      readBooks: readCount,
      readingBooks: readingCount,
      unreadBooks: unreadCount,
      readStatusBreakdown: [
        { label: '未读', count: unreadCount, color: '#9e9e9e' },
        { label: '在读', count: readingCount, color: '#ff9800' },
        { label: '已读', count: readCount, color: '#4caf50' },
      ],
      bindingStats,
      totalBookmarks: bookmarks.length,
      totalSpent: books.reduce((sum, b) => sum + (b.purchasePrice || 0), 0),
      totalStandardPrice: books.reduce((sum, b) => sum + (b.standardPrice || 0), 0),
      // 月度阅读趋势：基于 resolveTimeRange 生成完整月份列表，按 readCompleteDate 聚合
      trendMonths: (() => {
        const span = resolveTimeRange();
        const counts = new Map<string, number>();
        for (const b of books) {
          if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
          const d = new Date(b.readCompleteDate);
          if (isNaN(d.getTime())) continue;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        return resolveMonthRangeFromCounts(span, counts);
      })(),
      trendCounts: (() => {
        const span = resolveTimeRange();
        const counts = new Map<string, number>();
        for (const b of books) {
          if (b.readStatus !== '已读' || !b.readCompleteDate) continue;
          const d = new Date(b.readCompleteDate);
          if (isNaN(d.getTime())) continue;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const monthList = resolveMonthRangeFromCounts(span, counts);
        return monthList.map(m => counts.get(m) || 0);
      })(),
    };
  });

  /** 月度书摘趋势：按 createTime 聚合 */
  const bookmarkTrendStats: ComputedRef<BookmarkTrendStats> = computed(() => {
    const { filterBookmarksByTimeRange, resolveTimeRange, resolveMonthRangeFromCounts } = timeRange;
    const span = resolveTimeRange();
    const bookmarks = filterBookmarksByTimeRange(bookmarkStore.allBookmarks);
    const counts = new Map<string, number>();
    for (const bm of bookmarks) {
      const t = bm.createTime || bm.created_at;
      if (!t) continue;
      const d = new Date(t);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const months = resolveMonthRangeFromCounts(span, counts);
    const hasData = Array.from(counts.values()).some(v => v > 0);
    return {
      months,
      counts: months.map(m => counts.get(m) || 0),
      hasData,
    };
  });

  return {
    readingStats,
    bookmarkTrendStats,
  };
}
