/**
 * 时间范围 Composable
 *
 * 职责:
 * - 全局时间范围状态 (globalTimeRange / customStartDate / customEndDate)
 * - 时间范围选项常量 (TIME_RANGE_OPTIONS)
 * - 时间范围解析与过滤 (resolveTimeRange / filterBooksByTimeRange / filterBookmarksByTimeRange)
 * - 月份范围生成工具 (generateMonthRange / resolveMonthRangeFromCounts)
 *
 * 依赖:
 * - 无（独立 composable）
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { ref } from 'vue';

export type TimeRangeValue = 'all' | '3m' | '6m' | '12m' | '24m' | 'thisYear' | 'custom';

export const TIME_RANGE_OPTIONS: ReadonlyArray<{ value: TimeRangeValue; label: string }> = [
  { value: 'all',      label: '全部时间' },
  { value: '3m',       label: '近 3 个月' },
  { value: '6m',       label: '近 6 个月' },
  { value: '12m',      label: '近 12 个月' },
  { value: '24m',      label: '近 24 个月' },
  { value: 'thisYear', label: '本年' },
  { value: 'custom',   label: '自定义' },
];

/** 把 Date 转成 <input type="date"> 需要的 YYYY-MM-DD */
function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface UseTimeRangeOptions {
  /** 切换到非 custom 模式时触发的回调（用于关闭设置菜单等副作用） */
  onSelectNonCustom?: () => void;
}

export function useTimeRange(opts: UseTimeRangeOptions = {}) {
  const globalTimeRange = ref<TimeRangeValue>('all');

  // 自定义时间范围：起始 / 结束日期（YYYY-MM-DD）
  const customStartDate = ref(formatDateInput(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)));
  const customEndDate = ref(formatDateInput(new Date()));
  // 用于限制结束日期不能超过今天
  const todayStr = formatDateInput(new Date());

  /** 选择时间范围：自定义时不下拉，其他则触发 onSelectNonCustom */
  function selectTimeRange(value: TimeRangeValue) {
    globalTimeRange.value = value;
    if (value !== 'custom') {
      opts.onSelectNonCustom?.();
    }
  }

  /** 时间范围工具：根据范围计算 [from, to] 时间区间；'all' 返回 null */
  function resolveTimeRange(): { from: Date; to: Date } | null {
    const range = globalTimeRange.value;
    if (range === 'all') return null;
    const now = new Date();
    if (range === 'custom') {
      const from = customStartDate.value
        ? new Date(customStartDate.value)
        : new Date(0);
      // 结束日期包含当天，扩展到 23:59:59
      const to = customEndDate.value
        ? new Date(customEndDate.value + 'T23:59:59')
        : now;
      return { from, to };
    }
    let from: Date;
    if (range === 'thisYear') {
      from = new Date(now.getFullYear(), 0, 1);
    } else {
      const months = range === '3m' ? 3 : range === '6m' ? 6 : range === '12m' ? 12 : 24;
      from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    }
    return { from, to: now };
  }

  /**
   * 时间范围过滤（书籍）
   * 兼容 createTime / purchaseDate / timestamp / last_modified
   * 优先用 createTime，否则按 purchaseDate，再否则用 timestamp，再否则用 last_modified
   * 全部取不到则视为不在范围内
   */
  function filterBooksByTimeRange<
    T extends {
      createTime?: string | null;
      purchaseDate?: string | null;
      timestamp?: string | null;
      last_modified?: string | null;
    }
  >(books: T[]): T[] {
    const span = resolveTimeRange();
    if (!span) return books;
    return books.filter(b => {
      const raw = b.createTime || b.purchaseDate || b.timestamp || b.last_modified;
      if (!raw) return false;
      const t = new Date(raw);
      return !isNaN(t.getTime()) && t >= span.from && t <= span.to;
    });
  }

  /** 时间范围过滤（书摘）：用 createTime/created_at 字段 */
  function filterBookmarksByTimeRange<
    T extends { createTime?: string; created_at?: string }
  >(items: T[]): T[] {
    const span = resolveTimeRange();
    if (!span) return items;
    return items.filter(b => {
      const t = b.createTime || b.created_at;
      if (!t) return false;
      const d = new Date(t);
      return !isNaN(d.getTime()) && d >= span.from && d <= span.to;
    });
  }

  /** 生成 [from, to] 之间的完整月份列表，格式 YYYY-MM */
  function generateMonthRange(from: Date, to: Date): string[] {
    const months: string[] = [];
    const y = from.getFullYear();
    const m = from.getMonth() + 1;
    const toY = to.getFullYear();
    const toM = to.getMonth() + 1;
    let cy = y, cm = m;
    while (cy < toY || (cy === toY && cm <= toM)) {
      months.push(`${cy}-${String(cm).padStart(2, '0')}`);
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }
    return months;
  }

  /**
   * 在没有显式时间范围时，根据 counts 自动推导月份列表
   * 优先覆盖"最早有数据的月 → 当前月"，确保 X 轴不会出现"暂无时间范围"占位
   */
  function resolveMonthRangeFromCounts(
    span: { from: Date; to: Date } | null,
    counts: Map<string, number>
  ): string[] {
    if (span) return generateMonthRange(span.from, span.to);
    if (counts.size > 0) {
      const sortedKeys = Array.from(counts.keys()).sort();
      const firstKey = sortedKeys[0];
      const lastKey = sortedKeys[sortedKeys.length - 1];
      const [fy, fm] = firstKey.split('-').map(Number);
      const [ly, lm] = lastKey.split('-').map(Number);
      const now = new Date();
      return generateMonthRange(new Date(fy, fm - 1, 1), now);
    }
    // 无数据时也至少显示当前月
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  }

  return {
    // 状态
    globalTimeRange,
    customStartDate,
    customEndDate,
    todayStr,
    // 方法
    selectTimeRange,
    resolveTimeRange,
    filterBooksByTimeRange,
    filterBookmarksByTimeRange,
    generateMonthRange,
    resolveMonthRangeFromCounts,
  };
}
