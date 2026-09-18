/**
 * 全局任务 store：批量任务（扫描入库、导入、豆列入库等）的状态与执行体托管
 *
 * 设计要点（见 doc/批量任务小窗与任务中心计划.md 4.2）：
 * - 任务状态与执行循环都放在 store 侧，组件仅作视图，切页不中断
 * - 执行体通过 attachRunner 注册到模块级 Map，脱离组件实例存活
 * - 显隐由路由推导（visibleTasks），无需页面配合
 * - 串行队列（4.6）：同一时刻仅一个任务 running，其余 queued，终态后自动调度下一个
 * - sessionStorage 持久化（4.7）：running/queued 落盘，刷新后改写 interrupted 供「重新开始」续跑
 */
import { defineStore } from 'pinia';
import router from '@/router';

export type TaskType =
  | 'scan-import'      // 批量扫描入库
  | 'import-books'     // 表格导入
  | 'doulist-shelve'   // 豆列批量入库
  | 'doulist-crawl'    // 豆列抓取导入
  | 'doulist-refresh'  // 刷新豆列
  | 'export'           // 导出
  | 'enrich'           // 豆列元数据补全

export type TaskStatus = 'running' | 'queued' | 'done' | 'failed' | 'cancelled' | 'interrupted'

export interface TaskRecord {
  id: string
  type: TaskType
  /** 任务标题，如「批量扫描入库」 */
  title: string
  /** 当前阶段文案，如「正在搜索书源」 */
  phase: string
  completed: number
  total: number
  /** 当前处理项（书名等） */
  message?: string
  status: TaskStatus
  startedAt: number
  finishedAt?: number
  summary?: { success: number; skipped: number; failed: number }
  errors: string[]
  /** 点击小窗任务行时的跳转目标 */
  target: { path: string; query?: Record<string, string> }
  /** 任务所属页面路由，用于「在本页收起小窗」 */
  sourcePath: string
  /** 用户在本页主动展开过小窗 → 本页内不再自动隐藏 */
  manuallyShown?: boolean
  canCancel: boolean
  /** 任务私有数据（豆列 items[]、isbnList 等），供重附着/续跑使用 */
  payload?: unknown
}

/** 任务创建初始化参数（id/status/时间戳由 store 生成） */
export type TaskInit = Pick<TaskRecord, 'type' | 'title' | 'target' | 'sourcePath'> &
  Partial<Omit<TaskRecord, 'id' | 'type' | 'title' | 'target' | 'sourcePath' | 'status' | 'startedAt' | 'errors'>>

// 执行体/取消回调放在模块级 Map（非响应式），保证脱离组件实例存活
const runners = new Map<string, () => void | Promise<void>>()
const cancellers = new Map<string, () => void>()

let idSeq = 0

/* ---------- sessionStorage 持久化（4.7） ---------- */
const PERSIST_KEY = 'qcbooklog_tasks';

/** 从 sessionStorage 恢复：running/queued 一律改写为 interrupted（刷新后前端循环已消失） */
function loadPersistedTasks(): TaskRecord[] {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TaskRecord[];
    if (!Array.isArray(arr)) return [];
    return arr.map((t) => ({
      ...t,
      status: 'interrupted' as const,
      errors: t.errors ?? []
    }));
  } catch (e) {
    console.warn('[task] 恢复持久化任务失败:', e);
    return [];
  }
}

/** 序列化 running/queued 任务（manuallyShown 刷新后无意义，不落盘） */
function serializeActive(tasks: TaskRecord[]): string {
  const active = tasks
    .filter((t) => t.status === 'running' || t.status === 'queued')
    .map((t) => ({ ...t, manuallyShown: undefined }));
  return JSON.stringify(active);
}

// 模块级持有任务数组引用（state() 使用同一引用），beforeunload 时可直接补写
const persistedTasks = loadPersistedTasks();

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** 节流落盘（300ms），由各任务生命周期 action 调用 */
function persistTasks(tasks: TaskRecord[]) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      sessionStorage.setItem(PERSIST_KEY, serializeActive(tasks));
    } catch (e) {
      // payload 过大导致超限等场景：静默降级为不持久化
    }
  }, 300);
}

function flushPersistTasks(tasks: TaskRecord[]) {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    sessionStorage.setItem(PERSIST_KEY, serializeActive(tasks));
  } catch (e) {
    // 同上，忽略持久化失败
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => flushPersistTasks(persistedTasks));
}

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: persistedTasks
  }),

  getters: {
    /** 进行中/排队中的任务 */
    activeTasks: (state): TaskRecord[] => state.tasks.filter((t) => t.status === 'running' || t.status === 'queued'),
    runningCount(): number {
      return this.activeTasks.length
    },
    hasRunning(): boolean {
      return this.runningCount > 0
    },
    /**
     * 小窗可见任务：
     * - running 任务停在所属页面时自动隐藏（页面内已有进度，避免重复），除非用户主动展开过
     * - done/failed/interrupted 等非 running 态无论在哪一页都显示结果
     * - 必须精确匹配 route.path，不能用前缀（/book 是 /book/batch-scanner 的前缀）
     */
    visibleTasks(): TaskRecord[] {
      const path = router.currentRoute.value.path
      return this.tasks.filter(
        (t) => !(t.status === 'running' && path === t.sourcePath && !t.manuallyShown)
      )
    }
  },

  actions: {
    /**
     * 创建任务并压入列表，返回 taskId。
     * 串行队列（4.6）：已有任务 running 时新任务置 queued，由调度器在其终态后启动。
     */
    createTask(init: TaskInit): string {
      const id = `task_${Date.now()}_${++idSeq}`
      const busy = this.tasks.some((t) => t.status === 'running')
      this.tasks.push({
        id,
        type: init.type,
        title: init.title,
        phase: init.phase ?? '',
        completed: init.completed ?? 0,
        total: init.total ?? 0,
        message: init.message,
        status: busy ? 'queued' : 'running',
        startedAt: Date.now(),
        errors: [],
        target: init.target,
        sourcePath: init.sourcePath,
        canCancel: init.canCancel ?? false,
        payload: init.payload
      })
      persistTasks(this.tasks)
      return id
    },

    /** 更新任意字段（幂等，找不到任务时静默忽略） */
    updateTask(id: string, patch: Partial<TaskRecord>) {
      const task = this.tasks.find((t) => t.id === id)
      if (task) {
        Object.assign(task, patch)
        persistTasks(this.tasks)
      }
    },

    /** 更新进度与当前处理项 */
    setProgress(id: string, completed: number, total: number, message?: string) {
      this.updateTask(id, { completed, total, message })
    },

    /** 更新阶段文案 */
    setPhase(id: string, phase: string) {
      this.updateTask(id, { phase })
    },

    /** 启动任务执行体：仅当任务处于 running（未被排队）时执行；composable 注册完 runner 后调用 */
    dispatch(id: string) {
      const task = this.tasks.find((t) => t.id === id)
      if (!task || task.status !== 'running') return
      const fn = runners.get(id)
      if (fn) fn()
    },

    /** 队列调度：取最早的 queued 任务置 running 并启动其执行体（终态后自动调用） */
    scheduleNext() {
      const next = this.tasks
        .filter((t) => t.status === 'queued')
        .sort((a, b) => a.startedAt - b.startedAt)[0]
      if (!next) return
      next.status = 'running'
      persistTasks(this.tasks)
      const fn = runners.get(next.id)
      if (fn) fn()
    },

    /** 置为完成，记录汇总 */
    completeTask(id: string, summary?: { success: number; skipped: number; failed: number }) {
      this.updateTask(id, { status: 'done', finishedAt: Date.now(), summary })
      this.scheduleNext()
    },

    /** 置为失败，追加错误信息 */
    failTask(id: string, error: string) {
      const task = this.tasks.find((t) => t.id === id)
      if (!task) return
      task.status = 'failed'
      task.finishedAt = Date.now()
      task.errors.push(error)
      persistTasks(this.tasks)
      this.scheduleNext()
    },

    /** 取消任务：置 cancelled 并调用已注册的取消回调（queued 任务取消后不再被调度） */
    cancelTask(id: string) {
      const task = this.tasks.find((t) => t.id === id)
      if (!task) return
      task.status = 'cancelled'
      task.finishedAt = Date.now()
      const canceller = cancellers.get(id)
      if (canceller) canceller()
      persistTasks(this.tasks)
      this.scheduleNext()
    },

    /** 从小窗移除任务记录 */
    dismissTask(id: string) {
      const idx = this.tasks.findIndex((t) => t.id === id)
      if (idx !== -1) this.tasks.splice(idx, 1)
      runners.delete(id)
      cancellers.delete(id)
      persistTasks(this.tasks)
    },

    /**
     * 注册执行体，使其脱离组件实例存活。
     * 注意：同一 taskId 重复注册会覆盖（保证幂等，不会重复执行）。
     */
    attachRunner(id: string, fn: () => void | Promise<void>) {
      runners.set(id, fn)
    },

    /** 注册取消回调（供 cancelTask 调用） */
    attachCanceller(id: string, fn: () => void) {
      cancellers.set(id, fn)
    },

    /**
     * 标记用户在本页主动展开/拖动过小窗：
     * 当前路由上所有 running 任务的 manuallyShown 置 true，本页内不再自动隐藏
     */
    markManuallyShown() {
      const path = router.currentRoute.value.path
      this.tasks.forEach((t) => {
        if (t.status === 'running' && path === t.sourcePath) t.manuallyShown = true
      })
    }
  }
})
