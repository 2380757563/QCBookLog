/**
 * useRatingDisplayMode - 评分显示模式 composable
 *
 * 提供响应式的评分显示模式（'5' 五星制 / '10' 十星制）。
 * 持久化使用现有的 userSettings 服务（后端 API + localStorage 缓存）。
 *
 * 关键约束：
 *   - 数据库原始评分范围是 0-10（如 7.8、9.0、8、7）
 *   - 前端不得对原始评分做除以 2 等缩放
 *   - 五星制：每颗星 = 2 分（10/5）
 *   - 十星制：每颗星 = 1 分（10/10）
 */

import { ref, type Ref } from 'vue';
import userSettingsService from '@/services/userSettings';

export type RatingDisplayMode = '5' | '10';

const SETTING_KEY = 'ratingDisplayMode';
const DEFAULT_MODE: RatingDisplayMode = '10';
const VALID_MODES: readonly RatingDisplayMode[] = ['5', '10'] as const;

/**
 * 单例全局状态，确保多个组件共享同一份模式偏好
 */
const globalMode = ref<RatingDisplayMode>(DEFAULT_MODE);
let initialized = false;

function isValidMode(v: unknown): v is RatingDisplayMode {
  return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v);
}

/**
 * useRatingDisplayMode - 评分显示模式 composable
 *
 * 首次调用时从后端（或 localStorage 缓存）加载偏好；
 * 后续调用复用单例状态，避免重复请求。
 */
export function useRatingDisplayMode(): {
  mode: Ref<RatingDisplayMode>;
  setMode: (mode: RatingDisplayMode) => Promise<void>;
  load: () => Promise<void>;
  reset: () => Promise<void>;
} {
  async function load(): Promise<void> {
    try {
      const raw = await userSettingsService.getSetting(SETTING_KEY);
      if (isValidMode(raw)) {
        globalMode.value = raw;
      } else {
        globalMode.value = DEFAULT_MODE;
      }
    } catch (err) {
      console.warn('[useRatingDisplayMode] 加载评分显示模式失败，使用默认值:', err);
      globalMode.value = DEFAULT_MODE;
    } finally {
      initialized = true;
    }
  }

  async function setMode(mode: RatingDisplayMode): Promise<void> {
    if (!isValidMode(mode)) return;
    globalMode.value = mode;
    try {
      await userSettingsService.saveSetting(SETTING_KEY, mode, 'low');
    } catch (err) {
      console.error('[useRatingDisplayMode] 保存评分显示模式失败:', err);
    }
  }

  async function reset(): Promise<void> {
    await setMode(DEFAULT_MODE);
  }

  if (!initialized) {
    // 触发加载（不 await，让调用方在必要时自行 await）
    load();
  }

  return {
    mode: globalMode,
    setMode,
    load,
    reset
  };
}
