/**
 * API配置文件
 * 统一管理所有图书搜索API的配置信息
 */

export interface ApiConfig {
  /** API唯一标识 */
  key: string;
  /** API显示名称 */
  name: string;
  /** 是否为免费API */
  isFree: boolean;
  /** 调用优先级（数字越小优先级越高） */
  priority: number;
  /** 是否在搜索时自动调用 */
  autoCall: boolean;
  /** API描述 */
  description: string;
  /** 预期响应时间（毫秒） */
  expectedResponseTime: number;
}

/**
 * API配置列表
 */
export const API_CONFIGS: Record<string, ApiConfig> = {
  dbr: {
    key: 'dbr',
    name: 'DBR图书',
    isFree: true,
    priority: 1,
    autoCall: true,
    description: '基于豆瓣数据的高质量API，响应快速，数据准确',
    expectedResponseTime: 1000
  },
  
  isbnWork: {
    key: 'isbnWork',
    name: '公共图书',
    isFree: true,
    priority: 2,
    autoCall: true,
    description: '公共图书数据库API，数据稳定，覆盖面广',
    expectedResponseTime: 1500
  },
  
  douban: {
    key: 'douban',
    name: '豆瓣图书',
    isFree: true,
    priority: 3,
    autoCall: true,
    description: '豆瓣官方API，数据丰富，可能有频率限制',
    expectedResponseTime: 2000
  },
  
  tanshu: {
    key: 'tanshu',
    name: '探数图书',
    isFree: false,
    priority: 4,
    autoCall: false,
    description: '第三方付费API，数据完整，作为备用方案使用',
    expectedResponseTime: 1200
  }
};

/**
 * 获取按优先级排序的API配置
 */
export function getSortedApiConfigs(): ApiConfig[] {
  return Object.values(API_CONFIGS)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 获取自动调用的API配置列表
 */
export function getAutoCallApiConfigs(): ApiConfig[] {
  return Object.values(API_CONFIGS)
    .filter(config => config.autoCall)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 获取按需调用的API配置列表
 */
export function getOnDemandApiConfigs(): ApiConfig[] {
  return Object.values(API_CONFIGS)
    .filter(config => !config.autoCall)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 获取免费API配置列表
 */
export function getFreeApiConfigs(): ApiConfig[] {
  return Object.values(API_CONFIGS)
    .filter(config => config.isFree)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 获取计费API配置列表
 */
export function getPaidApiConfigs(): ApiConfig[] {
  return Object.values(API_CONFIGS)
    .filter(config => !config.isFree)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 根据key获取API配置
 */
export function getApiConfig(key: string): ApiConfig | undefined {
  return API_CONFIGS[key];
}

/**
 * API调用策略配置
 */
export const API_STRATEGY = {
  /** 免费API并行调用 */
  PARALLEL_FREE_APIS: true,
  
  /** 是否在所有免费API失败后自动提示计费API */
  AUTO_SUGGEST_PAID_API: true,
  
  /** 是否在调用计费API前显示确认对话框 */
  CONFIRM_PAID_API_CALL: true,
  
  /** 最大并发API调用数 */
  MAX_CONCURRENT_APIS: 3,
  
  /** API超时时间（毫秒） */
  API_TIMEOUT: 15000
};

export default {
  API_CONFIGS,
  getSortedApiConfigs,
  getAutoCallApiConfigs,
  getOnDemandApiConfigs,
  getFreeApiConfigs,
  getPaidApiConfigs,
  getApiConfig,
  API_STRATEGY
};
