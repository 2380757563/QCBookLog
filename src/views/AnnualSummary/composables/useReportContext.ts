/**
 * 年度报告上下文
 *
 * 把「stats + narrative + 渲染契约」收敛成一份 computed 集合，
 * 供 ScrollReport 与其下的 11 个段落组件共享，避免逐层透传 props。
 *
 * 设计要点：
 * - inject 的 key 由 ScrollReport 侧 provide（见 REPORT_CONTEXT_KEY）
 * - 所有派生值均为 computed：报告切换年份 / 重新生成后自动重算
 * - 段落「有无数据」的判定统一放这里，保证降级文案与后端 FALLBACK_TEXT 一致
 */
import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';
import type { AnnualSummaryReport } from '@/api/annualSummaryService';

/** 后端 prompt-builder 中的兜底文案（保持同源，避免两处维护） */
export const FALLBACK_TEXT: Record<string, string> = {
  buying: '今年没有留下购书记录，书架维持着原有的模样。',
  spending: '今年没有登记购书花费。',
  reading: '今年没有留下可统计的阅读记录。',
  habit: '今年的阅读记录太少，还不足以勾勒出稳定的习惯。',
  taste: '今年的阅读样本偏少，暂时难以拼出完整的品味轮廓。',
  bookmarks: '今年还没有写下书摘。',
  reviews: '今年还没有写下书评。',
  goals: '今年没有设定阅读目标。'
};

export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 月份短名，柱状图 / 热力条共用 */
export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export interface ReportContext {
  report: ComputedRef<AnnualSummaryReport>;
  stats: ComputedRef<Record<string, any>>;
  narrative: ComputedRef<Record<string, any>>;
  /** 取某个段落的数据块，不存在时返回 null */
  section: (key: string) => Record<string, any> | null;
  /** 取段落 AI 文案，缺失时回落到后端兜底文案 */
  text: (key: string) => string;
  /** 段落是否有有效数据 */
  hasData: (key: string) => boolean;
}

export const REPORT_CONTEXT_KEY: InjectionKey<ReportContext> = Symbol('annualReportContext');

/** 判断一个 stats 数据块是否「有实质内容」 */
export function isMeaningfulBlock(block: Record<string, any> | null | undefined): boolean {
  if (!block || typeof block !== 'object') return false;

  // 显式计数：只要有一个正向计数就算有数据
  const countKeys = ['total', 'completedCount', 'purchasedCount', 'sentCount', 'activeDays', 'libraryTotal'];
  for (const key of countKeys) {
    if (typeof block[key] === 'number' && block[key] > 0) return true;
  }

  // 数组类字段
  for (const value of Object.values(block)) {
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === 'string' && value.trim() !== '') return true;
    if (typeof value === 'number' && value > 0) return true;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.keys(value).length > 0) {
        const nested = Object.values(value);
        if (nested.some(v => (typeof v === 'number' && v > 0) || (typeof v === 'string' && v !== ''))) return true;
      }
    }
  }
  return false;
}

/** 在 ScrollReport 中构建上下文 */
export function createReportContext(
  report: ComputedRef<AnnualSummaryReport>
): ReportContext {
  const stats = computed(() => (report.value?.stats ?? {}) as Record<string, any>);
  const narrative = computed(() => (report.value?.narrative ?? {}) as Record<string, any>);

  const section = (key: string) => {
    const block = stats.value[key];
    return block && typeof block === 'object' ? (block as Record<string, any>) : null;
  };

  const text = (key: string) => {
    const value = narrative.value[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    return FALLBACK_TEXT[key] ?? '';
  };

  const hasData = (key: string) => isMeaningfulBlock(section(key));

  return { report, stats, narrative, section, text, hasData };
}

/** 段落组件中消费上下文 */
export function useReportContext(): ReportContext {
  const ctx = inject(REPORT_CONTEXT_KEY, null);
  if (!ctx) {
    throw new Error('[AnnualSummary] 段落组件必须在 ScrollReport 内使用');
  }
  return ctx;
}
