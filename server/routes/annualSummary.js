/**
 * AI 年度总结路由
 *
 * GET  /api/annual-summary/settings            读取 AI 设置（API Key 掩码）
 * POST /api/annual-summary/settings            保存 AI 设置
 * DELETE /api/annual-summary/settings/api-key  清除已保存的 API Key
 * POST /api/annual-summary/settings/test       测试 API 连通性
 * GET  /api/annual-summary/availability?year=  各数据源可用条数（设置页徽标）
 * POST /api/annual-summary/collect             仅聚合数据，不调用 AI
 * POST /api/annual-summary/generate            聚合 + 调用 AI 生成报告
 * GET  /api/annual-summary/report/:year        读取已生成的报告（缓存）
 * DELETE /api/annual-summary/report/:year      删除已生成的报告
 */
import express from 'express';
import {
  getAnnualSummarySettings,
  saveAnnualSummarySettings,
  maskApiKey,
  API_KEY_UNCHANGED,
  PROVIDER_PRESETS,
  DATA_SOURCES,
  STYLE_PRESETS
} from '../services/annualSummary/annual-summary-settings.js';
import { chatJson, testConnection, LLMError, LLM_ERROR } from '../services/annualSummary/llm-client.js';
import { collectAnnualData, getAvailability } from '../services/annualSummary/annual-data-collector.js';
import { buildPrompt, validateAndFillNarrative, REPORT_SECTIONS } from '../services/annualSummary/prompt-builder.js';
import userSettingsService from '../services/settings/userSettingsService.js';

const router = express.Router();

const reportKey = (year) => `annualSummaryReport_${year}`;

/** 把内部设置转换为可安全返回给前端的结构（API Key 掩码） */
const toPublicSettings = (settings) => {
  const { annualSummaryApiKey, ...rest } = settings;
  return {
    ...rest,
    annualSummaryApiKey: maskApiKey(annualSummaryApiKey),
    hasApiKey: Boolean(annualSummaryApiKey)
  };
};

/** 统一异常响应：LLMError 带 code，其余为 500 */
const respondError = (res, error, fallbackMessage) => {
  if (error instanceof LLMError) {
    const status = [LLM_ERROR.AUTH, LLM_ERROR.NO_KEY, LLM_ERROR.NO_BASE_URL, LLM_ERROR.PROTOCOL].includes(error.code) ? 400 : 502;
    return res.status(status).json({ ok: false, code: error.code, error: error.message, detail: error.detail || '' });
  }
  console.error(`❌ ${fallbackMessage}:`, error);
  return res.status(500).json({ ok: false, error: error.message || fallbackMessage });
};

/** 解析年份参数 */
const parseYear = (value) => {
  const year = parseInt(value, 10);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
  return year;
};

/**
 * 设置：读取
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await getAnnualSummarySettings();
    res.json({
      ok: true,
      data: {
        settings: toPublicSettings(settings),
        providers: PROVIDER_PRESETS,
        dataSources: DATA_SOURCES,
        stylePresets: STYLE_PRESETS,
        sections: REPORT_SECTIONS.map(s => ({ key: s.key, label: s.label, source: s.source }))
      }
    });
  } catch (error) {
    respondError(res, error, '读取 AI 设置失败');
  }
});

/**
 * 设置：保存
 */
router.post('/settings', async (req, res) => {
  try {
    const body = req.body || {};
    const current = await getAnnualSummarySettings();

    // 前端回显的是掩码值，或显式传递哨兵值时，保留原 Key 不覆盖
    const submittedKey = body.annualSummaryApiKey;
    const apiKeyMasked =
      submittedKey === API_KEY_UNCHANGED ||
      (typeof submittedKey === 'string' && submittedKey === maskApiKey(current.annualSummaryApiKey));

    const settings = await saveAnnualSummarySettings(body, { apiKeyMasked });
    res.json({ ok: true, data: toPublicSettings(settings) });
  } catch (error) {
    respondError(res, error, '保存 AI 设置失败');
  }
});

/**
 * 设置：清除 API Key
 * 单独提供删除入口 —— 保存接口把空串视为「未修改」以防误清空，
 * 因此用户想彻底移除 Key（如更换服务商）必须走这里。
 */
router.delete('/settings/api-key', async (req, res) => {
  try {
    await userSettingsService.deleteSetting(0, 'annualSummaryApiKey');
    const settings = await getAnnualSummarySettings();
    res.json({ ok: true, data: toPublicSettings(settings) });
  } catch (error) {
    respondError(res, error, '清除 API Key 失败');
  }
});

/**
 * 设置：连通性测试
 * body: { provider?, baseUrl?, apiKey?, model? }
 * 未传 apiKey 时回退到已保存的 Key，方便用户改完地址直接测
 */
router.post('/settings/test', async (req, res) => {
  try {
    const saved = await getAnnualSummarySettings();
    const body = req.body || {};

    const submittedKey = body.annualSummaryApiKey;
    const useSavedKey =
      !submittedKey ||
      submittedKey === API_KEY_UNCHANGED ||
      submittedKey === maskApiKey(saved.annualSummaryApiKey);

    const provider = PROVIDER_PRESETS[body.providerValue] ? body.providerValue : saved.annualSummaryProvider;

    const config = {
      baseUrl: body.annualSummaryBaseUrl || PROVIDER_PRESETS[provider]?.baseUrl || saved.annualSummaryBaseUrl,
      apiKey: useSavedKey ? saved.annualSummaryApiKey : submittedKey,
      model: body.annualSummaryModel || PROVIDER_PRESETS[provider]?.model || saved.annualSummaryModel,
      timeout: Math.min(60, saved.annualSummaryTimeout)
    };

    const result = await testConnection(config);
    res.json({ ok: true, data: result });
  } catch (error) {
    respondError(res, error, 'AI 连通性测试失败');
  }
});

/**
 * 数据源可用条数（设置页徽标）
 */
router.get('/availability', async (req, res) => {
  try {
    const year = parseYear(req.query.year) || new Date().getFullYear();
    const readerId = parseInt(req.query.readerId, 10) || 0;
    const available = await getAvailability(year, readerId);
    res.json({ ok: true, data: { year, available } });
  } catch (error) {
    respondError(res, error, '统计可用数据失败');
  }
});

/**
 * 仅聚合数据（不调用 AI）
 * body: { year, sources?, excerptLimit?, excerptChars? }
 */
router.post('/collect', async (req, res) => {
  try {
    const body = req.body || {};
    const year = parseYear(body.year) || new Date().getFullYear();
    const saved = await getAnnualSummarySettings();

    const sources = Array.isArray(body.sources) && body.sources.length
      ? body.sources
      : saved.annualSummarySources;

    const { stats, available } = await collectAnnualData(year, {
      sources,
      readerId: parseInt(body.readerId, 10) || 0,
      excerptLimit: body.excerptLimit ?? saved.annualSummaryExcerptLimit,
      excerptChars: body.excerptChars ?? saved.annualSummaryExcerptChars
    });

    res.json({ ok: true, data: { stats, available } });
  } catch (error) {
    respondError(res, error, '聚合年度数据失败');
  }
});

/**
 * 生成报告：聚合数据 + 调用 AI + 校验补齐 + 持久化
 * body: { year, sources?, regenerate? }
 */
router.post('/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const year = parseYear(body.year);
    if (!year) {
      return res.status(400).json({ ok: false, error: '年份参数不合法' });
    }

    const saved = await getAnnualSummarySettings();

    if (!saved.annualSummaryEnabled) {
      return res.status(400).json({ ok: false, code: 'DISABLED', error: 'AI 年度总结尚未启用，请先到「第三方设置 → AI 年度总结」开启' });
    }
    if (!saved.annualSummaryApiKey) {
      return res.status(400).json({ ok: false, code: 'NO_KEY', error: '尚未配置 API Key，请先到「第三方设置 → AI 年度总结」填写' });
    }

    const sources = Array.isArray(body.sources) && body.sources.length
      ? body.sources
      : saved.annualSummarySources;

    // 1. 聚合数据
    const { stats, available } = await collectAnnualData(year, {
      sources,
      readerId: parseInt(body.readerId, 10) || 0,
      excerptLimit: saved.annualSummaryExcerptLimit,
      excerptChars: saved.annualSummaryExcerptChars
    });

    // 2. 构建 Prompt（L2 风格 + L1 骨架，骨架在后）
    const messages = buildPrompt(stats, { prompt: saved.annualSummaryStylePrompt }, year);

    // 3. 调用 LLM
    const { data: rawNarrative, meta } = await chatJson({
      baseUrl: saved.annualSummaryBaseUrl,
      apiKey: saved.annualSummaryApiKey,
      model: saved.annualSummaryModel,
      messages,
      temperature: saved.annualSummaryTemperature,
      maxTokens: saved.annualSummaryMaxTokens,
      timeout: saved.annualSummaryTimeout
    });

    // 4. 校验与兜底补齐
    const { narrative, repaired, missing } = validateAndFillNarrative(rawNarrative, stats);

    const report = {
      year,
      generatedAt: new Date().toISOString(),
      stats,
      narrative,
      meta: {
        model: meta.model,
        usage: meta.usage,
        attempts: meta.attempts,
        elapsed: meta.elapsed,
        repaired,
        missingSections: missing,
        stylePreset: saved.annualSummaryStylePreset,
        sources
      }
    };

    // 5. 持久化：同一年的报告覆盖式保存，避免重复扣费
    await userSettingsService.saveSetting(0, reportKey(year), report, 'high', 'json');

    res.json({ ok: true, data: { report, available } });
  } catch (error) {
    respondError(res, error, '生成年度报告失败');
  }
});

/**
 * 读取已生成的报告
 */
router.get('/report/:year', async (req, res) => {
  try {
    const year = parseYear(req.params.year);
    if (!year) {
      return res.status(400).json({ ok: false, error: '年份参数不合法' });
    }
    const report = await userSettingsService.getSetting(0, reportKey(year));
    res.json({ ok: true, data: { report: report || null } });
  } catch (error) {
    respondError(res, error, '读取年度报告失败');
  }
});

/**
 * 删除已生成的报告
 */
router.delete('/report/:year', async (req, res) => {
  try {
    const year = parseYear(req.params.year);
    if (!year) {
      return res.status(400).json({ ok: false, error: '年份参数不合法' });
    }
    await userSettingsService.deleteSetting(0, reportKey(year));
    res.json({ ok: true });
  } catch (error) {
    respondError(res, error, '删除年度报告失败');
  }
});

export default router;
