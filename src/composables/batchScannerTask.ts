/**
 * 批量扫描入库任务：状态与执行循环托管模块（见 doc/批量任务小窗与任务中心计划.md 4.3）
 *
 * 设计要点：
 * - isbnList、书籍缓存与搜索/导入循环全部放在模块级（脱离组件实例存活），切页不中断
 * - 搜索、导入各注册一条任务记录进 useTaskStore，供右上角小窗展示进度 / 跳转 / 取消
 * - 组件（BatchScanner.vue）仅作视图；「更换书源」强依赖对比视图交互，仍留在组件内
 */
import { ref, computed } from 'vue';
import { searchBookByISBN } from '@/api/common/isbnApi';
import type { BookSearchResult } from '@/api/common/isbnApi/types';
import { bookService } from '@/api/book';
import { useBookStore } from '@/stores/book';
import { useTaskStore, type TaskRecord } from '@/stores/task';

export interface ScannerIsbnItem {
  isbn: string;
  searching: boolean;
  data: BookSearchResult | null;
  error: string | null;
  isNew?: boolean; // 是否为新增
}

/** 阶段进度（视图进度条与小窗共用数据源） */
export interface ScannerProgress {
  active: boolean;
  current: number;
  total: number;
  title: string;
}

export interface ScannerImportResult {
  type: 'success' | 'partial';
  icon: string;
  title: string;
  message: string;
}

/* ---------- 模块级状态（切页不丢） ---------- */
const list = ref<ScannerIsbnItem[]>([]);
const searchProgress = ref<ScannerProgress>({ active: false, current: 0, total: 0, title: '' });
const importProgress = ref<ScannerProgress>({ active: false, current: 0, total: 0, title: '' });
const importResult = ref<ScannerImportResult | null>(null);

/** 当前 ISBN 列表（组件只读写本引用） */
export const scannerList = list;
/** 批量搜索阶段进度 */
export const scannerSearchProgress = searchProgress;
/** 批量导入阶段进度 */
export const scannerImportProgress = importProgress;
/** 最近一次导入结果（页面结果提示用） */
export const scannerImportResult = importResult;

/** 预览书籍列表（已搜到元数据的项） */
export const scannerPreviewBooks = computed(() =>
  list.value.filter(item => item.data !== null).map(item => item.data!)
);

/* ---------- 本地持久化（ISBN 列表 + 书籍缓存） ---------- */
const STORAGE_KEY = 'batch_scanner_isbn_list';
const BOOK_CACHE_KEY = 'batch_scanner_book_cache';

export function loadFromStorage(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 确保加载的数据包含书籍信息，缺失时尝试从缓存恢复
      list.value = parsed.map((item: ScannerIsbnItem) => ({
        ...item,
        data: item.data || getBookFromCache(item.isbn)
      }));
      return true;
    }
  } catch (e: unknown) {
    console.error('📊 [batchScanner.loadFromStorage] 加载失败:', e);
  }
  return false;
}

export function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value));
  } catch (e: unknown) {
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e: unknown) {
  }
}

export function getBookFromCache(isbn: string): BookSearchResult | null {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      return cache[isbn] || null;
    }
  } catch (e: unknown) {
  }
  return null;
}

export function saveBookToCache(isbn: string, bookData: BookSearchResult) {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    const cache = cacheData ? JSON.parse(cacheData) : {};
    cache[isbn] = bookData;
    localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(cache));
  } catch (e: unknown) {
  }
}

export function removeBookFromCache(isbn: string) {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      if (cache[isbn]) {
        delete cache[isbn];
        localStorage.setItem(BOOK_CACHE_KEY, JSON.stringify(cache));
      }
    }
  } catch (e: unknown) {
  }
}

export function clearBookCache() {
  try {
    localStorage.removeItem(BOOK_CACHE_KEY);
  } catch (e: unknown) {
  }
}

export function hasCachedBooks(): boolean {
  try {
    const cacheData = localStorage.getItem(BOOK_CACHE_KEY);
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      return Object.keys(cache).length > 0;
    }
  } catch (e: unknown) {
  }
  return false;
}

/* ---------- 搜索 ---------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let searchCancelled = false; // 取消标记：批量搜索循环每轮检查
let importCancelled = false; // 取消标记：导入循环每轮检查

/** 搜索单本（缓存优先），供单本自动搜索与批量循环复用 */
export async function searchScannerItem(item: ScannerIsbnItem) {
  if (!item) return;

  // 先检查缓存
  const cachedBook = getBookFromCache(item.isbn);
  if (cachedBook) {
    item.data = cachedBook;
    item.error = null;
    return;
  }

  item.searching = true;
  item.error = null;
  item.data = null;

  try {
    const results = await searchBookByISBN(item.isbn);
    // 优先使用DBR，然后是豆瓣
    const bestResult = results.dbr || results.douban || results.isbnWork || results.tanshu;
    if (bestResult) {
      item.data = bestResult;
      saveBookToCache(item.isbn, bestResult);
    } else {
      item.error = '未找到书籍信息';
    }
  } catch (error) {
    console.error(`搜索失败 [${item.isbn}]:`, error);
    item.error = '搜索失败';
  } finally {
    item.searching = false;
  }
}

/**
 * 启动批量搜索任务（页面「批量搜索」按钮调用）。
 * 返回 taskId，任务进度/取消经 useTaskStore 管理。
 */
export function startScannerSearchTask(items: ScannerIsbnItem[]): string {
  const taskStore = useTaskStore();
  const taskId = taskStore.createTask({
    type: 'scan-import',
    title: '批量扫描入库',
    phase: '正在搜索书源',
    total: items.length,
    canCancel: true,
    target: { path: '/book/batch-scanner' },
    sourcePath: '/book/batch-scanner'
  });

  searchCancelled = false;
  taskStore.attachCanceller(taskId, () => { searchCancelled = true; });
  taskStore.attachRunner(taskId, () => runSearchLoop(taskId, items));
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 批量搜索循环（跑在模块侧，切页不中断） */
async function runSearchLoop(taskId: string, items: ScannerIsbnItem[]) {
  const taskStore = useTaskStore();
  taskStore.setPhase(taskId, '正在搜索书源');
  searchProgress.value = { active: true, current: 0, total: items.length, title: '' };

  let ok = 0;
  let fail = 0;
  for (const item of items) {
    if (searchCancelled) {
      searchProgress.value = { active: false, current: 0, total: 0, title: '' };
      return;
    }
    searchProgress.value.current++;
    searchProgress.value.title = item.isbn;
    taskStore.setProgress(taskId, searchProgress.value.current, items.length, item.isbn);

    await searchScannerItem(item);
    if (item.data) ok++; else fail++;

    // 延迟避免请求过快
    await sleep(500);
  }

  searchProgress.value = { active: false, current: 0, total: 0, title: '' };
  saveToStorage();
  taskStore.completeTask(taskId, { success: ok, skipped: 0, failed: fail });
}

/* ---------- 导入 ---------- */

/**
 * 启动导入任务（重复检测确认完成后调用，books 为最终确认导入的列表）。
 * 每本成功后即从 isbnList 移除并写入书库 store。
 */
export function startScannerImportTask(books: BookSearchResult[]): string {
  const taskStore = useTaskStore();
  const doneIsbns: string[] = [];
  const taskId = taskStore.createTask({
    type: 'scan-import',
    title: '批量扫描入库',
    phase: '正在写入书库',
    total: books.length,
    canCancel: true,
    target: { path: '/book/batch-scanner' },
    sourcePath: '/book/batch-scanner',
    // payload 供刷新中断后「重新开始」续跑（doneIsbns 为引用数组，序列化取当前值）
    payload: { books, doneIsbns }
  });

  importCancelled = false;
  taskStore.attachCanceller(taskId, () => { importCancelled = true; });
  taskStore.attachRunner(taskId, () => runImportLoop(taskId, books, doneIsbns));
  // 经调度器启动：任务若被排队（已有任务运行中），待前序任务终态后自动执行
  taskStore.dispatch(taskId);
  return taskId;
}

/** 批量导入循环（跑在模块侧，切页不中断） */
async function runImportLoop(taskId: string, books: BookSearchResult[], doneIsbns: string[] = []) {
  const taskStore = useTaskStore();
  const bookStore = useBookStore();
  taskStore.setPhase(taskId, '正在写入书库');
  importProgress.value = { active: true, current: 0, total: books.length, title: '' };

  let successCount = 0;
  const failedBooks: string[] = [];

  for (const bookData of books) {
    if (importCancelled) {
      importProgress.value = { active: false, current: 0, total: 0, title: '' };
      return;
    }
    importProgress.value.current++;
    importProgress.value.title = bookData.title || bookData.isbn;
    taskStore.setProgress(taskId, importProgress.value.current, books.length, importProgress.value.title);

    try {
      const newBook = await bookService.addBook({
        isbn: bookData.isbn,
        title: bookData.title,
        author: bookData.author,
        publisher: bookData.publisher || '',
        publishYear: bookData.publishYear,
        pages: bookData.pages,
        binding1: bookData.binding1 || 0,
        binding2: bookData.binding2 || 0,
        book_type: bookData.book_type || 1,
        coverUrl: bookData.coverUrl || '',
        purchaseDate: undefined,
        purchasePrice: undefined,
        standardPrice: bookData.price ? parseFloat(bookData.price.replace(/[^\d.]/g, '')) : undefined,
        readStatus: '未读' as const,
        readCompleteDate: undefined,
        rating: bookData.rating,
        tags: bookData.tags?.filter((t): t is string => typeof t === 'string') || [],
        groups: [],
        series: bookData.series || '',
        note: '',
        description: bookData.description || ''
      });

      bookStore.addBook(newBook);
      successCount++;
      doneIsbns.push(String(bookData.isbn));

      // 导入成功后，从列表中移除该项
      const index = list.value.findIndex(item => item.isbn === bookData.isbn);
      if (index !== -1) list.value.splice(index, 1);
    } catch (error) {
      console.error(`导入失败 [${bookData.isbn}]:`, error);
      failedBooks.push(bookData.title);
    }

    // 延迟避免请求过快
    await sleep(300);
  }

  importProgress.value = { active: false, current: 0, total: 0, title: '' };
  saveToStorage();

  if (failedBooks.length === 0) {
    importResult.value = {
      type: 'success',
      icon: '✅',
      title: '导入成功',
      message: `成功导入 ${successCount} 本书籍到书库`
    };
    taskStore.completeTask(taskId, { success: successCount, skipped: 0, failed: 0 });
  } else {
    importResult.value = {
      type: 'partial',
      icon: '⚠️',
      title: '部分导入成功',
      message: `成功导入 ${successCount} 本，失败 ${failedBooks.length} 本\n失败书籍: ${failedBooks.join('、')}`
    };
    // 部分失败属可预期结果（与原行为一致），任务置完成并在 summary 记录失败数
    taskStore.completeTask(taskId, { success: successCount, skipped: 0, failed: failedBooks.length });
  }
}

/**
 * 从中断记录恢复扫描入库导入任务（小窗「重新开始」调用）：
 * 以原 payload 重建导入任务，跳过已入库成功的条目。
 * 返回是否成功重启（payload 缺失或已全部入库时返回 false）。
 */
export function restartScannerImportTask(saved: TaskRecord): boolean {
  const payload = saved.payload as
    | { books?: BookSearchResult[]; doneIsbns?: string[] }
    | undefined;
  if (!payload?.books?.length) return false;
  const done = new Set(payload.doneIsbns ?? []);
  const rest = payload.books.filter((b) => !done.has(String(b.isbn)));
  if (!rest.length) return false;
  startScannerImportTask(rest);
  return true;
}
