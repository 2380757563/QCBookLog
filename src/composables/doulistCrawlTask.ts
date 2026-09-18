/**
 * 豆列抓取任务：状态与逐页抓取循环托管模块（见 doc/批量任务小窗与任务中心计划.md 4.4）
 *
 * 设计要点：
 * - 抓取状态与执行循环全部放在模块级（脱离组件实例存活），切页不中断
 * - 沿用后端 saveProgress（last_start）断点续跑：每抓完一页落库 + 本地缓存已抓书单
 * - DoulistImport.vue 仅作视图，读写本模块的 crawlState
 */
import { ref } from 'vue';
import { doulistApi, type DoulistMeta, type DoulistPreviewBook } from '@/api/doulistService';
import { useTaskStore } from '@/stores/task';

export interface DoulistCrawlState {
  taskId: string;
  /** 豆列链接或数字 ID（doulistApi.preview 的入参） */
  input: string;
  doulistId: string | null;
  books: DoulistPreviewBook[];
  meta: DoulistMeta | null;
  fetchedPages: number;
  blocked: boolean;
  reachedEnd: boolean;
  pageLimitReached: boolean;
  /** 单次最多抓取页数（0 = 不限），来自豆列设置 */
  maxPages: number;
  /** 取消标记：抓取循环每轮检查，置 true 后循环退出 */
  cancelled: boolean;
  /** 抓取循环是否已退出（完成 / 被限 / 被阻 / 失败 / 取消） */
  finished: boolean;
  /** 一本都没抓到时的失败信息（组件回显到步骤 1） */
  error: string | null;
}

/** 当前豆列抓取任务状态（模块级，切页不丢） */
const state = ref<DoulistCrawlState | null>(null);

/** 当前状态（组件只读） */
export const crawlState = state;

/** 从输入中提取豆列数字 ID（无法识别返回 null） */
export const extractDoulistId = (input: string): string | null => {
  const raw = String(input || '').trim();
  if (/^\d{4,}$/.test(raw)) return raw;
  const m = raw.match(/doulist\/(\d+)/);
  return m ? m[1] : null;
};

/* ---------- 本地缓存已抓书单（刷新页面后恢复，避免重复抓取前几页） ---------- */
export interface DoulistPreviewCache {
  meta: DoulistMeta | null;
  books: DoulistPreviewBook[];
  fetchedPages: number;
  blocked: boolean;
  reachedEnd: boolean;
}

const previewCacheKey = (doulistId: string) => `doulist_preview_${doulistId}`;

const savePreviewCache = (doulistId: string, data: DoulistPreviewCache) => {
  try { localStorage.setItem(previewCacheKey(doulistId), JSON.stringify(data)); } catch { /* 忽略 */ }
};

export const loadPreviewCache = (doulistId: string): DoulistPreviewCache | null => {
  try {
    const raw = localStorage.getItem(previewCacheKey(doulistId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const removePreviewCache = (doulistId: string) => {
  try { localStorage.removeItem(previewCacheKey(doulistId)); } catch { /* 忽略 */ }
};

export interface StartCrawlOptions {
  /** 豆列链接或数字 ID */
  input: string;
  /** 起始偏移（续跑时为后端 last_start） */
  startOffset?: number;
  /** 续跑时恢复的本地缓存（已抓书单），无缓存可只给 fetchedPages 兜底页码 */
  cached?: Partial<DoulistPreviewCache> | null;
  /** 单次最多抓取页数（0 = 不限） */
  maxPages?: number;
}

/**
 * 启动一次豆列抓取任务（DoulistImport 点击「开始抓取 / 继续抓取」时调用）。
 * 已有未完成任务时先终止并移除其小窗记录，避免状态互相覆盖。
 * 返回 taskId（供组件监听任务状态）。
 */
export function startCrawlTask(opts: StartCrawlOptions): string {
  const taskStore = useTaskStore();

  if (state.value && !state.value.finished) {
    state.value.cancelled = true;
    taskStore.dismissTask(state.value.taskId);
  }

  const taskId = taskStore.createTask({
    type: 'doulist-crawl',
    title: '豆列抓取',
    phase: '正在抓取豆列',
    total: opts.cached?.books?.length ?? 0,
    canCancel: true,
    target: { path: '/book/doulist-import' },
    sourcePath: '/book/doulist-import'
  });

  state.value = {
    taskId,
    input: String(opts.input || '').trim(),
    doulistId: extractDoulistId(opts.input),
    books: opts.cached?.books ? [...opts.cached.books] : [],
    meta: opts.cached?.meta ?? null,
    fetchedPages: opts.cached?.fetchedPages ?? 0,
    blocked: opts.cached?.blocked ?? false,
    reachedEnd: opts.cached?.reachedEnd ?? false,
    pageLimitReached: false,
    maxPages: opts.maxPages ?? 0,
    cancelled: false,
    finished: false,
    error: null
  };

  // 注册取消回调与执行体（幂等，重复注册覆盖）
  taskStore.attachCanceller(taskId, () => {
    if (state.value?.taskId === taskId) state.value.cancelled = true;
  });
  taskStore.attachRunner(taskId, () => runCrawlLoop(opts.startOffset ?? 0));
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 估算总本数（首页返回 meta 后才有 totalPages，每页 25 本） */
const estimatedTotal = (st: DoulistCrawlState) =>
  st.meta?.totalPages ? st.meta.totalPages * 25 : st.books.length;

/** 逐页抓取循环（跑在模块侧，切页不中断） */
async function runCrawlLoop(startOffset: number) {
  const st = state.value;
  if (!st) return;
  const taskStore = useTaskStore();
  taskStore.setPhase(st.taskId, '正在抓取豆列');
  let start = startOffset;

  try {
    while (!st.cancelled) {
      // 设置里的「单次最多抓取页数」上限（0 = 不限，抓到底）
      if (st.maxPages > 0 && st.fetchedPages >= st.maxPages) {
        st.pageLimitReached = true;
        break;
      }

      const result = await doulistApi.preview(st.input, start, 1);
      st.meta = result.doulist;
      st.fetchedPages += result.pagesFetched || 0;
      st.blocked = result.blocked;

      // 去重合并（同一页重复返回时跳过）
      const existing = new Set(st.books.map((b) => b.doubanId));
      for (const b of result.books) {
        if (!existing.has(b.doubanId)) st.books.push(b);
      }
      taskStore.setProgress(st.taskId, st.books.length, estimatedTotal(st), `已抓取第 ${st.fetchedPages} 页`);

      // 断点续跑：进度落库（last_start 指向下一页偏移）+ 本地缓存已抓书单
      if (st.doulistId) {
        const lastStart = result.nextStart !== null ? result.nextStart : start;
        try {
          await doulistApi.saveProgress(st.doulistId, {
            lastStart: result.blocked ? start : lastStart,
            fetchedItems: st.books.length,
            title: st.meta?.title,
            owner: st.meta?.owner,
            ownerUrl: st.meta?.ownerUrl
          });
        } catch { /* 忽略进度保存失败 */ }
        savePreviewCache(st.doulistId, {
          meta: st.meta,
          books: st.books,
          fetchedPages: st.fetchedPages,
          blocked: st.blocked,
          reachedEnd: st.reachedEnd
        });
      }

      if (result.blocked) break;
      if (result.reachedEnd || result.nextStart === null || result.nextStart <= start) {
        st.reachedEnd = true;
        break;
      }
      start = result.nextStart;
    }

    // 抓到头：清除续传标记（避免下次还提示续传最后一页）
    if (st.reachedEnd && st.doulistId) {
      try { await doulistApi.saveProgress(st.doulistId, { lastStart: 0, fetchedItems: st.books.length }); } catch { /* 忽略 */ }
    }
  } catch (err: any) {
    // 与原实现一致：已抓到部分书时忽略错误（保留预览），一本没抓到才判失败
    if (st.books.length === 0) {
      const msg = err?.message || '抓取失败';
      st.error = msg;
      taskStore.failTask(st.taskId, msg);
    }
  } finally {
    st.finished = true;
    if (st.cancelled) {
      // 用户主动停止：移除小窗记录（已抓书籍保留在预览列表）
      taskStore.dismissTask(st.taskId);
    } else if (!st.error) {
      taskStore.completeTask(st.taskId, { success: st.books.length, skipped: 0, failed: 0 });
    }
  }
}
