/**
 * 阅读热力图服务
 * 用于管理阅读热力图数据的 API 调用
 */

import { apiClient } from './apiClient';

export interface HeatmapData {
  [date: string]: number; // 日期 (YYYY-MM-DD) -> 书摘数量
}

class ReadingHeatmapService {
  /**
   * 获取指定年份的阅读热力图数据
   */
  async getHeatmapData(year: number, readerId?: number): Promise<HeatmapData> {
    const params = readerId !== undefined ? `?readerId=${readerId}` : '';
    const response = await apiClient.get(`/reading-heatmap/${year}${params}`);
    return response;
  }

  /**
   * 从书摘重新计算热力图数据
   */
  async recalculateHeatmap(year: number, readerId?: number): Promise<{ success: boolean; message: string }> {
    const params = readerId !== undefined ? `?readerId=${readerId}` : '';
    const response = await apiClient.post(`/reading-heatmap/recalculate/${year}${params}`);
    return response;
  }

  /**
   * 更新单日热力图数据
   */
  async updateHeatmapData(date: string, bookmarkCount: number, readerId?: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/reading-heatmap/${date}`, {
      readerId,
      bookmarkCount
    });
    return response;
  }

  /**
   * 增加单日书摘数量（便捷方法）
   */
  async incrementDayCount(date: string, readerId?: number): Promise<void> {
    // 先获取当前数据
    const year = parseInt(date.split('-')[0]);
    const currentData = await this.getHeatmapData(year, readerId);
    const currentCount = currentData[date] || 0;

    // 更新数据
    await this.updateHeatmapData(date, currentCount + 1, readerId);
  }

  /**
   * 减少单日书摘数量（便捷方法）
   */
  async decrementDayCount(date: string, readerId?: number): Promise<void> {
    // 先获取当前数据
    const year = parseInt(date.split('-')[0]);
    const currentData = await this.getHeatmapData(year, readerId);
    const currentCount = currentData[date] || 0;

    // 更新数据
    await this.updateHeatmapData(date, Math.max(0, currentCount - 1), readerId);
  }
}

export const readingHeatmapService = new ReadingHeatmapService();
