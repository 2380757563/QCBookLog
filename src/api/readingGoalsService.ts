/**
 * 阅读目标服务
 * 用于管理阅读目标数据的 API 调用
 */

import { apiClient } from './apiClient';

export interface ReadingGoal {
  id: number;
  readerId: number;
  year: number;
  target: number;
  completed: number;
  created_at: string;
  updated_at: string;
}

class ReadingGoalsService {
  /**
   * 获取指定年份的阅读目标
   */
  async getReadingGoal(year: number, readerId?: number): Promise<ReadingGoal> {
    const params = readerId !== undefined ? `?readerId=${readerId}` : '';
    const response = await apiClient.get(`/reading-goals/${year}${params}`);
    return response;
  }

  /**
   * 更新阅读目标
   */
  async updateReadingGoal(goalId: number, target: number, completed?: number): Promise<ReadingGoal> {
    const response = await apiClient.put(`/reading-goals/${goalId}`, {
      target,
      completed: completed || 0
    });
    return response;
  }

  /**
   * 增加已完成数量
   */
  async incrementCompleted(goalId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/reading-goals/${goalId}/increment`);
    return response;
  }

  /**
   * 设置年度目标（便捷方法）
   */
  async setYearlyGoal(year: number, target: number, readerId?: number): Promise<ReadingGoal> {
    // 先获取或创建目标
    const goal = await this.getReadingGoal(year, readerId);
    // 然后更新目标
    return await this.updateReadingGoal(goal.id, target, goal.completed);
  }
}

export const readingGoalsService = new ReadingGoalsService();
