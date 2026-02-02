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
  return readerId ? Number(readerId) : 1;
};

const buildQueryString = (params: Record<string, any>): string => {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
};

const activityService = {
  async createActivity(activity: CreateActivityRequest): Promise<ActivityRecord | null> {
    try {
      const response: ActivityApiResponse<ActivityRecord> = await apiClient.post('/activities', {
        ...activity,
        readerId: getCurrentReaderId()
      });

      if (!response.success) {
        throw new Error(response.message || '创建操作记录失败');
      }

      return response.data || null;
    } catch (error) {
      console.error('❌ 创建操作记录失败:', error);
      return null;
    }
  },

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
