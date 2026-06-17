/**
 * 数据转移服务（Service）
 *
 * 封装所有 /api/data-transfer/* 相关的 API 请求。
 */

import { apiClient } from '../apiClient';

export interface TransferSourceInfo {
  success: boolean;
  calibreDir?: string;
  fileCount?: number;
  totalSize?: number;
  error?: string;
}

export interface TransferTargetInfo {
  success: boolean;
  exists?: boolean;
  fileCount?: number;
  totalSize?: number;
  error?: string;
}

export interface TransferStats {
  copiedFiles: number;
  totalBytes: number;
  failedFiles: number;
}

export interface TransferExecuteResult {
  success: boolean;
  source?: string;
  target?: string;
  talebookDbPath?: string;
  stats?: TransferStats;
  error?: string;
}

export interface TransferLogEntry {
  timestamp: string;
  action?: string;
  source?: string;
  target?: string;
  result?: 'success' | 'partial' | 'failed' | 'rejected' | string;
  error?: string | null;
  stats?: any;
  raw?: string;
}

/**
 * 获取源目录（当前 Calibre 库）信息
 */
export async function fetchTransferSourceInfo(): Promise<TransferSourceInfo> {
  return apiClient.get('/data-transfer/source-info');
}

/**
 * 查询目标目录信息
 */
export async function fetchTransferTargetInfo(
  targetDir: string
): Promise<TransferTargetInfo> {
  return apiClient.post('/data-transfer/target-info', { targetDir });
}

/**
 * 执行数据转移
 */
export async function executeTransfer(
  targetDir: string
): Promise<TransferExecuteResult> {
  return apiClient.post('/data-transfer/execute', { targetDir, confirmed: true });
}

/**
 * 读取转移历史日志
 */
export async function fetchTransferLogs(): Promise<{ success: boolean; logs?: TransferLogEntry[] }> {
  return apiClient.get('/data-transfer/logs');
}
