/**
 * AI 年度总结设置读写
 * 复用 qc_user_settings KV 表（user_id = 0），与 doulist-settings.js 同一套模式。
 *
 * 键名约定（键名统一加 annualSummary 前缀，避免与其它模块冲突）：
 *   annualSummaryEnabled      0 | 1            是否启用
 *   annualSummaryProvider     deepseek | glm | custom
 *   annualSummaryBaseUrl      OpenAI 兼容的 API 根地址（不含 /chat/completions）
 *   annualSummaryApiKey       明文存储（与现有书源密钥策略一致）
 *   annualSummaryModel        模型名
 *   annualSummaryTemperature  0 ~ 1.5
 *   annualSummaryMaxTokens    >= 256
 *   annualSummaryTimeout      秒，>= 10
 *   annualSummaryStylePrompt  L2 可编辑风格段（用户自定义）
 *   annualSummaryStylePreset  当前套用的内置风格 key（warm / sharp / classic / academic / custom）
 *   annualSummarySources      勾选的数据源 key 数组
 *   annualSummaryExcerptLimit 书摘/书评正文发送条数上限
 *   annualSummaryExcerptChars 每条正文截断字数
 *   annualSummaryHtmlAnimated 导出的 HTML 是否内联动画脚本：0 | 1
 */

import userSettingsService from '../settings/userSettingsService.js';

/** 服务商预设：三者共用 OpenAI Chat Completions 兼容协议 */
export const PROVIDER_PRESETS = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  glm: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash'
  },
  custom: {
    label: '自定义',
    baseUrl: '',
    model: ''
  }
};

/** 数据源清单：key 与 collector 的统计字段一一对应 */
export const DATA_SOURCES = [
  { key: 'collection', label: '藏书与购书', desc: '藏书总量、购书日期、书价与定价', group: '藏书' },
  { key: 'spending', label: '花费统计', desc: '购买价格、标准价、折扣率', group: '藏书' },
  { key: 'binding', label: '装帧属性', desc: '装帧、纸张、刷边、载体类型', group: '藏书' },
  { key: 'reading', label: '阅读记录', desc: '读完书目、页数、时长、阅读次数', group: '阅读' },
  { key: 'habit', label: '阅读习惯', desc: '每日热力、活跃天数、连续阅读', group: '阅读' },
  { key: 'taste', label: '品味画像', desc: '标签、分组、出版社、作者、丛书', group: '品味' },
  { key: 'bookmarks', label: '书摘', desc: '书摘条数与正文摘录', group: '创作' },
  { key: 'reviews', label: '书评', desc: '书评条数与标题摘要', group: '创作' },
  { key: 'goals', label: '年度目标', desc: '阅读目标与实际达成', group: '其它' },
  { key: 'doulist', label: '书单进度', desc: '豆列书单的买书/读书完成度', group: '其它' },
  { key: 'favorite', label: '收藏与想读', desc: '收藏清单、想读清单', group: '其它' }
];

const SOURCE_KEYS = DATA_SOURCES.map(s => s.key);
const DEFAULT_SOURCES = SOURCE_KEYS.filter(k => k !== 'doulist' && k !== 'favorite');

/** 内置风格模板：用户可在设置页一键套用后继续编辑 */
export const STYLE_PRESETS = {
  warm: {
    label: '温暖叙事',
    prompt: [
      '语气：温暖、真诚，像一位老朋友在年末陪你翻看这一年的书架。',
      '人称：第二人称「你」。',
      '详略：每个段落 80~150 字，重感受与画面感，避免流水账。',
      '可以偶尔引用书中意象，但不得编造书名与数字。'
    ].join('\n')
  },
  sharp: {
    label: '毒舌吐槽',
    prompt: [
      '语气：犀利、幽默、带点自嘲的吐槽，但底色是善意的。',
      '人称：第二人称「你」，可偶尔自称「我」。',
      '详略：每个段落 60~120 字，短句为主，节奏快。',
      '吐槽只能针对买书不读、囤书等行为，不得贬低具体书籍与作者。'
    ].join('\n')
  },
  classic: {
    label: '古风雅致',
    prompt: [
      '语气：典雅、含蓄，带古典白话韵味，可化用诗词意象。',
      '人称：第二人称「君」或「你」。',
      '详略：每个段落 80~150 字，多用四字短语。',
      '不得生造古籍出处，不得编造书名与数字。'
    ].join('\n')
  },
  academic: {
    label: '学术严谨',
    prompt: [
      '语气：客观、克制，像一份年度阅读行为分析报告。',
      '人称：第三人称「读者」。',
      '详略：每个段落 100~180 字，先陈述数据再给出观察。',
      '所有结论必须能由给定数据支撑，不得做无依据的推断。'
    ].join('\n')
  }
};

export const DEFAULT_STYLE_PRESET = 'warm';

const DEFAULTS = {
  annualSummaryEnabled: 0,
  annualSummaryProvider: 'deepseek',
  annualSummaryBaseUrl: PROVIDER_PRESETS.deepseek.baseUrl,
  annualSummaryApiKey: '',
  annualSummaryModel: PROVIDER_PRESETS.deepseek.model,
  annualSummaryTemperature: 1.0,
  annualSummaryMaxTokens: 4096,
  annualSummaryTimeout: 120,
  annualSummaryStylePreset: DEFAULT_STYLE_PRESET,
  annualSummaryStylePrompt: STYLE_PRESETS[DEFAULT_STYLE_PRESET].prompt,
  annualSummarySources: DEFAULT_SOURCES,
  annualSummaryExcerptLimit: 20,
  annualSummaryExcerptChars: 200,
  annualSummaryHtmlAnimated: 0
};

const KEYS = Object.keys(DEFAULTS);

/** 前端提交该哨兵值时表示「未修改 API Key」，服务端保留原值 */
export const API_KEY_UNCHANGED = '__UNCHANGED__';

const clampNumber = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

/** API Key 掩码：只保留前 3 位与后 4 位 */
export const maskApiKey = (key) => {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 3)}${'*'.repeat(Math.min(12, key.length - 7))}${key.slice(-4)}`;
};

const normalizeSources = (value) => {
  if (!Array.isArray(value)) return [...DEFAULT_SOURCES];
  const picked = value.filter(k => SOURCE_KEYS.includes(k));
  return [...new Set(picked)];
};

/**
 * 读取设置（含明文 API Key，仅供服务端内部与保存逻辑使用）
 */
export async function getAnnualSummarySettings() {
  const all = await userSettingsService.getSettings(0);
  const settings = { ...DEFAULTS };

  for (const key of KEYS) {
    if (all[key] !== undefined && all[key] !== null) {
      settings[key] = all[key];
    }
  }

  // 逐项兜底与归一化
  settings.annualSummaryEnabled = settings.annualSummaryEnabled === 1 || settings.annualSummaryEnabled === '1' || settings.annualSummaryEnabled === true ? 1 : 0;
  if (!PROVIDER_PRESETS[settings.annualSummaryProvider]) {
    settings.annualSummaryProvider = DEFAULTS.annualSummaryProvider;
  }
  settings.annualSummaryBaseUrl = String(settings.annualSummaryBaseUrl || '').trim().replace(/\/+$/, '');
  settings.annualSummaryApiKey = typeof settings.annualSummaryApiKey === 'string' ? settings.annualSummaryApiKey : '';
  settings.annualSummaryModel = String(settings.annualSummaryModel || '').trim();
  settings.annualSummaryTemperature = clampNumber(settings.annualSummaryTemperature, 0, 1.5, DEFAULTS.annualSummaryTemperature);
  settings.annualSummaryMaxTokens = Math.round(clampNumber(settings.annualSummaryMaxTokens, 256, 32768, DEFAULTS.annualSummaryMaxTokens));
  settings.annualSummaryTimeout = Math.round(clampNumber(settings.annualSummaryTimeout, 10, 600, DEFAULTS.annualSummaryTimeout));
  settings.annualSummaryStylePrompt = String(settings.annualSummaryStylePrompt || '').trim() || STYLE_PRESETS[DEFAULT_STYLE_PRESET].prompt;
  if (!STYLE_PRESETS[settings.annualSummaryStylePreset] && settings.annualSummaryStylePreset !== 'custom') {
    settings.annualSummaryStylePreset = DEFAULT_STYLE_PRESET;
  }
  settings.annualSummarySources = normalizeSources(settings.annualSummarySources);
  settings.annualSummaryExcerptLimit = Math.round(clampNumber(settings.annualSummaryExcerptLimit, 0, 200, DEFAULTS.annualSummaryExcerptLimit));
  settings.annualSummaryExcerptChars = Math.round(clampNumber(settings.annualSummaryExcerptChars, 40, 2000, DEFAULTS.annualSummaryExcerptChars));
  settings.annualSummaryHtmlAnimated = settings.annualSummaryHtmlAnimated === 1 || settings.annualSummaryHtmlAnimated === '1' || settings.annualSummaryHtmlAnimated === true ? 1 : 0;

  return settings;
}

/**
 * 保存设置（部分更新）
 * @param {object} partial 前端提交的字段
 * @param {object} options.apiKeyMasked 提交中的年 summaryApiKey 是否为掩码值（是则不覆盖）
 */
export async function saveAnnualSummarySettings(partial = {}, options = {}) {
  const updates = {};

  for (const key of KEYS) {
    if (partial[key] === undefined) continue;
    let value = partial[key];

    switch (key) {
      case 'annualSummaryEnabled':
        value = value === 1 || value === '1' || value === true ? 1 : 0;
        break;
      case 'annualSummaryProvider':
        if (!PROVIDER_PRESETS[value]) value = DEFAULTS.annualSummaryProvider;
        break;
      case 'annualSummaryBaseUrl':
        value = String(value || '').trim().replace(/\/+$/, '');
        break;
      case 'annualSummaryApiKey': {
        const raw = typeof value === 'string' ? value.trim() : '';
        // 掩码回显或哨兵值：保持原 Key 不变
        if (raw === '' || raw === API_KEY_UNCHANGED || options.apiKeyMasked) {
          continue;
        }
        value = raw;
        break;
      }
      case 'annualSummaryModel':
        value = String(value || '').trim();
        break;
      case 'annualSummaryTemperature':
        value = clampNumber(value, 0, 1.5, DEFAULTS.annualSummaryTemperature);
        break;
      case 'annualSummaryMaxTokens':
        value = Math.round(clampNumber(value, 256, 32768, DEFAULTS.annualSummaryMaxTokens));
        break;
      case 'annualSummaryTimeout':
        value = Math.round(clampNumber(value, 10, 600, DEFAULTS.annualSummaryTimeout));
        break;
      case 'annualSummaryStylePreset':
        if (!STYLE_PRESETS[value] && value !== 'custom') value = DEFAULT_STYLE_PRESET;
        break;
      case 'annualSummaryStylePrompt':
        value = String(value || '').trim();
        // 允许为空（表示用默认），但存一个非空串便于前端展示
        if (!value) value = STYLE_PRESETS[DEFAULT_STYLE_PRESET].prompt;
        break;
      case 'annualSummarySources':
        value = normalizeSources(value);
        break;
      case 'annualSummaryExcerptLimit':
        value = Math.round(clampNumber(value, 0, 200, DEFAULTS.annualSummaryExcerptLimit));
        break;
      case 'annualSummaryExcerptChars':
        value = Math.round(clampNumber(value, 40, 2000, DEFAULTS.annualSummaryExcerptChars));
        break;
      case 'annualSummaryHtmlAnimated':
        value = value === 1 || value === '1' || value === true ? 1 : 0;
        break;
      default:
        break;
    }

    updates[key] = value;
  }

  if (Object.keys(updates).length) {
    await userSettingsService.saveSettings(0, updates);
  }

  return getAnnualSummarySettings();
}

export default {
  PROVIDER_PRESETS,
  DATA_SOURCES,
  STYLE_PRESETS,
  getAnnualSummarySettings,
  saveAnnualSummarySettings,
  maskApiKey,
  API_KEY_UNCHANGED
};
