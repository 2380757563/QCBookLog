export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  pages?: number;
  read_pages?: number;
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
  tags: string[];
  groups: string[];
  series?: string;
  calibreTags?: string[];
  note?: string;
  description?: string;
  createTime: string;
  updateTime: string;
  total_reading_time?: number;
  reading_count?: number;
  last_read_date?: string | null;
  last_read_duration?: number;
  favorite?: number;
  favorite_date?: string | null;
  wants?: number;
  wants_date?: string | null;
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
