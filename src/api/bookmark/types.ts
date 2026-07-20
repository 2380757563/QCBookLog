export interface Bookmark {
  id: string | number;
  bookId: number;
  bookTitle?: string;
  bookAuthor?: string;
  content: string;
  note?: string;
  pageNum?: number;
  page?: number;
  tags: string[];
  importSource?: string;
  createTime: string;
  updateTime: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookmarkQueryParams {
  keyword?: string;
  bookId?: number;
  tagId?: string;
  importSource?: string;
  sortBy?: 'createTime' | 'updateTime';
  sortOrder?: 'asc' | 'desc';
  pageNum?: number;
  pageSize?: number;
}

export interface BookmarkQueryResult {
  list: Bookmark[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export interface BookmarkService {
  // 书摘管理
  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createTime' | 'updateTime'>): Promise<Bookmark>;
  updateBookmark(bookmark: Bookmark): Promise<Bookmark>;
  deleteBookmark(id: string | number): Promise<void>;
  getBookmarkById(id: string | number): Promise<Bookmark | undefined>;
  getBookmarks(params?: BookmarkQueryParams): Promise<BookmarkQueryResult>;
  getAllBookmarks(): Promise<Bookmark[]>;
  batchAddBookmarks(bookmarks: Omit<Bookmark, 'id' | 'createTime' | 'updateTime'>[]): Promise<Bookmark[]>;
  getBookmarksByBookId(bookId: number): Promise<Bookmark[]>;
  deleteBookmarksByBookId(bookId: number): Promise<void>;
}
