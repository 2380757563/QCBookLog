import { bookmarkApi } from '@/services/apiClient';
import { 
  Bookmark, 
  BookmarkQueryParams, 
  BookmarkQueryResult, 
  BookmarkService 
} from './types';

// 书摘服务实现
class BookmarkServiceImpl implements BookmarkService {
  // 书摘管理
  async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createTime' | 'updateTime'>): Promise<Bookmark> {
    return bookmarkApi.create(bookmark);
  }

  async updateBookmark(bookmark: Bookmark): Promise<Bookmark> {
    return bookmarkApi.update(bookmark.id, bookmark);
  }

  async deleteBookmark(id: string | number): Promise<void> {
    await bookmarkApi.delete(String(id));
  }

  async getBookmarkById(id: string | number): Promise<Bookmark | undefined> {
    return bookmarkApi.getById(String(id));
  }

  async getBookmarks(params?: BookmarkQueryParams): Promise<BookmarkQueryResult> {
    // 使用API获取书签
    const bookmarks = await bookmarkApi.getAll(params?.bookId);
    
    // 处理分页
    const pageNum = params?.pageNum || 1;
    const pageSize = params?.pageSize || 20;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const paginatedBookmarks = bookmarks.slice(start, end);
    
    return {
      list: paginatedBookmarks,
      total: bookmarks.length,
      pageNum,
      pageSize,
      pages: Math.ceil(bookmarks.length / pageSize)
    };
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
    return bookmarkApi.getAll();
  }

  async batchAddBookmarks(bookmarks: Omit<Bookmark, 'id' | 'createTime' | 'updateTime'>[]): Promise<Bookmark[]> {
    // 使用API批量导入书签
    const result = await bookmarkApi.import(bookmarks);
    return result.bookmarks || [];
  }

  async getBookmarksByBookId(bookId: number): Promise<Bookmark[]> {
    return bookmarkApi.getAll(bookId);
  }

  async deleteBookmarksByBookId(bookId: number): Promise<void> {
    const bookmarks = await this.getBookmarksByBookId(bookId);

    for (const bookmark of bookmarks) {
      await this.deleteBookmark(bookmark.id);
    }
  }
}

// 导出单例实例
export const bookmarkService: BookmarkService = new BookmarkServiceImpl();
