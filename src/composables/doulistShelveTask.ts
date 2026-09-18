/**
 * 豆列入库任务：状态与执行循环托管模块（见 doc/批量任务小窗与任务中心计划.md 4.2/4.4）
 *
 * 设计要点：
 * - 状态与执行循环全部放在模块级（脱离组件实例存活），切页不中断
 * - 任务记录注册进 useTaskStore，供右上角小窗展示进度 / 跳转 / 取消
 * - 组件（弹窗 / 整页）仅作视图，读写本模块的 shelveState
 */
import { ref } from 'vue';
import { dbrApi } from '@/api/apiClient';
import { doulistApi, type DoulistBook } from '@/api/doulistService';
import { searchBookByISBN } from '@/api/common/isbnApi';
import { bookService } from '@/api/book';
import { useTaskStore, type TaskRecord } from '@/stores/task';

export type ShelvePhase = 'searching' | 'preview' | 'importing' | 'done';
export type ShelveSearchStatus = 'pending' | 'searching' | 'ok' | 'fail';
export type ShelveImportStatus = 'idle' | 'importing' | 'success' | 'fail';

export interface ShelveItem {
  book: DoulistBook;
  /** 传入 addBook 的入库数据 */
  data: Record<string, any> | null;
  /** 豆瓣原始响应（DBR），用于预览页展示更完整的字段 */
  raw: any | null;
  coverUrl: string;
  source: 'dbr' | 'booksource' | 'doulist';
  status: ShelveSearchStatus;
  importStatus: ShelveImportStatus;
  selected: boolean;
  error?: string;
}

interface ShelveState {
  taskId: string;
  phase: ShelvePhase;
  items: ShelveItem[];
  searchDone: number;
  importDone: number;
  /** 当前处理项（书名） */
  currentTitle: string;
  /** 取消标记：搜索与入库循环每轮检查，置 true 后循环退出 */
  cancelled: boolean;
  /** 「返回书单」目标路由（完成任务/空态跳转用） */
  returnTo: string;
  /** 已入库成功的豆瓣 ID（payload 引用同一数组，供中断续跑跳过已成功项） */
  doneDoubanIds: string[];
}

/** 当前豆列入库任务状态（模块级，切页不丢） */
const state = ref<ShelveState | null>(null);

/** 当前状态（组件只读） */
export const shelveState = state;

/** 批量搜索元数据时每本之间的间隔（毫秒），降低豆瓣风控风险 */
const SEARCH_GAP = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- DBR 响应 → 入库字段（与书库搜索链路同款映射，含封面防 403 中转） ---------- */
const mapDbrToBookData = (data: any, book: DoulistBook): Record<string, unknown> => {
  let coverUrl: string = data.images?.large || data.images?.medium || data.images?.small || '';
  if (coverUrl.includes('doubanio.com')) {
    const m = coverUrl.match(/\/public\/(s\d+)\.jpg/i);
    coverUrl = m ? `/api/douban/cover/${m[1]}` : '';
  }
  const yearMatch = data.pubdate ? String(data.pubdate).match(/\d{4}/) : null;
  const pageMatch = data.pages ? String(data.pages).match(/\d+/) : null;
  const authorText = Array.isArray(data.author) ? data.author.join(' / ') : String(data.author || '').trim();
  const bindingText = String(data.binding || '').toLowerCase();
  let binding1 = 1;
  let book_type = 1;
  if (bindingText.includes('精装') || bindingText.includes('hardcover')) binding1 = 2;
  else if (bindingText.includes('电子')) { binding1 = 0; book_type = 0; }
  else if (bindingText.includes('套装') || bindingText.includes('set')) binding1 = 4;
  else if (bindingText && !bindingText.includes('平装')) binding1 = 3;
  const ratingNum = parseFloat(String(data.rating?.average ?? ''));
  const tags = Array.isArray(data.tags)
    ? data.tags.map((t: any) => (typeof t === 'string' ? t : t?.title)).filter(Boolean)
    : [];
  return {
    title: data.title || book.title || '未知书名',
    author: authorText || book.author || '未知作者',
    isbn: data.isbn13 || book.isbn13 || book.isbn10 || undefined,
    publisher: data.publisher || book.publisher || '',
    publishYear: yearMatch ? parseInt(yearMatch[0], 10) : (book.publish_year ? Number(book.publish_year) : undefined),
    pages: pageMatch ? parseInt(pageMatch[0], 10) : (book.pages || undefined),
    binding1,
    book_type,
    rating: !isNaN(ratingNum) ? Math.round(ratingNum * 10) / 10 : (book.rating || undefined),
    tags,
    series: data.serials || data.series || '',
    description: data.summary || '',
    coverUrl,
    hasCover: !!coverUrl
  };
};

/** 豆列列表页字段 → 入库数据（最后兜底） */
const mapDoulistBookData = (book: DoulistBook): Record<string, unknown> | null => {
  if (!book.title) return null;
  return {
    title: book.title,
    author: book.author || '未知作者',
    isbn: book.isbn13 || book.isbn10 || undefined,
    publisher: book.publisher || '',
    publishYear: book.publish_year ? Number(book.publish_year) : undefined,
    pages: book.pages || undefined,
    binding1: 1,
    book_type: 1,
    rating: book.rating || undefined,
    tags: [],
    hasCover: false
  };
};

const fetchBookMeta = async (item: ShelveItem) => {
  const book = item.book;
  const isbn = book.isbn13 || book.isbn10;

  // ① 豆瓣 ID → 内置 DBR（免 Key）
  if (book.douban_id && !String(book.douban_id).startsWith('local_')) {
    try {
      const res = await dbrApi.getById(String(book.douban_id));
      if (res && res.code === 0 && res.data) {
        const mapped = mapDbrToBookData(res.data, book);
        item.data = mapped;
        item.raw = res.data;
        item.coverUrl = String(mapped.coverUrl || '');
        item.source = 'dbr';
        item.status = 'ok';
        return;
      }
    } catch (err: any) {
      console.warn(`DBR 查询失败(${book.douban_id})，尝试降级:`, err?.message);
    }
  }

  // ② 已有 ISBN → 书源 API
  if (isbn) {
    try {
      const searchRes = await searchBookByISBN(isbn);
      const best = searchRes.dbr || searchRes.isbnWork || searchRes.douban || null;
      item.data = {
        title: best?.title || book.title || '未知书名',
        author: best?.author || book.author || '未知作者',
        isbn,
        publisher: best?.publisher || book.publisher || '',
        publishYear: best?.publishYear || (book.publish_year ? Number(book.publish_year) : undefined),
        pages: best?.pages || book.pages || undefined,
        binding1: best?.binding1 ?? 1,
        book_type: 1,
        rating: best?.rating || book.rating || undefined,
        tags: best?.tags || [],
        hasCover: false
      };
      item.coverUrl = book.cover_url || '';
      item.source = 'booksource';
      item.status = 'ok';
      return;
    } catch (err: any) {
      console.warn(`书源查询失败(${isbn}):`, err?.message);
    }
  }

  // ③ 豆列列表页字段兜底
  const fallback = mapDoulistBookData(book);
  if (fallback) {
    item.data = fallback;
    item.coverUrl = book.cover_url || '';
    item.source = 'doulist';
    item.status = 'ok';
  } else {
    item.status = 'fail';
    item.selected = false;
    item.error = '既无豆瓣元数据也无书名，无法入库';
    item.importStatus = 'idle';
  }
};

/**
 * 启动一次豆列入库任务（面板打开弹窗时调用）。
 * 已有未完成任务时先终止并移除其小窗记录，避免状态互相覆盖。
 * 返回 taskId（供面板监听任务完成 / 弹窗渲染）。
 */
export function startShelveTask(books: DoulistBook[], returnTo = '/book'): string {
  const taskStore = useTaskStore();
  const doneDoubanIds: string[] = [];

  if (state.value && state.value.phase !== 'done') {
    state.value.cancelled = true;
    taskStore.dismissTask(state.value.taskId);
  }

  const taskId = taskStore.createTask({
    type: 'doulist-shelve',
    title: '豆列入库',
    phase: '正在搜索书籍元数据',
    total: books.length,
    canCancel: true,
    target: { path: '/book/doulist-shelve' },
    sourcePath: '/book/doulist-shelve',
    // payload 供刷新中断后「重新开始」续跑（doneDoubanIds 为引用数组，序列化取当前值）
    payload: { returnTo, books, doneDoubanIds }
  });
  // target.query 携带 taskId 与返回路由，小窗点击任务行即跳整页
  taskStore.updateTask(taskId, {
    target: { path: '/book/doulist-shelve', query: { task: taskId, returnTo } }
  });

  state.value = {
    taskId,
    phase: 'searching',
    items: books.map((book) => ({
      book,
      data: null,
      raw: null,
      coverUrl: book.cover_url || '',
      source: 'doulist' as const,
      status: 'pending' as const,
      importStatus: 'idle' as const,
      selected: true
    })),
    searchDone: 0,
    importDone: 0,
    currentTitle: '',
    cancelled: false,
    returnTo,
    doneDoubanIds
  };

  // 注册取消回调与执行体（幂等，重复注册覆盖）
  taskStore.attachCanceller(taskId, () => {
    if (state.value?.taskId === taskId) state.value.cancelled = true;
  });
  taskStore.attachRunner(taskId, () => runSearch());
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 搜索元数据循环（跑在模块侧，切页不中断） */
async function runSearch() {
  const st = state.value;
  if (!st) return;
  const taskStore = useTaskStore();
  taskStore.setPhase(st.taskId, '正在搜索书籍元数据');

  let first = true;
  for (const item of st.items) {
    if (st.cancelled) return;
    // 批量搜索时轻微间隔，降低豆瓣风控风险（单本无等待）
    if (!first) await sleep(SEARCH_GAP);
    first = false;
    item.status = 'searching';
    st.currentTitle = item.book.title || `豆瓣 ${item.book.douban_id}`;
    taskStore.setProgress(st.taskId, st.searchDone, st.items.length, st.currentTitle);
    await fetchBookMeta(item);
    st.searchDone++;
    taskStore.setProgress(st.taskId, st.searchDone, st.items.length, st.currentTitle);
  }
  if (st.cancelled) return;
  st.currentTitle = '';
  st.phase = 'preview';
  taskStore.setPhase(st.taskId, '等待确认入库');
}

/** 确认入库：把预览勾选的书籍逐本写入书库（预览态点击「加入书架」时调用） */
export async function confirmShelveImport() {
  const st = state.value;
  if (!st || st.phase !== 'preview' || st.cancelled) return;
  const taskStore = useTaskStore();

  st.phase = 'importing';
  st.importDone = 0;
  taskStore.setPhase(st.taskId, '正在写入书库');

  const targets = st.items.filter((i) => i.selected && i.status === 'ok' && i.data);
  for (const item of targets) {
    if (st.cancelled) return;
    st.currentTitle = String(item.data?.title || item.book.title || '');
    item.importStatus = 'importing';
    try {
      await bookService.addBook(item.data as any);
      // 入库衔接点：把书单阅读状态一次性写入书库（此后书库为权威）
      try {
        await doulistApi.applyReadStatus(item.book.douban_id);
      } catch (e: any) {
        console.warn('同步阅读状态到书库失败（不影响入库）:', e?.message);
      }
      item.importStatus = 'success';
      st.doneDoubanIds.push(String(item.book.douban_id));
    } catch (err: any) {
      item.importStatus = 'fail';
      item.error = err?.message || '入库失败';
    }
    st.importDone++;
    taskStore.setProgress(st.taskId, st.importDone, st.items.length, st.currentTitle);
  }

  st.currentTitle = '';
  st.phase = 'done';
  const success = st.items.filter((i) => i.importStatus === 'success').length;
  const failed = st.items.filter((i) => i.importStatus === 'fail').length;
  taskStore.completeTask(st.taskId, {
    success,
    skipped: st.items.length - success - failed,
    failed
  });
}

/**
 * 中断任务：终止循环。
 * - dismiss=true（搜索/预览阶段取消）：同时移除小窗记录，不留「已取消」残留
 * - dismiss=false（入库中被取消/取消小窗任务）：保留记录展示结果
 */
export function stopShelveTask(dismiss = false) {
  const st = state.value;
  if (!st || st.phase === 'done') return;
  st.cancelled = true;
  const taskStore = useTaskStore();
  if (dismiss) {
    taskStore.dismissTask(st.taskId);
    // 彻底丢弃任务状态，避免残留状态导致弹窗视图无法卸载 / 旧 taskId 串台
    state.value = null;
  } else {
    taskStore.cancelTask(st.taskId);
  }
}

/**
 * 从中断记录恢复豆列入库任务（小窗「重新开始」调用）：
 * 以原 payload 重建任务，跳过已入库成功的条目（重新搜索未成功项的元数据）。
 * 返回是否成功重启（payload 缺失或已全部入库时返回 false）。
 */
export function restartShelveTask(saved: TaskRecord): boolean {
  const payload = saved.payload as
    | { returnTo?: string; books?: DoulistBook[]; doneDoubanIds?: string[] }
    | undefined;
  if (!payload?.books?.length) return false;
  const done = new Set(payload.doneDoubanIds ?? []);
  const rest = payload.books.filter((b) => !done.has(String(b.douban_id)));
  if (!rest.length) return false;
  startShelveTask(rest, payload.returnTo || '/book');
  return true;
}
