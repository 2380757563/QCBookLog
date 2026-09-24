/**
 * 豆列（豆瓣书单）API
 * 对应后端 /api/doulist/*
 */
import { apiClient } from './apiClient';

export interface DoulistMeta {
  id: string;
  title: string | null;
  owner: string | null;
  ownerUrl: string | null;
  totalPages: number;
}

export interface DoulistPreviewBook {
  doubanId: string;
  title: string;
  coverUrl: string | null;
  rating: number | null;
  ratingCount: number | null;
  author: string | null;
  publisher: string | null;
  publishYear: string | null;
  addedAt: string | null;
  remark: string | null;
  url: string;
  // 以下字段仅在选择补全后由 /doulist/enrich 返回并合并进来
  subtitle?: string | null;
  translator?: string[] | null;
  isbn13?: string | null;
  isbn10?: string | null;
  pages?: number | null;
  price?: number | null;
  binding?: string | null;
  producer?: string | null;
  series?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  enrichStatus?: string;
}

export interface DoulistPreviewResult {
  ok: boolean;
  doulist: DoulistMeta;
  books: DoulistPreviewBook[];
  nextStart: number | null;
  blocked: boolean;
  reachedEnd: boolean;
  pagesFetched: number;
  partialError?: string;
}

export interface DoulistSettings {
  doulistEnrichMode: 'none' | 'smart' | 'full';
  doulistEnrichSource: 'dbr' | 'doubanapi' | 'booksource';
  doulistDelay: number;
  doulistMaxPages: number;
  /** 书单页是否隐藏已加入书架（划去）的书：0 | 1 */
  doulistHideShelved: number;
}

export interface DoulistBook {
  id: number;
  douban_id: string;
  title: string | null;
  subtitle: string | null;
  author: string | null;
  translator: string | null;
  publisher: string | null;
  publish_year: string | null;
  isbn13: string | null;
  isbn10: string | null;
  pages: number | null;
  price: number | null;
  binding: string | null;
  producer: string | null;
  series: string | null;
  rating: number | null;
  rating_count: number | null;
  tags: string | null;
  summary: string | null;
  cover_url: string | null;
  douban_url: string | null;
  enrich_status: string;
  enriched_at: string | null;
  /** pending 未入书架 / shelf 已加入书架（划线折叠） */
  shelf_status: string;
  shelved_at: string | null;
  /** 阅读状态（阅读清单用）：unread 未读 / reading 在读 / read 已读 */
  read_status: 'unread' | 'reading' | 'read' | null;
  /** 所属书单信息（书籍必须属于一个书单） */
  doulist_id: string | null;
  doulist_title: string | null;
  /** 主书单双分类标志：1 = 勾选 */
  list_is_buy: number | null;
  list_is_read: number | null;
  /** 书库状态（实时取自书库）：1 = 已入库 */
  on_shelf: number | null;
  library_book_id: number | null;
  /** 书库阅读状态（中文）：未读 / 在读 / 已读；未入库时为 null */
  library_read_status: string | null;
  /** 豆列中的加入时间（默认排序依据） */
  list_added_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoulistImportRecord {
  id: number;
  doulist_id: string;
  doulist_title: string | null;
  owner: string | null;
  owner_url: string | null;
  status: string;
  /** 书单双分类标志：1 = 勾选（至少一个为 1） */
  is_buy: number | null;
  is_read: number | null;
  fetched_items: number;
  item_count: number;
  /** 断点续跑：上次抓到的下一页偏移，0 表示无进行中的抓取 */
  last_start: number;
  /** 前 4 张书籍封面 URL，用 | 分隔（文件夹缩略图用） */
  covers: string | null;
  /** 购书清单进度：已购买（匹配到书库）/ 总数；未勾选购书分类时为 0 */
  buy_done: number;
  buy_total: number;
  /** 阅读清单进度：已阅读（书内已读 或 书库已读）/ 总数；未勾选阅读分类时为 0 */
  read_done: number;
  read_total: number;
  updated_at: string;
}

/**
 * 豆瓣封面图走后端中转（解决防盗链）
 * https://img1.doubanio.com/view/subject/l/public/s29950059.jpg → /api/douban/cover/s29950059
 */
export function doubanCoverProxy(coverUrl: string | null | undefined): string | undefined {
  if (!coverUrl) return undefined;
  const match = String(coverUrl).match(/\/view\/subject\/[a-z]+\/public\/(.+?)\.(jpg|png|webp)/i);
  if (match) return `/api/douban/cover/${match[1]}`;
  return coverUrl;
}

export const doulistApi = {
  /**
   * 抓取预览（不落库）。每页 25 本，从 start 偏移开始抓 maxPages 页。
   * 前端从 start=0 开始循环调用直到 reachedEnd / blocked，实现实时进度。
   */
  preview: (input: string, start = 0, maxPages = 1): Promise<DoulistPreviewResult> =>
    apiClient.post('/doulist/preview', { input, start, maxPages }),

  getSettings: (): Promise<{ ok: boolean; data: DoulistSettings }> =>
    apiClient.get('/doulist/settings'),

  saveSettings: (settings: Partial<DoulistSettings>): Promise<{ ok: boolean; data: DoulistSettings }> =>
    apiClient.post('/doulist/settings', settings),

  /**
   * 补全（可选）。mode=none 时不发任何请求。
   */
  enrich: (doubanIds: string[], mode?: string, source?: string): Promise<{
    ok: boolean;
    mode: string;
    source: string;
    items: Array<{ doubanId: string; ok: boolean; fields?: any; error?: string }>;
    failed: number;
  }> => apiClient.post('/doulist/enrich', { doubanIds, mode, source }),

  /**
   * 导入：以 douban_id 为唯一键写入独立豆列表
   * incremental=true 为增量刷新：已在该书单里的书不做任何更改
   */
  import: (books: DoulistPreviewBook[], doulist: DoulistMeta, incremental = false): Promise<{
    ok: boolean;
    imported: number;
    duplicates: number;
  }> => apiClient.post('/doulist/import', { books, doulist, incremental }),

  /**
   * 豆列书单列表（支持分类/书架状态筛选与关键字搜索，默认按加入时间倒序）
   */
  books: (params?: {
    doulistId?: string;
    category?: 'buy' | 'read';
    status?: 'pending' | 'shelf';
    hideShelved?: boolean;
    page?: number;
    pageSize?: number;
    keyword?: string;
    /** 排序：createTime(默认加入时间倒序) / rating / title / author */
    sortBy?: string;
  }): Promise<{
    ok: boolean;
    total: number;
    page: number;
    pageSize: number;
    data: DoulistBook[];
  }> => {
    const query = new URLSearchParams();
    if (params?.doulistId) query.set('doulistId', params.doulistId);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.hideShelved) query.set('hideShelved', '1');
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    const qs = query.toString();
    return apiClient.get(`/doulist/books${qs ? `?${qs}` : ''}`);
  },

  /**
   * 创建空书单（不添加任何书籍）
   */
  createDoulist: (data: {
    doulistTitle: string;
    isBuy?: number;
    isRead?: number;
  }): Promise<{ ok: boolean; doulistId: string }> =>
    apiClient.post('/doulist/imports', data),

  /**
   * 手动添加一本书到书单（不来自豆列抓取）
   * 书籍必须归属一个书单：doulistId 选已有书单，或 doulistTitle 新建本地书单
   * doubanRef 可为豆瓣链接或纯数字 ID；不填则后端生成本地 ID
   */
  createBook: (book: {
    title: string;
    author?: string;
    publisher?: string;
    publishYear?: string;
    isbn13?: string;
    doubanRef?: string;
    doulistId?: string;
    doulistTitle?: string;
    isBuy?: number;
    isRead?: number;
  }): Promise<{ ok: boolean; created: boolean; doubanId: string; doulistId: string }> =>
    apiClient.post('/doulist/books', book),

  /**
   * 加入 / 撤回书架（加入书架后书单页划线折叠展示）
   */
  setShelf: (doubanId: string, status: 'shelf' | 'pending'): Promise<{ ok: boolean }> =>
    apiClient.post(`/doulist/books/${doubanId}/shelf`, { status }),

  /**
   * 检查某本豆列书在本地书库是否已存在（按 ISBN）
   * 用于「加入书架」按钮置灰判断；已入库时附书库阅读状态（中文）
   */
  shelfCheck: (doubanId: string): Promise<{ ok: boolean; exists: boolean; bookId?: number; readStatus?: string | null }> =>
    apiClient.get(`/doulist/books/${doubanId}/shelf-check`),

  /**
   * 设置阅读状态（阅读清单用：未读 / 在读 / 已读）
   */
  setReadStatus: (doubanId: string, status: 'unread' | 'reading' | 'read'): Promise<{ ok: boolean }> =>
    apiClient.post(`/doulist/books/${doubanId}/read-status`, { status }),

  /**
   * 入库衔接点：加入书架成功后，把书单阅读状态一次性写入书库（此后书库为权威）
   */
  applyReadStatus: (doubanId: string): Promise<{ ok: boolean; bookId?: number; readStatus?: string }> =>
    apiClient.post(`/doulist/books/${doubanId}/apply-read-status`),

  /**
   * 设置书单双分类标志（isBuy 购书清单 / isRead 阅读清单），至少勾选一个
   */
  setDoulistCategories: (doulistId: string, isBuy: boolean, isRead: boolean): Promise<{ ok: boolean }> =>
    apiClient.put(`/doulist/imports/${doulistId}`, { isBuy, isRead }),

  /**
   * 导入记录
   */
  imports: (): Promise<{ ok: boolean; data: DoulistImportRecord[] }> =>
    apiClient.get('/doulist/imports'),

  /**
   * 保存抓取进度（断点续跑）
   * lastStart > 0 标记进行中；传 0 表示抓取完成/放弃（清除续传标记）
   */
  saveProgress: (doulistId: string, progress: {
    lastStart?: number;
    fetchedItems?: number;
    title?: string | null;
    owner?: string | null;
    ownerUrl?: string | null;
  }): Promise<{ ok: boolean }> =>
    apiClient.post(`/doulist/imports/${doulistId}/progress`, progress)
};

export default doulistApi;
