/**
 * 阅读追踪服务
 * 提供阅读记录、阅读统计等功能的前端API调用
 */

import { apiClient } from '@/services/apiClient';
import type {
  ReadingTrackingService,
  CreateReadingRecordRequest,
  ReadingRecord,
  BookReadingStats,
  ReaderSummary,
  DailyReadingStats,
  HeatmapData,
  ApiResponse
} from './types';

/**
 * 获取当前读者ID
 * TODO: 从用户状态管理中获取
 */
const getCurrentReaderId = (): number => {
  const readerId = localStorage.getItem('currentReaderId');
  return readerId ? Number(readerId) : 0;
};

/**
 * 构建查询字符串
 * @param params 查询参数对象
 * @returns 查询字符串（包含?前缀）
 */
const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
};

/**
 * 阅读追踪服务实现
 */
const readingTrackingService: ReadingTrackingService = {
  // ==================== 阅读记录 ====================

  /**
   * 创建阅读记录
   * @param record - 阅读记录数据
   * @returns 创建的阅读记录
   */
  async createReadingRecord(record: CreateReadingRecordRequest): Promise<ReadingRecord> {
    console.log('📤 准备发送阅读记录到后端:', record);

    const requestData = {
      ...record,
      readerId: getCurrentReaderId()
    };

    console.log('📤 实际发送的数据:', requestData);

    const response: ApiResponse<ReadingRecord> = await apiClient.post('/reading/record', requestData);

    if (!response.success) {
      throw new Error(response.message || '创建阅读记录失败');
    }

    return response.data;
  },

  /**
   * 获取书籍的阅读记录
   * @param bookId - 书籍ID
   * @param limit - 返回记录数限制
   * @returns 阅读记录列表
   */
  async getBookReadingRecords(bookId: number, limit = 10): Promise<ReadingRecord[]> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId(),
      limit
    });
    const response: ApiResponse<ReadingRecord[]> = await apiClient.get(
      `/reading/records/book/${bookId}${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取阅读记录失败');
    }

    return response.data;
  },

  /**
   * 获取读者的所有阅读记录
   * @param startDate - 开始日期 (可选)
   * @param endDate - 结束日期 (可选)
   * @returns 阅读记录列表
   */
  async getReaderReadingRecords(startDate?: string, endDate?: string): Promise<ReadingRecord[]> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId(),
      startDate,
      endDate
    });
    const response: ApiResponse<ReadingRecord[]> = await apiClient.get(
      `/reading/records${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取阅读记录失败');
    }

    return response.data;
  },

  // ==================== 阅读统计 ====================

  /**
   * 获取书籍的阅读统计
   * @param bookId - 书籍ID
   * @returns 书籍阅读统计
   */
  async getBookReadingStats(bookId: number): Promise<BookReadingStats> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId()
    });
    const response: ApiResponse<BookReadingStats> = await apiClient.get(
      `/reading/stats/book/${bookId}${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取书籍阅读统计失败');
    }

    return response.data;
  },

  /**
   * 获取读者的汇总统计
   * @returns 读者阅读汇总统计
   */
  async getReaderSummary(): Promise<ReaderSummary> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId()
    });
    const response: ApiResponse<ReaderSummary> = await apiClient.get(
      `/reading/stats/summary${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取读者汇总统计失败');
    }

    return response.data;
  },

  /**
   * 获取每日阅读统计
   * @param startDate - 开始日期 (可选)
   * @param endDate - 结束日期 (可选)
   * @returns 每日统计列表
   */
  async getDailyReadingStats(startDate?: string, endDate?: string): Promise<DailyReadingStats[]> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId(),
      startDate,
      endDate
    });
    const response: ApiResponse<DailyReadingStats[]> = await apiClient.get(
      `/reading/stats/daily${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取每日阅读统计失败');
    }

    return response.data;
  },

  /**
   * 获取某一天的详细阅读记录
   * @param date - 日期 (YYYY-MM-DD)
   * @returns 详细阅读记录列表
   */
  async getDailyReadingDetails(date: string): Promise<ReadingRecord[]> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId()
    });
    const response: ApiResponse<ReadingRecord[]> = await apiClient.get(
      `/reading/details/${date}${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取每日阅读详情失败');
    }

    return response.data;
  },

  // ==================== 热力图 ====================

  /**
   * 获取热力图数据
   * @param year - 年份
   * @returns 热力图数据字典
   */
  async getHeatmapData(year: number): Promise<HeatmapData> {
    const queryString = buildQueryString({
      readerId: getCurrentReaderId()
    });
    const response: ApiResponse<HeatmapData> = await apiClient.get(
      `/reading/heatmap/${year}${queryString}`
    );

    if (!response.success) {
      throw new Error(response.message || '获取热力图数据失败');
    }

    return response.data;
  }
};

export { type ReadingRecord, type CreateReadingRecordRequest, type BookReadingStats, type ReaderSummary, type DailyReadingStats, type HeatmapData, type ApiResponse } from './types';
export default readingTrackingService;
