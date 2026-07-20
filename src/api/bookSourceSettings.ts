import { apiClient } from './apiClient';

export interface BookSourceSetting {
  id: number;
  sourceKey: string;
  sourceName: string;
  apiKey: string;
  isRequired: boolean;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookSourceSettingUpdate {
  sourceKey: string;
  apiKey: string;
}

/**
 * 获取书源设置列表
 */
export async function getBookSourceSettings(): Promise<BookSourceSetting[]> {
  const response = await apiClient.get('/book-source-settings');
  if (!response.success) {
    throw new Error(response.error || '获取书源设置失败');
  }
  return response.data || [];
}

/**
 * 保存书源设置
 */
export async function saveBookSourceSettings(
  sources: BookSourceSettingUpdate[]
): Promise<{ success: boolean; message?: string }> {
  const response = await apiClient.post('/book-source-settings', { sources });
  if (!response.success) {
    throw new Error(response.error || '保存书源设置失败');
  }
  return response;
}
