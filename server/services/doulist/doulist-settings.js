/**
 * 豆列设置读写
 * 复用 qc_user_settings KV 表（user_id = 0），键名约定见 doc/豆瓣书单爬取与联动.md：
 *   doulistEnrichMode   none | smart | full     默认 none（不补全）
 *   doulistEnrichSource dbr | doubanapi | booksource   默认 dbr（内置 DBR，免 Key）
 *   doulistDelay        秒，默认 5（下限 2）
 *   doulistMaxPages     0=全部
 *   doulistHideShelved  0 | 1    默认 0（书单页是否隐藏已加入书架/划去的书）
 */
import userSettingsService from '../settings/userSettingsService.js';

const DEFAULTS = {
  doulistEnrichMode: 'none',
  doulistEnrichSource: 'dbr',
  doulistDelay: 5,
  doulistMaxPages: 0,
  doulistHideShelved: 0
};

const KEYS = Object.keys(DEFAULTS);

export async function getDoulistSettings() {
  const all = await userSettingsService.getSettings(0);
  const settings = { ...DEFAULTS };
  for (const key of KEYS) {
    if (all[key] !== undefined && all[key] !== null) {
      settings[key] = all[key];
    }
  }
  settings.doulistDelay = Math.max(2, Number(settings.doulistDelay) || DEFAULTS.doulistDelay);
  settings.doulistMaxPages = Math.max(0, Number(settings.doulistMaxPages) || 0);
  return settings;
}

export async function saveDoulistSettings(partial = {}) {
  const updates = {};
  for (const key of KEYS) {
    if (partial[key] === undefined) continue;
    let value = partial[key];
    if (key === 'doulistDelay') {
      value = Math.max(2, Number(value) || DEFAULTS.doulistDelay);
    } else if (key === 'doulistMaxPages') {
      value = Math.max(0, Number(value) || 0);
    } else if (key === 'doulistHideShelved') {
      value = value === 1 || value === '1' || value === true ? 1 : 0;
    } else if (key === 'doulistEnrichMode') {
      if (!['none', 'smart', 'full'].includes(value)) value = DEFAULTS.doulistEnrichMode;
    } else if (key === 'doulistEnrichSource') {
      if (!['dbr', 'doubanapi', 'booksource'].includes(value)) value = DEFAULTS.doulistEnrichSource;
    }
    updates[key] = value;
  }
  if (Object.keys(updates).length) {
    await userSettingsService.saveSettings(0, updates);
  }
  return getDoulistSettings();
}

export default { getDoulistSettings, saveDoulistSettings };
