import { bookApi, groupApi, tagApi } from '@/services/apiClient';
import { downloadBookCover } from '@/utils/imageUtils';
import { fileService } from '@/services/fileService';
import { useProgressStore } from '@/store/progress';
import {
  Book,
  BookGroup,
  Tag,
  BookQueryParams,
  BookQueryResult,
  BookService,
  ReadingState
} from './types';

// 生成当前时间
export const getCurrentTime = (): string => new Date().toISOString();

// 书籍服务实现
class BookServiceImpl implements BookService {
  // 书籍管理
  async addBook(book: Omit<Book, 'id' | 'createTime' | 'updateTime'>): Promise<Book> {
    const progressStore = useProgressStore();

    console.log('📝 开始添加书籍:', book.title);
    console.log('🖼️  原始封面信息:', {
      coverUrl: book.coverUrl,
      hasBlob: !!((book as any)._coverBlob)
    });

    // 确保tags和groups是字符串数组
    let safeBookData = {
      ...book,
      // 确保tags是字符串数组
      tags: Array.isArray(book.tags) ? book.tags.map(tag => String(tag)) : [],
      // 确保groups是字符串数组
      groups: Array.isArray(book.groups) ? book.groups.map(group => String(group)) : [],
      // 确保数字字段是数字类型
      publishYear: typeof book.publishYear === 'number' ? book.publishYear : undefined,
      pages: typeof book.pages === 'number' ? book.pages : undefined,
      purchasePrice: typeof book.purchasePrice === 'number' ? book.purchasePrice : undefined,
      standardPrice: typeof book.standardPrice === 'number' ? book.standardPrice : undefined,
      rating: typeof book.rating === 'number' ? book.rating : undefined,
      // 确保书籍类型和装帧是数字类型
      book_type: typeof book.book_type === 'number' ? book.book_type : 1,
      binding1: typeof book.binding1 === 'number' ? book.binding1 : 0,
      binding2: typeof book.binding2 === 'number' ? book.binding2 : 0
    };

    // 提取并移除临时的 _coverBlob 字段
    const coverBlob = (safeBookData as any)._coverBlob;
    delete (safeBookData as any)._coverBlob;

    // 初始化进度（使用ISBN或临时占位符，实际ID会在创建后更新）
    const tempBookId = book.isbn || 'temp-' + Date.now();
    progressStore.initBookProgress(tempBookId);

    try {
      // 更新进度：正在创建书籍
      progressStore.updateBookProgress(tempBookId, 20, '正在创建书籍...');

      // 先创建书籍，不包含封面图片
      const newBook = await bookApi.create(safeBookData);

      // 更新进度：书籍创建成功
      progressStore.updateBookProgress(tempBookId, 40, '书籍创建成功，正在处理封面...');

      // 处理封面：优先级 1. ZIP中的Blob > 2. 外部URL
      if (coverBlob && newBook.id) {
        // 方式1：从ZIP导入的封面Blob，直接上传
        console.log('📤 使用ZIP中的封面Blob，直接上传');
        try {
          await this.uploadCoverBlob(newBook.id, coverBlob);
          console.log('✅ 封面上传成功');
        } catch (error) {
          console.error('❌ 上传封面Blob失败:', error);
        }
      } else if (book.coverUrl) {
        // 方式2：从URL下载封面
        console.log('🔄 从URL下载封面');
        try {
          await downloadBookCover(newBook.id, book.coverUrl);
          console.log('✅ 封面下载成功');
        } catch (error) {
          console.error('❌ 下载封面图片时出错:', error);
        }
      }

      // 更新进度：封面处理完成
      progressStore.updateBookProgress(tempBookId, 70, '封面处理完成...');

      // 完成进度
      progressStore.completeBookProgress(tempBookId, '书籍添加完成');

      return newBook;
    } catch (error) {
      console.error('❌ 添加书籍失败:', error);
      progressStore.completeBookProgress(tempBookId, `添加失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 上传封面Blob到服务器
   * @param bookId 书籍ID
   * @param blob 封面图片Blob对象
   * @returns Promise<void> 上传成功
   */
  private async uploadCoverBlob(bookId: number, blob: Blob): Promise<void> {
    // 将Blob转换为File对象
    const fileName = `cover_${bookId}_${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

    // 使用现有的bookApi.uploadCover方法
    try {
      await bookApi.uploadCover(bookId, file);
      console.log('✅ 封面上传成功');
    } catch (error) {
      console.error('❌ 上传封面Blob失败:', error);
      throw error;
    }
  }

  async updateBook(book: Book): Promise<Book> {
    console.log('🔄 updateBook 开始，原始book.id:', book.id, '类型:', typeof book.id);

    // 确保tags和groups是字符串数组
    const safeBookData = {
      ...book,
      // 确保tags是字符串数组
      tags: Array.isArray(book.tags) ? book.tags.map(tag => String(tag)) : [],
      // 确保groups是字符串数组
      groups: Array.isArray(book.groups) ? book.groups.map(group => String(group)) : [],
      // 确保数字字段是数字类型
      publishYear: typeof book.publishYear === 'number' ? book.publishYear : undefined,
      pages: typeof book.pages === 'number' ? book.pages : undefined,
      purchasePrice: typeof book.purchasePrice === 'number' ? book.purchasePrice : undefined,
      standardPrice: typeof book.standardPrice === 'number' ? book.standardPrice : undefined,
      rating: typeof book.rating === 'number' ? book.rating : undefined,
      // 确保书籍类型和装帧是数字类型
      book_type: typeof book.book_type === 'number' ? book.book_type : 1,
      binding1: typeof book.binding1 === 'number' ? book.binding1 : 0,
      binding2: typeof book.binding2 === 'number' ? book.binding2 : 0
    };

    console.log('🔄 safeBookData.id:', safeBookData.id, '类型:', typeof safeBookData.id);
    console.log('🔄 要更新的数据:', {
      id: safeBookData.id,
      title: safeBookData.title,
      author: safeBookData.author,
      tags: safeBookData.tags
    });

    // 使用API更新书籍，确保ID是数字
    const bookId = typeof book.id === 'string' ? parseInt(book.id, 10) : book.id;
    console.log('🔄 使用的bookId:', bookId, '类型:', typeof bookId);

    const updatedBook = await bookApi.update(bookId, safeBookData);

    console.log('🔄 更新成功，返回的book.id:', updatedBook.id);
    return updatedBook;
  }

  async deleteBook(id: number): Promise<void> {
    try {
      console.log(`🗑️ 开始删除书籍，ID: ${id}`);

      // 使用API删除书籍
      await bookApi.delete(id);
      console.log(`✅ 书籍删除成功`);
    } catch (error) {
      console.error('❌ 删除书籍失败:', error);
      throw error;
    }
  }

  async getBookById(id: number): Promise<Book | undefined> {
    return bookApi.getById(id);
  }

  async getBooks(params?: BookQueryParams): Promise<BookQueryResult> {
    // 使用API搜索书籍
    const books = await bookApi.search(params);
    
    // 处理分页
    const pageNum = params?.pageNum || 1;
    const pageSize = params?.pageSize || 20;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const paginatedBooks = books.slice(start, end);
    
    return {
      list: paginatedBooks,
      total: books.length,
      pageNum,
      pageSize,
      pages: Math.ceil(books.length / pageSize)
    };
  }

  async getAllBooks(readerId?: number): Promise<Book[]> {
    return bookApi.getAll(readerId);
  }

  async batchAddBooks(books: Omit<Book, 'id' | 'createTime' | 'updateTime'>[]): Promise<Book[]> {
    const progressStore = useProgressStore();
    const addedBooks: Book[] = [];

    console.log(`📚 开始批量添加书籍，共 ${books.length} 本`);

    // 初始化批量进度
    progressStore.startBatch(books.length);

    try {
      // 第一阶段：创建所有书籍（不立即上传封面）
      const booksWithCovers: Array<{ book: Book; coverBlob?: Blob; coverUrl?: string }> = [];

      for (let i = 0; i < books.length; i++) {
        const book = books[i];
        try {
          // 提取封面Blob（如果有的话）
          const coverBlob = (book as any)._coverBlob;
          const coverUrl = book.coverUrl;

          // 移除 _coverBlob 字段，避免上传到服务器
          const safeBookData = { ...book };
          delete (safeBookData as any)._coverBlob;

          console.log(`📝 [${i + 1}/${books.length}] 创建书籍: ${book.title}`);

          // 创建书籍（不包含封面）
          const newBook = await bookApi.create(safeBookData);
          addedBooks.push(newBook);

          // 保存封面信息，稍后批量上传
          booksWithCovers.push({
            book: newBook,
            coverBlob: coverBlob,
            coverUrl: coverUrl
          });

          console.log(`✅ [${i + 1}/${books.length}] 书籍创建成功: ${newBook.title} (ID: ${newBook.id})`);
        } catch (error) {
          console.error(`❌ [${i + 1}/${books.length}] 创建书籍失败: ${book.title}`, error);
        }
      }

      console.log(`✅ 第一阶段完成：成功创建 ${addedBooks.length}/${books.length} 本书`);

      // 等待数据库事务完全提交（WAL模式需要时间）
      console.log(`⏳ 等待数据库事务提交...`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // 第二阶段：批量上传封面
      console.log(`📤 开始批量上传封面...`);

      for (let i = 0; i < booksWithCovers.length; i++) {
        const { book, coverBlob, coverUrl } = booksWithCovers[i];

        try {
          if (coverBlob) {
            console.log(`📤 [${i + 1}/${booksWithCovers.length}] 上传封面Blob: ${book.title}`);
            await this.uploadCoverBlob(book.id, coverBlob);
            console.log(`✅ [${i + 1}/${booksWithCovers.length}] 封面上传成功: ${book.title}`);
          } else if (coverUrl) {
            console.log(`🔄 [${i + 1}/${booksWithCovers.length}] 下载封面: ${book.title}`);
            await downloadBookCover(book.id, coverUrl);
            console.log(`✅ [${i + 1}/${booksWithCovers.length}] 封面下载成功: ${book.title}`);
          }
        } catch (error) {
          console.error(`⚠️ [${i + 1}/${booksWithCovers.length}] 封面处理失败: ${book.title}`, error);
          // 封面失败不影响整体导入，继续处理下一本
        }
      }

      console.log(`✅ 第二阶段完成：封面处理完成`);

      console.log(`✅ 批量添加完成，成功添加 ${addedBooks.length}/${books.length} 本`);
      return addedBooks;
    } finally {
      // 确保批量进度正确结束
      if (progressStore.batchProgress.active) {
        progressStore.resetBatchProgress();
      }
    }
  }

  // 分组管理
  async addGroup(group: Omit<BookGroup, 'id' | 'bookCount'>): Promise<BookGroup> {
    return groupApi.create(group);
  }

  async updateGroup(group: BookGroup): Promise<BookGroup> {
    return groupApi.update(group.id, group);
  }

  async deleteGroup(id: string): Promise<void> {
    await groupApi.delete(id);
  }

  async getGroupById(id: string): Promise<BookGroup | undefined> {
    return groupApi.getById(id);
  }

  async getAllGroups(): Promise<BookGroup[]> {
    return groupApi.getAll();
  }

  // 标签管理
  async getAllTags(): Promise<string[]> {
    return tagApi.getAll();
  }

  // 阅读状态管理
  async getReadingState(bookId: number, readerId?: number): Promise<ReadingState> {
    return bookApi.getReadingState(bookId, readerId);
  }

  async updateReadingState(bookId: number, readingState: Partial<ReadingState>, readerId?: number): Promise<ReadingState> {
    return bookApi.updateReadingState(bookId, readingState, readerId);
  }

  async updateReadingProgress(bookId: number, readPages: number): Promise<{ bookId: number; readPages: number }> {
    return bookApi.updateReadingProgress(bookId, readPages);
  }
}

// 导出单例实例
export const bookService: BookService = new BookServiceImpl();
