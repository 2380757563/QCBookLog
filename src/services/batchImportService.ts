/**
 * 批量导入服务
 * 用于批量导入书籍到书库
 */

import { bookService } from './book';
import type { Book } from './book/types';

export interface BatchImportItem {
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  pages?: number;
  binding?: string;
  coverUrl?: string;
  price?: string;
  description?: string;
  source: string;
}

export interface BatchImportResult {
  total: number;
  success: number;
  failed: number;
  failedItems: Array<{ isbn: string; title: string; error: string }>;
}

export interface BatchImportProgress {
  current: number;
  total: number;
  currentBook: string;
  percent: number;
}

/**
 * 批量导入服务
 */
export class BatchImportService {
  private progressCallback: ((progress: BatchImportProgress) => void) | null = null;

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (progress: BatchImportProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 导入单个书籍
   */
  private async importSingleBook(item: BatchImportItem): Promise<{ success: boolean; error?: string }> {
    try {
      const bookData = {
        isbn: item.isbn,
        title: item.title,
        author: item.author,
        publisher: item.publisher || '',
        publishYear: item.publishYear ? parseInt(item.publishYear.toString()) : undefined,
        pages: item.pages,
        binding: parseInt(item.binding || '0') || 0,
        book_type: 1,
        coverUrl: item.coverUrl || '',
        purchaseDate: undefined,
        purchasePrice: undefined,
        standardPrice: item.price ? parseFloat(item.price) : undefined,
        readStatus: '未读' as const,
        readCompleteDate: undefined,
        rating: undefined,
        tags: [],
        groups: [],
        series: undefined,
        note: '',
        description: item.description || ''
      };

      const newBook = await bookService.addBook(bookData);
      return { success: true };
    } catch (error) {
      console.error(`导入书籍失败 [${item.isbn}]:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 批量导入书籍
   */
  async batchImport(
    items: BatchImportItem[],
    delay: number = 300
  ): Promise<BatchImportResult> {
    const result: BatchImportResult = {
      total: items.length,
      success: 0,
      failed: 0,
      failedItems: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 更新进度
      if (this.progressCallback) {
        this.progressCallback({
          current: i + 1,
          total: items.length,
          currentBook: item.title,
          percent: Math.round(((i + 1) / items.length) * 100)
        });
      }

      // 导入单个书籍
      const importResult = await this.importSingleBook(item);

      if (importResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.failedItems.push({
          isbn: item.isbn,
          title: item.title,
          error: importResult.error || '未知错误'
        });
      }

      // 延迟避免请求过快
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return result;
  }

  /**
   * 去除重复的ISBN
   */
  removeDuplicates(items: BatchImportItem[]): BatchImportItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.isbn)) {
        return false;
      }
      seen.add(item.isbn);
      return true;
    });
  }

  /**
   * 验证ISBN格式
   */
  validateISBN(isbn: string): boolean {
    const cleanIsbn = isbn.replace(/[\s-]/g, '');
    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
      return false;
    }
    return /^\d+$/.test(cleanIsbn) || /^\d+X$/.test(cleanIsbn.toUpperCase());
  }

  /**
   * 过滤有效的ISBN
   */
  filterValidIsbns(items: BatchImportItem[]): BatchImportItem[] {
    return items.filter(item => this.validateISBN(item.isbn));
  }
}

// 导出单例实例
export const batchImportService = new BatchImportService();
export default batchImportService;
