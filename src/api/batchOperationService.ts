/**
 * 批量操作服务
 * 提供批量操作书籍和书签的功能
 */

import { apiClient } from './apiClient-enhanced';

/**
 * 批量操作结果接口
 */
export interface BatchOperationResult {
  success: boolean;
  message: string;
  details: {
    success: number;
    failed: number;
    errors: Array<{ id: number; error: string }>;
  };
}

/**
 * 批量操作书籍接口
 */
export interface BatchBookOperation {
  bookIds: number[];
  groupId?: string;
  tags?: string[];
  source?: string;
}

/**
 * 批量操作书签接口
 */
export interface BatchBookmarkOperation {
  bookmarkIds: string[];
  tags?: string[];
}

/**
 * 批量操作服务类
 */
class BatchOperationService {
  /**
   * 批量添加书籍到分组
   */
  async addBooksToGroup(bookIds: number[], groupId: string): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/add-to-group', {
        bookIds,
        groupId
      });

      return {
        success: true,
        message: `成功将 ${response.success} 本书籍添加到分组`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `添加书籍到分组失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量从分组移除书籍
   */
  async removeBooksFromGroup(bookIds: number[], groupId: string): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/remove-from-group', {
        bookIds,
        groupId
      });

      return {
        success: true,
        message: `成功从分组移除 ${response.success} 本书籍`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `从分组移除书籍失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量为书籍添加标签
   */
  async addTagsToBooks(bookIds: number[], tags: string[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/add-tags', {
        bookIds,
        tags
      });

      return {
        success: true,
        message: `成功为 ${response.success} 本书籍添加标签`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `添加标签失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量移除书籍标签
   */
  async removeTagsFromBooks(bookIds: number[], tags: string[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/remove-tags', {
        bookIds,
        tags
      });

      return {
        success: true,
        message: `成功从 ${response.success} 本书籍移除标签`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `移除标签失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量设置书籍来源
   */
  async setBookSource(bookIds: number[], source: string): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/set-source', {
        bookIds,
        source
      });

      return {
        success: true,
        message: `成功设置 ${response.success} 本书籍的来源`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `设置书籍来源失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量删除书籍
   */
  async deleteBooks(bookIds: number[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/delete', {
        bookIds
      });

      return {
        success: true,
        message: `成功删除 ${response.success} 本书籍`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `删除书籍失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量导出书籍
   */
  async exportBooks(bookIds: number[]): Promise<Blob | null> {
    try {
      const response = await apiClient.post('/books/batch/export', {
        bookIds
      }, undefined, 'blob');

      return response;
    } catch (error: any) {
      console.error('导出书籍失败:', error);
      return null;
    }
  }

  /**
   * 批量为书签添加标签
   */
  async addTagsToBookmarks(bookmarkIds: string[], tags: string[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/bookmarks/batch/add-tags', {
        bookmarkIds,
        tags
      });

      return {
        success: true,
        message: `成功为 ${response.success} 条书签添加标签`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `添加标签失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookmarkIds.length,
          errors: bookmarkIds.map(id => ({ id: Number(id), error: error.message }))
        }
      };
    }
  }

  /**
   * 批量删除书签
   */
  async deleteBookmarks(bookmarkIds: string[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/bookmarks/batch/delete', {
        bookmarkIds
      });

      return {
        success: true,
        message: `成功删除 ${response.success} 条书签`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `删除书签失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookmarkIds.length,
          errors: bookmarkIds.map(id => ({ id: Number(id), error: error.message }))
        }
      };
    }
  }

  /**
   * 批量导入书签
   */
  async importBookmarks(bookmarks: any[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/bookmarks/import', {
        bookmarks
      });

      return {
        success: true,
        message: `成功导入 ${response.success} 条书签`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `导入书签失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookmarks.length,
          errors: bookmarks.map((_, index) => ({ id: index, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量更新阅读状态
   */
  async updateReadingState(bookIds: number[], state: {
    readPages?: number;
    status?: string;
    lastReadDate?: string;
  }): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/update-reading-state', {
        bookIds,
        ...state
      });

      return {
        success: true,
        message: `成功更新 ${response.success} 本书籍的阅读状态`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `更新阅读状态失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量更新书籍封面
   */
  async updateBookCovers(bookIds: number[], coverFile: File): Promise<BatchOperationResult> {
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      formData.append('bookIds', JSON.stringify(bookIds));

      const response = await apiClient.post('/books/batch/update-covers', formData, {
        headers: {}
      });

      return {
        success: true,
        message: `成功更新 ${response.success} 本书籍的封面`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `更新封面失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量删除书籍封面
   */
  async deleteBookCovers(bookIds: number[]): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/delete-covers', {
        bookIds
      });

      return {
        success: true,
        message: `成功删除 ${response.success} 本书籍的封面`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `删除封面失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量更新书籍分类
   */
  async updateBookCategories(bookIds: number[], category: string): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/update-category', {
        bookIds,
        category
      });

      return {
        success: true,
        message: `成功更新 ${response.success} 本书籍的分类`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `更新分类失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量标记书籍为已读/未读
   */
  async markBooksAsRead(bookIds: number[], read: boolean): Promise<BatchOperationResult> {
    try {
      const response = await apiClient.post('/books/batch/mark-read', {
        bookIds,
        read
      });

      return {
        success: true,
        message: `成功标记 ${response.success} 本书籍为${read ? '已读' : '未读'}`,
        details: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: `标记书籍失败: ${error.message}`,
        details: {
          success: 0,
          failed: bookIds.length,
          errors: bookIds.map(id => ({ id, error: error.message }))
        }
      };
    }
  }

  /**
   * 批量导出书签
   */
  async exportBookmarks(bookmarkIds: string[]): Promise<Blob | null> {
    try {
      const response = await apiClient.post('/bookmarks/batch/export', {
        bookmarkIds
      }, undefined, 'blob');

      return response;
    } catch (error: any) {
      console.error('导出书签失败:', error);
      return null;
    }
  }
}

// 创建并导出服务实例
export default new BatchOperationService();
