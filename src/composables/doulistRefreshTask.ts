/**
 * 豆列增量刷新任务：状态与「逐页抓取 + 自动增量导入」循环托管模块
 * （见 doc/批量任务小窗与任务中心计划.md 4.4）
 *
 * 设计要点：
 * - 刷新状态与执行循环全部放在模块级（脱离组件实例存活），切页不中断
 * - DoulistBooksPanel.vue 仅作视图，读写本模块的 refreshState
 */
import { ref } from 'vue';
import { doulistApi, type DoulistMeta, type DoulistPreviewBook } from '@/api/doulistService';
import { useTaskStore } from '@/stores/task';

export interface DoulistRefreshState {
  taskId: string;
  doulistId: string;
  books: DoulistPreviewBook[];
  meta: DoulistMeta | null;
  fetchedPages: number;
  blocked: boolean;
  error: string | null;
  /** 导入结果（刷新完成后写入） */
  result: { imported: number; duplicates: number } | null;
  cancelled: boolean;
  finished: boolean;
}

/** 当前豆列刷新任务状态（模块级，切页不丢） */
const state = ref<DoulistRefreshState | null>(null);

/** 当前状态（组件只读） */
export const refreshState = state;

export interface StartRefreshOptions {
  doulistId: string;
  /** 单次最多抓取页数（0 = 不限） */
  maxPages?: number;
  /** 任务所属页面路由（面板同时挂在 /book 与 /book/doulist-books） */
  sourcePath: string;
}

/**
 * 启动一次豆列增量刷新任务（面板刷新弹窗点击「开始刷新」时调用）。
 * 已有未完成任务时先终止并移除其小窗记录，避免状态互相覆盖。
 */
export function startRefreshTask(opts: StartRefreshOptions): string {
  const taskStore = useTaskStore();

  if (state.value && !state.value.finished) {
    state.value.cancelled = true;
    taskStore.dismissTask(state.value.taskId);
  }

  const taskId = taskStore.createTask({
    type: 'doulist-refresh',
    title: '豆列刷新',
    phase: '正在抓取豆列',
    canCancel: true,
    target: { path: opts.sourcePath },
    sourcePath: opts.sourcePath
  });

  state.value = {
    taskId,
    doulistId: opts.doulistId,
    books: [],
    meta: null,
    fetchedPages: 0,
    blocked: false,
    error: null,
    result: null,
    cancelled: false,
    finished: false
  };

  // 注册取消回调与执行体（幂等，重复注册覆盖）
  taskStore.attachCanceller(taskId, () => {
    if (state.value?.taskId === taskId) state.value.cancelled = true;
  });
  taskStore.attachRunner(taskId, () => runRefreshLoop(opts.maxPages ?? 0));
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 「抓取 + 增量导入」一体循环（跑在模块侧，切页不中断） */
async function runRefreshLoop(maxPages: number) {
  const st = state.value;
  if (!st) return;
  const taskStore = useTaskStore();
  let start = 0;

  try {
    while (!st.cancelled) {
      // 设置里的「单次最多抓取页数」上限（0 = 不限，抓到底）
      if (maxPages > 0 && st.fetchedPages >= maxPages) {
        st.error = `已达设置的单次最多 ${maxPages} 页上限，本次仅导入已抓到的书`;
        break;
      }

      const result = await doulistApi.preview(st.doulistId, start, 1);
      st.meta = result.doulist;
      st.fetchedPages += result.pagesFetched || 0;
      st.blocked = result.blocked;

      // 去重合并
      const existing = new Set(st.books.map((b) => b.doubanId));
      for (const b of result.books) {
        if (!existing.has(b.doubanId)) st.books.push(b);
      }
      taskStore.setProgress(
        st.taskId,
        st.books.length,
        st.meta?.totalPages ? st.meta.totalPages * 25 : st.books.length,
        `已抓取第 ${st.fetchedPages} 页`
      );

      if (result.blocked) break;
      if (result.reachedEnd || result.nextStart === null || result.nextStart <= start) break;
      start = result.nextStart;
    }

    if (!st.cancelled && !st.error) {
      if (st.books.length > 0) {
        // 抓取完成：自动增量导入（仅补充新书，不覆盖已有、不动书架状态）
        taskStore.setPhase(st.taskId, '正在增量导入书库');
        const importRes = await doulistApi.import(st.books, st.meta!, true);
        st.result = { imported: importRes.imported, duplicates: importRes.duplicates };
      } else {
        st.result = { imported: 0, duplicates: 0 };
      }
    }
  } catch (err: any) {
    const msg = err?.message || '刷新失败';
    st.error = msg;
    taskStore.failTask(st.taskId, msg);
  } finally {
    st.finished = true;
    if (st.cancelled) {
      // 用户主动停止：移除小窗记录
      taskStore.dismissTask(st.taskId);
    } else if (!st.error) {
      taskStore.completeTask(st.taskId, {
        success: st.result?.imported ?? 0,
        skipped: st.result?.duplicates ?? 0,
        failed: 0
      });
    }
  }
}

/** 清理已结束的刷新任务记录（关闭/重新打开弹窗时调用） */
export function clearRefreshTask() {
  const taskStore = useTaskStore();
  if (state.value) taskStore.dismissTask(state.value.taskId);
  state.value = null;
}
