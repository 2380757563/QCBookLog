/**
 * 愿望清单服务
 * 用于管理愿望清单数据的 API 调用
 */

import { apiClient } from './apiClient';

export interface WishlistItem {
  id: number;
  readerId: number;
  isbn: string;
  title: string | null;
  author: string | null;
  notes: string | null;
  created_at: string;
}

class WishlistService {
  /**
   * 获取愿望清单
   */
  async getWishlist(readerId?: number): Promise<WishlistItem[]> {
    const params = readerId !== undefined ? `?readerId=${readerId}` : '';
    const response = await apiClient.get(`/wishlist${params}`);
    return response;
  }

  /**
   * 添加到愿望清单
   */
  async addToWishlist(item: {
    isbn: string;
    title?: string;
    author?: string;
    notes?: string;
  }, readerId?: number): Promise<WishlistItem> {
    const response = await apiClient.post('/wishlist', {
      readerId,
      ...item
    });
    return response;
  }

  /**
   * 更新愿望清单项
   */
  async updateWishlistItem(
    wishlistId: number,
    updates: {
      title?: string;
      author?: string;
      notes?: string;
    }
  ): Promise<WishlistItem> {
    const response = await apiClient.put(`/wishlist/${wishlistId}`, updates);
    return response;
  }

  /**
   * 从愿望清单中移除
   */
  async removeFromWishlist(isbn: string, readerId?: number): Promise<{ success: boolean; message: string }> {
    const params = readerId !== undefined ? `?readerId=${readerId}` : '';
    const response = await apiClient.delete(`/wishlist/${isbn}${params}`);
    return response;
  }

  /**
   * 检查是否在愿望清单中
   */
  async isInWishlist(isbn: string, readerId?: number): Promise<boolean> {
    const wishlist = await this.getWishlist(readerId);
    return wishlist.some(item => item.isbn === isbn);
  }

  /**
   * 批量添加到愿望清单
   */
  async addMultipleToWishlist(
    items: Array<{
      isbn: string;
      title?: string;
      author?: string;
      notes?: string;
    }>,
    readerId?: number
  ): Promise<WishlistItem[]> {
    const promises = items.map(item => this.addToWishlist(item, readerId));
    return Promise.all(promises);
  }
}

export const wishlistService = new WishlistService();
