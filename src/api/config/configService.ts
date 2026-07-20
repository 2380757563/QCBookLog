/**
 * 配置服务（Service）
 *
 * 集中封装所有与书库配置相关的后端 API 请求。
 * 不持有任何 UI 状态，仅负责数据访问。
 */

import { apiClient } from '../apiClient';

const BASE = '/config';

export interface DbPathInfo {
  success: boolean;
  calibreDbPath?: string;
  talebookDbPath?: string;
  exists?: boolean;
  valid?: boolean;
  error?: string | null;
  needsReconfig?: boolean;
  isDefault?: boolean;
  stats?: any;
}

export interface ValidationResult {
  success: boolean;
  errors?: string[];
  error?: string;
  stats?: {
    bookCount?: number;
    libraryUuid?: string;
    dbPath?: string;
  };
}

export interface DatabaseStatusData {
  calibre: { exists: boolean; valid: boolean; error: string | null };
  talebook: { exists: boolean; valid: boolean; error: string | null };
}

/**
 * 获取 Calibre 路径信息
 */
export async function fetchCalibrePath(): Promise<DbPathInfo> {
  return apiClient.get(`${BASE}/calibre-path`);
}

/**
 * 获取 Talebook 路径信息
 */
export async function fetchTalebookPath(): Promise<DbPathInfo> {
  return apiClient.get(`${BASE}/talebook-path`);
}

/**
 * 保存 Calibre 路径
 */
export async function saveCalibrePath(
  calibrePath: string,
  isDefault: boolean
): Promise<DbPathInfo> {
  return apiClient.post(`${BASE}/calibre-path`, { calibrePath, isDefault });
}

/**
 * 保存 Talebook 路径
 */
export async function saveTalebookPath(
  talebookPath: string,
  isDefault: boolean
): Promise<DbPathInfo> {
  return apiClient.post(`${BASE}/talebook-path`, { talebookPath, isDefault });
}

/**
 * 验证 Calibre 数据库
 */
export async function validateCalibre(calibreDir: string): Promise<ValidationResult> {
  return apiClient.post(`${BASE}/validate-calibre`, { calibreDir });
}

/**
 * 验证 Talebook 数据库
 */
export async function validateTalebook(talebookDir: string): Promise<ValidationResult> {
  return apiClient.post(`${BASE}/validate-talebook`, { talebookDir });
}

/**
 * 检查所有数据库状态
 */
export async function checkDatabases(): Promise<{ success: boolean; data?: DatabaseStatusData; error?: string }> {
  return apiClient.get(`${BASE}/check-databases`);
}

/**
 * 创建新数据库
 */
export async function createDatabase(
  type: 'calibre' | 'talebook',
  path: string
): Promise<{ success: boolean; dbPath?: string; error?: string }> {
  return apiClient.post(`${BASE}/create-database`, { type, path });
}

/**
 * 设置默认书库
 */
export async function setDefault(
  calibreDbPath: string,
  isDefault: boolean
): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`${BASE}/set-default`, { calibreDbPath, isDefault });
}
