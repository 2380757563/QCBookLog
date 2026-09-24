/**
 * LLM 调用客户端
 * 统一走 OpenAI Chat Completions 兼容协议，因此 DeepSeek / 智谱 GLM / 任意兼容服务
 * 只需替换 baseUrl + model 即可，无需分支代码。
 *
 * 设计要点：
 * 1. 仅在「JSON 解析失败」时重试 1 次（附失败原因追问），网络错误不重试，避免重复计费。
 * 2. 错误分类后抛出带 code 的 LLMError，路由层据此返回可读中文提示。
 * 3. 绝不记录 apiKey 与 Prompt / 响应正文。
 */
import axios from 'axios';

/** 错误码：前端据此决定提示文案与操作建议 */
export const LLM_ERROR = {
  NO_KEY: 'NO_KEY',
  NO_BASE_URL: 'NO_BASE_URL',
  AUTH: 'AUTH',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  BAD_JSON: 'BAD_JSON',
  SERVER: 'SERVER',
  NETWORK: 'NETWORK',
  PROTOCOL: 'PROTOCOL',
  UNKNOWN: 'UNKNOWN'
};

const MESSAGES = {
  [LLM_ERROR.NO_KEY]: '尚未配置 API Key，请先到「第三方设置 → AI 年度总结」填写',
  [LLM_ERROR.NO_BASE_URL]: '尚未配置 API 地址（Base URL），请先到「第三方设置 → AI 年度总结」填写',
  [LLM_ERROR.AUTH]: 'API Key 无效或已过期，请检查后重新填写',
  [LLM_ERROR.RATE_LIMIT]: 'AI 服务商限流或余额不足，请稍后重试',
  [LLM_ERROR.TIMEOUT]: 'AI 响应超时，可在设置中调大超时时间后重试',
  [LLM_ERROR.BAD_JSON]: 'AI 返回内容不是合法 JSON，已自动重试一次仍失败，可尝试更换模型',
  [LLM_ERROR.SERVER]: 'AI 服务商返回错误，请稍后重试',
  [LLM_ERROR.NETWORK]: '无法连接 AI 服务，请检查网络或 Base URL 是否正确',
  [LLM_ERROR.PROTOCOL]: '接口协议不匹配：请检查 Base URL 的 http/https 是否与服务端口一致',
  [LLM_ERROR.UNKNOWN]: 'AI 调用失败'
};

export class LLMError extends Error {
  constructor(code, detail = '') {
    super(MESSAGES[code] || MESSAGES[LLM_ERROR.UNKNOWN]);
    this.name = 'LLMError';
    this.code = code;
    this.detail = detail;
  }
}

/** 把 axios / 业务异常统一映射为 LLMError */
const toLLMError = (error) => {
  if (error instanceof LLMError) return error;

  const status = error?.response?.status;
  const apiMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    '';

  if (status === 401 || status === 403) return new LLMError(LLM_ERROR.AUTH, apiMessage);
  if (status === 429) return new LLMError(LLM_ERROR.RATE_LIMIT, apiMessage);
  if (status >= 500) return new LLMError(LLM_ERROR.SERVER, apiMessage);
  if (status) return new LLMError(LLM_ERROR.SERVER, `HTTP ${status} ${apiMessage}`);

  const code = error?.code || '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(error?.message || '')) {
    return new LLMError(LLM_ERROR.TIMEOUT, error.message);
  }
  // SSL 握手失败：通常是 http/https 协议与端口不匹配（如用 https 访问 http 服务）
  const message = error?.message || '';
  if (code === 'EPROTO' || /EPROTO|wrong version number|ssl3_get_record/i.test(message)) {
    return new LLMError(LLM_ERROR.PROTOCOL, message);
  }
  if (['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ERR_NETWORK'].includes(code)) {
    return new LLMError(LLM_ERROR.NETWORK, message);
  }
  return new LLMError(LLM_ERROR.UNKNOWN, message);
};

/** 从模型返回的文本中提取 JSON（容错：剥离 ```json 围栏与前后噪音） */
export const extractJson = (text) => {
  if (typeof text !== 'string') return null;
  let raw = text.trim();

  // 剥离 markdown 代码围栏
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) raw = fence[1].trim();

  try {
    return JSON.parse(raw);
  } catch (_) {
    // 退而在首个 { 与末个 } 之间截取
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_e) {
        return null;
      }
    }
    return null;
  }
};

/**
 * 归一化 Base URL。
 * 用户在设置页常误填到 `/chat/completions`（界面上标注的是「API 根地址」）。
 * 若原样拼接会得到 `.../v1/chat/completions/chat/completions`，
 * 服务端返回 404/502 且报错信息难以定位，故此处统一剥离该后缀。
 */
const normalizeBaseUrl = (baseUrl) =>
  String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/+$/, '');

/**
 * 单次请求底层封装
 * @returns {Promise<{content: string, usage: object|null, model: string}>}
 */
const requestOnce = async ({ baseUrl, apiKey, model, messages, temperature, maxTokens, timeout, jsonMode }) => {
  const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const startedAt = Date.now();
  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    timeout: timeout * 1000
  });

  const elapsed = Date.now() - startedAt;
  const choice = response.data?.choices?.[0];
  const content = choice?.message?.content ?? choice?.delta?.content ?? '';

  return {
    content,
    usage: response.data?.usage || null,
    model: response.data?.model || model,
    elapsed
  };
};

/**
 * 发起一次「要求 JSON 输出」的对话
 * @param {object} params
 * @param {string} params.baseUrl    API 根地址
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {Array}  params.messages
 * @param {number} [params.temperature]
 * @param {number} [params.maxTokens]
 * @param {number} [params.timeout]  秒
 * @param {boolean} [params.retryOnBadJson=true] 是否在 JSON 解析失败时重试
 * @returns {Promise<{data: object, meta: {model, usage, elapsed, attempts}}>}
 */
export async function chatJson({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 1.0,
  maxTokens = 4096,
  timeout = 120,
  retryOnBadJson = true
}) {
  if (!apiKey) throw new LLMError(LLM_ERROR.NO_KEY);
  if (!baseUrl) throw new LLMError(LLM_ERROR.NO_BASE_URL);
  if (!model) throw new LLMError(LLM_ERROR.SERVER, '未配置模型名');

  const base = normalizeBaseUrl(baseUrl);
  let lastBadJsonText = '';
  let totalElapsed = 0;
  let lastMeta = null;
  const maxAttempts = retryOnBadJson ? 2 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const payloadMessages =
      attempt === 1
        ? messages
        : [
            ...messages,
            { role: 'assistant', content: lastBadJsonText.slice(0, 2000) },
            {
              role: 'user',
              content:
                '你上一次的回复不是合法 JSON，无法被解析。请严格只输出一个合法的 JSON 对象，' +
                '不要包含任何解释文字、markdown 代码围栏或多余字符。'
            }
          ];

    let result;
    try {
      result = await requestOnce({
        baseUrl: base,
        apiKey,
        model,
        messages: payloadMessages,
        temperature,
        maxTokens,
        timeout,
        jsonMode: true
      });
    } catch (error) {
      throw toLLMError(error);
    }

    totalElapsed += result.elapsed;
    lastMeta = result;

    const parsed = extractJson(result.content);
    if (parsed && typeof parsed === 'object') {
      return {
        data: parsed,
        meta: {
          model: result.model,
          usage: result.usage,
          elapsed: totalElapsed,
          attempts: attempt
        }
      };
    }

    lastBadJsonText = result.content || '';
    console.warn(`⚠️ LLM 返回非 JSON（第 ${attempt}/${maxAttempts} 次尝试），长度 ${lastBadJsonText.length}`);
  }

  throw new LLMError(LLM_ERROR.BAD_JSON, `响应长度 ${lastBadJsonText.length}`);
}

/**
 * 轻量连通性测试：一次极小的请求，验证 Key / Base URL / 模型名是否可用
 * @returns {Promise<{ok: true, model: string, elapsed: number, usage: object|null}>}
 */
export async function testConnection({ baseUrl, apiKey, model, timeout = 30 }) {
  if (!apiKey) throw new LLMError(LLM_ERROR.NO_KEY);
  if (!baseUrl) throw new LLMError(LLM_ERROR.NO_BASE_URL);

  const startedAt = Date.now();
  try {
    const result = await requestOnce({
      baseUrl: normalizeBaseUrl(baseUrl),
      apiKey,
      model,
      messages: [{ role: 'user', content: '回复两个字：可用' }],
      temperature: 0,
      maxTokens: 8,
      timeout,
      jsonMode: false
    });
    return {
      ok: true,
      model: result.model,
      elapsed: Date.now() - startedAt,
      reply: (result.content || '').trim().slice(0, 20),
      usage: result.usage
    };
  } catch (error) {
    throw toLLMError(error);
  }
}

export default { chatJson, testConnection, extractJson, LLMError, LLM_ERROR };
