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

export interface BookmarkState {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  currentBookmark: Bookmark | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  type: 'book' | 'bookmark';
  count: number;
}
