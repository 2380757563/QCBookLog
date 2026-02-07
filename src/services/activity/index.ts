/**
 * 操作记录服务
 * 提供操作记录的前端API调用
 */

import { apiClient } from '@/services/apiClient';
import type {
  ActivityRecord,
  CreateActivityRequest,
  ActivityFilters,
  ActivityApiResponse
} from './types';

const getCurrentReaderId = (): number => {
  const readerId = localStorage.getItem('currentReaderId');
  return readerId ? Number(readerId) : 0;
};

const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
};

const activityService = {
  // 注意：不再提供 createActivity 方法
  // 操作记录应该由业务服务自动创建（书摘、阅读状态、阅读记录、阅读目标等）
  // 前端通过查询接口获取聚合的操作记录数据

  async getActivities(filters?: ActivityFilters): Promise<ActivityRecord[]> {
    try {
      const params = {
        readerId: getCurrentReaderId(),
        ...filters
      };

      const queryString = buildQueryString(params);
      const response: ActivityApiResponse<ActivityRecord[]> = await apiClient.get(
        `/activities${queryString}`
      );

      if (!response.success) {
        throw new Error(response.message || '获取操作记录失败');
      }

      return response.data || [];
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  },

  async getActivitiesByDate(date: string): Promise<ActivityRecord[]> {
    try {
      const queryString = buildQueryString({
        readerId: getCurrentReaderId()
      });

      const response: ActivityApiResponse<ActivityRecord[]> = await apiClient.get(
        `/activities/date/${date}${queryString}`
      );

      if (!response.success) {
        throw new Error(response.message || '获取操作记录失败');
      }

      return response.data || [];
    } catch (error) {
      console.error('❌ 获取操作记录失败:', error);
      return [];
    }
  }
};

export { type ActivityRecord, type CreateActivityRequest, type ActivityFilters, type ActivityApiResponse } from './types';
export default activityService;
