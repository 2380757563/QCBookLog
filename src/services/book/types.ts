export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  pages?: number;
  binding1?: number;
  binding2?: number;
  paper1?: number;
  edge1?: number;
  edge2?: number;
  book_type: number;
  coverUrl?: string;
  localCoverData?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  standardPrice?: number;
  readStatus: '未读' | '在读' | '已读';
  readCompleteDate?: string;
  rating?: number;
  personal_rating?: number;
  personal_rating_date?: string | null;
  tags: string[];
  groups: string[];
  series?: string;
  calibreTags?: string[];
  note?: string;
  description?: string;
  createTime: string;
  updateTime: string;
  total_reading_time?: number;
  read_pages?: number;
  reading_count?: number;
  last_read_date?: string | null;
  last_read_duration?: number;
  favorite?: number;
  favorite_date?: string | null;
  wants?: number;
  wants_date?: string | null;
}

export interface BookGroup {
  id: string;
  name: string;
  sort: number;
  parentId: string | null;
  bookCount: number;
}

export type Tag = string;

export interface BookQueryParams {
  keyword?: string;
  readStatus?: '未读' | '在读' | '已读';
  groupId?: string;
  tagId?: string;
  publisher?: string;
  author?: string;
  publishYear?: number;
  sortBy?: 'createTime' | 'updateTime' | 'title' | 'author';
  sortOrder?: 'asc' | 'desc';
  pageNum?: number;
  pageSize?: number;
}

export interface BookQueryResult {
  list: Book[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export interface ReadingState {
  book_id: number;
  reader_id: number;
  favorite: number;
  favorite_date: string | null;
  wants: number;
  wants_date: string | null;
  read_state: number; // 0:未读, 1:在读, 2:已读
  read_date: string | null;
  online_read: number;
  download: number;
}

export interface BookService {
  // 书籍管理
  addBook(book: Omit<Book, 'id' | 'createTime' | 'updateTime'>): Promise<Book>;
  updateBook(book: Book, readerId?: number): Promise<Book>;
  deleteBook(id: number): Promise<void>;
  getBookById(id: number): Promise<Book | undefined>;
  getBooks(params?: BookQueryParams): Promise<BookQueryResult>;
  getAllBooks(readerId?: number): Promise<Book[]>;
  batchAddBooks(books: Omit<Book, 'id' | 'createTime' | 'updateTime'>[]): Promise<Book[]>;

  // 分组管理
  addGroup(group: Omit<BookGroup, 'id' | 'bookCount'>): Promise<BookGroup>;
  updateGroup(group: BookGroup): Promise<BookGroup>;
  deleteGroup(id: string): Promise<void>;
  getGroupById(id: string): Promise<BookGroup | undefined>;
  getAllGroups(): Promise<BookGroup[]>;

  // 标签管理
  getAllTags(): Promise<string[]>;
  getTags(bookId: number): Promise<string[]>;

  // 阅读状态管理
  getReadingState(bookId: number, readerId?: number): Promise<ReadingState>;
  updateReadingState(bookId: number, readingState: Partial<ReadingState>, readerId?: number): Promise<ReadingState>;
  updateReadingProgress(bookId: number, readPages: number): Promise<{ bookId: number; readPages: number }>;
}
