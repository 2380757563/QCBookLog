/**
 * 同步状态服务（Service）
 *
 * 集中封装同步状态查询与同步执行相关的 API。
 */

import { apiClient } from '../apiClient';

export interface SyncStatusResponse {
  success: boolean;
  status?: string;
  message?: string;
  data?: {
    calibre?: { total: number; inBoth: number };
    talebook?: { total: number; inBoth: number };
    conflicted?: number;
    onlyInCalibre?: any[];
    onlyInTalebook?: any[];
  };
}

/**
 * 获取同步状态
 */
export async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  return apiClient.get('/config/sync-status');
}

/**
 * 执行 Calibre 到 Talebook 的同步
 */
export async function executeCalibreToTalebook(): Promise<{ status: string; message: string }> {
  return apiClient.post('/sync/calibre-to-talebook');
}
