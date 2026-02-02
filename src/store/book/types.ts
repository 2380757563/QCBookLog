export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  pages?: number;
  read_pages?: number; // 已读页数
  binding1?: number;
  binding2?: number;
  book_type: number;
  coverUrl?: string;
  localCoverData?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  standardPrice?: number;
  readStatus: '未读' | '在读' | '已读';
  readCompleteDate?: string;
  rating?: number;
  tags: string[];
  groups: string[];
  series?: string;
  note?: string;
  description?: string;
  createTime: string;
  updateTime: string;
}

export interface BookState {
  books: Book[];
  loading: boolean;
  error: string | null;
  currentBook: Book | null;
  layout: 'grid' | 'list';
}

export interface BookGroup {
  id: string;
  name: string;
  sort: number;
  parentId: string | null;
  bookCount: number;
}
