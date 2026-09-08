/**
 * 价格统计 Composable
 *
 * 职责:
 * - 分组列表管理 (groups / groupIdToName / loadGroups)
 * - 价格口径 (priceType / excludeZeroPaid)
 * - 分类模式 (priceCategoryMode: group | tag)
 * - 标签数量上限与特定标签选择 (priceTagCountPreset / priceSpecificTag*)
 * - 时间趋势选项 (priceTrendGranularity / priceTrendChartType / priceTrendShowGridLines)
 * - 聚合结果 (priceStats: typeAgg / groupAgg / tagAgg / totalPaid / totalStandard / savings)
 * - 时间趋势聚合 (priceTrendStats: buckets)
 *
 * 依赖:
 * - useTimeRange (filterBooksByTimeRange)
 * - bookStore (Pinia)
 * - bookService (API)
 *
 * 由 /home/project/QCBookLog/src/views/Reading/components/StatsPage.vue 拆分而来
 */
import { ref, computed, watch, type ComputedRef } from 'vue';
import { useBookStore } from '@/stores/book';
import { bookService } from '@/api/book';
import type { BookGroup } from '@/api/book/types';
import type { useTimeRange } from './useTimeRange';

export type PriceType = 'paid' | 'standard';
export type PriceCategoryMode = 'group' | 'tag';
export type PriceTrendGranularity = 'day' | 'week' | 'month' | 'year';
export type TagCountPreset = 10 | 15 | 20 | 'custom';

/** 时间粒度选项 */
export const PRICE_TREND_GRANULARITY_OPTIONS: ReadonlyArray<{ value: PriceTrendGranularity; label: string }> = [
  { value: 'day',   label: '日' },
  { value: 'week',  label: '周' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
];

/** 标签数量上限（含特定标签）：固定为 20 */
export const MAX_TAG_COUNT = 20;

/** 标签数量预设 */
export const TAG_COUNT_OPTIONS: ReadonlyArray<{ value: TagCountPreset; label: string }> = [
  { value: 10, label: '10 个' },
  { value: 15, label: '15 个' },
  { value: 20, label: '20 个' },
  { value: 'custom', label: '自定义' },
];

export interface GroupAggItem {
  count: number;
  spent: number;
  standard: number;
  value: number;
}

export interface TagAggItem {
  count: number;
  spent: number;
  standard: number;
  bookIds: Set<number>;
  value: number;
}

export interface TypeAggItem {
  count: number;
  spent: number;
  standard: number;
}

export interface PriceStats {
  typeAgg: Record<string, TypeAggItem>;
  groupAgg: Record<string, GroupAggItem>;
  tagAgg: Record<string, TagAggItem>;
  totalPaid: number;
  totalStandard: number;
  savings: number;
  savingsPercent: number;
}

export interface PriceTrendBucket {
  key: string;
  label: string;
  total: number;
  count: number;
  books: number[];
}

export interface PriceTrendStats {
  buckets: PriceTrendBucket[];
  granularity: PriceTrendGranularity;
}

export type UsePriceStatsTimeRange = ReturnType<typeof useTimeRange>;

export function usePriceStats(timeRange: UsePriceStatsTimeRange) {
  const bookStore = useBookStore();
  const { filterBooksByTimeRange } = timeRange;

  // 分组列表（id -> name 映射），用于把 book.groups 里的 ID 转成显示名称
  const groups = ref<BookGroup[]>([]);
  const groupIdToName = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const g of groups.value) {
      map[String(g.id)] = g.name || String(g.id);
    }
    return map;
  });

  /** 加载分组列表（应在 mounted 时调用一次） */
  async function loadGroups() {
    try {
      groups.value = await bookService.getAllGroups();
      console.log('[购书花费分类] loaded groups=', groups.value.map(g => ({ id: g.id, name: g.name })));
    } catch (e) {
      console.error('[购书花费分类] 加载分组失败:', e);
    }
  }

  // 购书花费分类模式：'group' 按分组，'tag' 按标签
  const priceCategoryMode = ref<PriceCategoryMode>('group');

  // 价格口径：'paid' 实际购买价，'standard' 标准价
  const priceType = ref<PriceType>('paid');

  // 排除 0 元书籍（仅在 priceType === 'paid' 模式下生效；勾选后从聚合中过滤掉 purchasePrice 为 0 的书）
  const excludeZeroPaid = ref(false);

  // 当前预设（默认 20），自定义时为 'custom'
  const priceTagCountPreset = ref<TagCountPreset>(20);
  // 自定义 1-20
  const priceTagCustomCount = ref<number>(10);
  // 特定标签模式：开启后仅显示用户指定的标签（与自动标签共享 MAX_TAG_COUNT 个额度）
  const priceSpecificTagMode = ref(false);
  // 模糊搜索关键字
  const priceSpecificTagSearch = ref('');
  // 已选中的特定标签
  const priceSpecificTagSelected = ref<string[]>([]);
  // 当前搜索结果（不包含已选标签）
  const priceSpecificTagCandidates = ref<string[]>([]);

  function selectTagCountPreset(val: TagCountPreset) {
    priceTagCountPreset.value = val;
    if (val !== 'custom') {
      // 切换预设时，自动夹紧当前选中数量
      const limit = val;
      if (priceSpecificTagSelected.value.length > limit) {
        priceSpecificTagSelected.value = priceSpecificTagSelected.value.slice(0, limit);
      }
    } else {
      // 自定义模式：夹紧到合法区间
      if (!priceTagCustomCount.value || priceTagCustomCount.value < 1) {
        priceTagCustomCount.value = 1;
      } else if (priceTagCustomCount.value > MAX_TAG_COUNT) {
        priceTagCustomCount.value = MAX_TAG_COUNT;
      }
    }
  }

  // 监听自定义数量，确保落在 1-20 区间
  watch(priceTagCustomCount, (val) => {
    if (val === undefined || val === null) return;
    if (val < 1) priceTagCustomCount.value = 1;
    else if (val > MAX_TAG_COUNT) priceTagCustomCount.value = MAX_TAG_COUNT;
  });

  /** 当前用户选择的最大标签数（含特定标签与自动标签） */
  function getMaxTagCount(): number {
    return priceTagCountPreset.value === 'custom'
      ? Math.max(1, Math.min(MAX_TAG_COUNT, priceTagCustomCount.value || 1))
      : priceTagCountPreset.value;
  }

  /** 暴露供模板使用的所有可用标签名（从全量书籍中聚合） */
  const allTagNames: ComputedRef<string[]> = computed(() => {
    const set = new Set<string>();
    // priceStats.tagAgg -> { tag: { count, spent, standard, bookIds, value } }
    const tagAgg = (priceStats.value as any)?.tagAgg;
    if (tagAgg && typeof tagAgg === 'object') {
      Object.keys(tagAgg).forEach(k => set.add(k));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  });

  /** 输入搜索时计算候选标签 */
  function onSpecificTagSearchInput() {
    const kw = priceSpecificTagSearch.value.trim().toLowerCase();
    if (!kw) {
      priceSpecificTagCandidates.value = [];
      return;
    }
    // 模糊匹配：包含子串即可；排除已选项
    const selectedSet = new Set(priceSpecificTagSelected.value);
    const matches = allTagNames.value
      .filter(t => !selectedSet.has(t) && t.toLowerCase().includes(kw))
      .slice(0, 20);
    priceSpecificTagCandidates.value = matches;
  }

  /** 添加一个特定标签 */
  function addSpecificTag(tag: string) {
    if (!tag) return;
    const limit = getMaxTagCount();
    if (priceSpecificTagSelected.value.includes(tag)) return;
    if (priceSpecificTagSelected.value.length >= limit) {
      // 已满：弹出提示，不加入
      console.warn('特定标签数已满，删除部分标签后再添加');
      return;
    }
    priceSpecificTagSelected.value = [...priceSpecificTagSelected.value, tag];
    // 重新计算候选（排除刚加入的）
    onSpecificTagSearchInput();
  }

  /** 移除一个特定标签 */
  function removeSpecificTag(tag: string) {
    priceSpecificTagSelected.value = priceSpecificTagSelected.value.filter(t => t !== tag);
    // 重新计算候选
    onSpecificTagSearchInput();
  }

  // 切换特定标签模式时同步重置
  watch(priceSpecificTagMode, (on) => {
    if (!on) {
      priceSpecificTagSearch.value = '';
      priceSpecificTagCandidates.value = [];
    }
  });

  // 时间粒度切换
  const priceTrendGranularity = ref<PriceTrendGranularity>('month');
  const priceTrendChartType = ref<'bar' | 'line'>('bar');
  // 是否显示网格线（横/竖）
  const priceTrendShowGridLines = ref<boolean>(true);

  /** 价格统计聚合（按书籍载体 + 分组 + 标签） */
  const priceStats: ComputedRef<PriceStats> = computed(() => {
    const baseBooks = filterBooksByTimeRange(bookStore.allBooks);
    const books = (priceType.value === 'paid' && excludeZeroPaid.value)
      ? baseBooks.filter(b => (b.purchasePrice || 0) > 0)
      : baseBooks;

    // 按 book_type 聚合（电子/纸质）
    const typeAgg: Record<string, TypeAggItem> = {
      电子书: { count: 0, spent: 0, standard: 0 },
      纸质书: { count: 0, spent: 0, standard: 0 },
    };
    // 按 分组 聚合（一本书可属于多个分组，按比例分摊金额）
    const groupAgg: Record<string, GroupAggItem> = {
      未分组: { count: 0, spent: 0, standard: 0, value: 0 },
    };
    // 按 标签 聚合（多标签按比例分摊，保证合计 = 总花费）
    const tagAgg: Record<string, TagAggItem> = {};

    for (const b of books) {
      const typeKey = b.book_type === 0 ? '电子书' : '纸质书';
      typeAgg[typeKey].count += 1;
      typeAgg[typeKey].spent += b.purchasePrice || 0;
      typeAgg[typeKey].standard += b.standardPrice || 0;

      // 分组聚合
      const rawGroupKeys: string[] = (b.groups && b.groups.length > 0)
        ? b.groups.map(g => String(g))
        : [];
      const groupKeys: string[] = rawGroupKeys.length === 0
        ? ['未分组']
        : rawGroupKeys.map(g => groupIdToName.value[g] || `分组#${g}`);
      const gN = groupKeys.length;
      const splitSpentByGroup = (b.purchasePrice || 0) / gN;
      const splitStandardByGroup = (b.standardPrice || 0) / gN;
      for (const groupKey of groupKeys) {
        if (!groupAgg[groupKey]) {
          groupAgg[groupKey] = { count: 0, spent: 0, standard: 0, value: 0 };
        }
        groupAgg[groupKey].count += 1;
        groupAgg[groupKey].spent += splitSpentByGroup;
        groupAgg[groupKey].standard += splitStandardByGroup;
      }

      // 标签聚合：合并多种标签源，并去重
      const bAny = b as any;
      const allTags = new Set<string>();
      if (Array.isArray(b.tags)) b.tags.forEach((t: string) => t && allTags.add(t));
      if (Array.isArray(b.calibreTags)) b.calibreTags.forEach((t: string) => t && allTags.add(t));
      if (Array.isArray(bAny.customTags)) bAny.customTags.forEach((t: string) => t && allTags.add(t));

      if (allTags.size === 0) {
        if (!tagAgg['未标签']) {
          tagAgg['未标签'] = { count: 0, spent: 0, standard: 0, bookIds: new Set(), value: 0 };
        }
        tagAgg['未标签'].count += 1;
        tagAgg['未标签'].spent += b.purchasePrice || 0;
        tagAgg['未标签'].standard += b.standardPrice || 0;
        tagAgg['未标签'].bookIds.add(b.id);
      } else {
        const n = allTags.size;
        const splitSpent = (b.purchasePrice || 0) / n;
        const splitStandard = (b.standardPrice || 0) / n;
        allTags.forEach(tag => {
          if (!tagAgg[tag]) {
            tagAgg[tag] = { count: 0, spent: 0, standard: 0, bookIds: new Set(), value: 0 };
          }
          tagAgg[tag].count += 1;
          tagAgg[tag].spent += splitSpent;
          tagAgg[tag].standard += splitStandard;
          tagAgg[tag].bookIds.add(b.id);
        });
      }
    }

    // 在聚合完成后，根据 priceType 给 groupAgg/tagAgg 每个分组加一个 value 字段
    const pickAmount = (v: { spent: number; standard: number }) =>
      priceType.value === 'standard' ? v.standard : v.spent;
    for (const k in groupAgg) {
      groupAgg[k].value = pickAmount(groupAgg[k]);
    }
    for (const k in tagAgg) {
      tagAgg[k].value = pickAmount(tagAgg[k]);
    }

    const totalPaid = books.reduce((s, b) => s + (b.purchasePrice || 0), 0);
    const totalStandard = books.reduce((s, b) => s + (b.standardPrice || 0), 0);
    const savings = Math.max(0, totalStandard - totalPaid);
    const savingsPercent = totalStandard > 0 ? Math.round((savings / totalStandard) * 100) : 0;

    return { typeAgg, groupAgg, tagAgg, totalPaid, totalStandard, savings, savingsPercent };
  });

  /** 价格时间趋势聚合：按所选粒度（日/周/月/年） */
  const priceTrendStats: ComputedRef<PriceTrendStats> = computed(() => {
    const baseBooks = filterBooksByTimeRange(bookStore.allBooks);
    const books = (priceType.value === 'paid' && excludeZeroPaid.value)
      ? baseBooks.filter(b => (b.purchasePrice || 0) > 0)
      : baseBooks;

    const buckets = new Map<string, PriceTrendBucket>();
    const pickAmount = (b: any) => priceType.value === 'standard' ? (b.standardPrice || 0) : (b.purchasePrice || 0);

    // ISO 周键
    const isoWeekKey = (d: Date): string => {
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = (t.getUTCDay() + 6) % 7; // 周一=0
      t.setUTCDate(t.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
      return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    };

    const toKey = (d: Date, gran: PriceTrendGranularity): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (gran === 'year')  return `${y}`;
      if (gran === 'month') return `${y}-${m}`;
      if (gran === 'week')  return isoWeekKey(d);
      return `${y}-${m}-${day}`;
    };

    const toLabel = (key: string, gran: PriceTrendGranularity): string => {
      if (gran === 'year')  return `${key}年`;
      if (gran === 'month') {
        const [y, m] = key.split('-');
        return `${String(y).slice(-2)}-${m}月`;
      }
      if (gran === 'week')  return key.replace('-W', ' W');
      return key.slice(5);
    };

    for (const b of books) {
      const ds = b.purchaseDate || (b as any).timestamp;
      if (!ds) continue;
      const d = new Date(ds);
      if (isNaN(d.getTime())) continue;
      const key = toKey(d, priceTrendGranularity.value);
      if (!buckets.has(key)) {
        buckets.set(key, { key, label: toLabel(key, priceTrendGranularity.value), total: 0, count: 0, books: [] });
      }
      const bucket = buckets.get(key)!;
      bucket.total += pickAmount(b);
      bucket.count += 1;
      bucket.books.push(b.id);
    }

    const list = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
    return { buckets: list, granularity: priceTrendGranularity.value };
  });

  return {
    // 分组
    groups,
    groupIdToName,
    loadGroups,
    // 价格模式
    priceType,
    excludeZeroPaid,
    // 分类模式
    priceCategoryMode,
    // 标签数量 + 特定标签
    priceTagCountPreset,
    priceTagCustomCount,
    priceSpecificTagMode,
    priceSpecificTagSearch,
    priceSpecificTagSelected,
    priceSpecificTagCandidates,
    selectTagCountPreset,
    addSpecificTag,
    removeSpecificTag,
    onSpecificTagSearchInput,
    getMaxTagCount,
    allTagNames,
    // 时间趋势选项
    priceTrendGranularity,
    priceTrendChartType,
    priceTrendShowGridLines,
    // 聚合结果
    priceStats,
    priceTrendStats,
  };
}
