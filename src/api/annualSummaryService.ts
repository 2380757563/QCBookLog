/**
 * AI 年度总结 API 服务
 * 对接后端 /api/annual-summary/* 端点
 */
import { apiClient } from './apiClient';

/** 服务商预设 */
export interface ProviderPreset {
  label: string;
  baseUrl: string;
  model: string;
}

/** 数据源定义 */
export interface DataSourceItem {
  key: string;
  label: string;
  desc: string;
  group: string;
}

/** 内置风格模板 */
export interface StylePreset {
  label: string;
  prompt: string;
}

/** 报告段落定义 */
export interface ReportSection {
  key: string;
  label: string;
  source: string;
}

/** 年度总结设置（读取时 API Key 为掩码值） */
export interface AnnualSummarySettings {
  annualSummaryEnabled: number;
  annualSummaryProvider: string;
  annualSummaryBaseUrl: string;
  annualSummaryApiKey: string;
  hasApiKey: boolean;
  annualSummaryModel: string;
  annualSummaryTemperature: number;
  annualSummaryMaxTokens: number;
  annualSummaryTimeout: number;
  annualSummaryStylePreset: string;
  annualSummaryStylePrompt: string;
  annualSummarySources: string[];
  annualSummaryExcerptLimit: number;
  annualSummaryExcerptChars: number;
  /** 导出的 HTML 是否内联动画脚本：0 否 / 1 是 */
  annualSummaryHtmlAnimated: number;
}

/** 设置页初始化返回 */
export interface AnnualSummarySettingsResponse {
  settings: AnnualSummarySettings;
  providers: Record<string, ProviderPreset>;
  dataSources: DataSourceItem[];
  stylePresets: Record<string, StylePreset>;
  sections: ReportSection[];
}

/** 各数据源可用条数 */
export type DataAvailability = Record<string, number>;

/** 报告正文（11 个段落） */
export interface ReportNarrative {
  opening: string;
  buying: string;
  spending: string;
  reading: string;
  habit: string;
  taste: string;
  bookmarks: string;
  reviews: string;
  goals: string;
  persona: Array<{ label: string; reason: string }>;
  closing: string;
}

/** 生成的年度报告 */
export interface AnnualSummaryReport {
  year: number;
  generatedAt: string;
  stats: Record<string, any>;
  narrative: ReportNarrative;
  meta: {
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    attempts?: number;
    elapsed?: number;
    repaired?: boolean;
    missingSections?: string[];
    stylePreset?: string;
    sources?: string[];
  };
}

/** 连通性测试结果 */
export interface ConnectionTestResult {
  ok: boolean;
  model: string;
  elapsed: number;
  reply: string;
  usage?: Record<string, any>;
}

/** 需后端保留原 API Key 时提交的哨兵值 */
export const API_KEY_UNCHANGED = '__UNCHANGED__';

/**
 * 提取后端错误码
 * apiClient 在非 2xx 时只抛出 message，这里通过改写请求拿到 code。
 * 若拿不到 code，返回空串由调用方按 message 兜底。
 */
async function requestWithCode<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `请求失败: ${response.status}`) as Error & {
      code?: string;
      detail?: string;
    };
    error.code = payload?.code || '';
    error.detail = payload?.detail || '';
    throw error;
  }

  return payload as T;
}

export const annualSummaryApi = {
  /** 读取设置（含服务商预设、数据源清单、风格模板、段落定义） */
  getSettings(): Promise<{ ok: boolean; data: AnnualSummarySettingsResponse }> {
    return apiClient.get('/annual-summary/settings');
  },

  /** 保存设置（部分更新；API Key 传掩码或哨兵值时不覆盖） */
  saveSettings(partial: Partial<AnnualSummarySettings>): Promise<{ ok: boolean; data: AnnualSummarySettings }> {
    return apiClient.post('/annual-summary/settings', partial);
  },

  /** 清除已保存的 API Key（保存接口的空串语义是「未修改」，故需独立入口） */
  clearApiKey(): Promise<{ ok: boolean; data: AnnualSummarySettings }> {
    return apiClient.delete('/annual-summary/settings/api-key');
  },

  /** 测试 API 连通性（providerValue 为服务商 key） */
  testConnection(payload: {
    providerValue?: string;
    annualSummaryBaseUrl?: string;
    annualSummaryApiKey?: string;
    annualSummaryModel?: string;
  }): Promise<{ ok: boolean; data: ConnectionTestResult }> {
    return requestWithCode('/annual-summary/settings/test', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /** 各数据源可用条数（设置页徽标） */
  getAvailability(
    year: number,
    readerId = 0
  ): Promise<{ ok: boolean; data: { year: number; available: DataAvailability } }> {
    return apiClient.get(`/annual-summary/availability?year=${year}&readerId=${readerId}`);
  },

  /** 仅聚合数据，不调用 AI */
  collect(payload: {
    year: number;
    sources?: string[];
    readerId?: number;
    excerptLimit?: number;
    excerptChars?: number;
  }): Promise<{ ok: boolean; data: { stats: Record<string, any>; available: DataAvailability } }> {
    return requestWithCode('/annual-summary/collect', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /** 生成报告（聚合 + 调用 AI + 校验补齐 + 持久化） */
  generate(payload: {
    year: number;
    sources?: string[];
    readerId?: number;
    regenerate?: boolean;
  }): Promise<{ ok: boolean; data: { report: AnnualSummaryReport; available: DataAvailability } }> {
    return requestWithCode('/annual-summary/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /** 读取已生成的报告 */
  getReport(year: number): Promise<{ ok: boolean; data: { report: AnnualSummaryReport | null } }> {
    return apiClient.get(`/annual-summary/report/${year}`);
  },

  /** 删除已生成的报告 */
  deleteReport(year: number): Promise<{ ok: boolean }> {
    return apiClient.delete(`/annual-summary/report/${year}`);
  }
};

export default annualSummaryApi;
