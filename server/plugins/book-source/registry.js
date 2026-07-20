/**
 * 书源插件注册表
 * 管理所有书源插件的注册与发现
 */

import TanshuBookSource from './tanshu/index.js';
import DoubanBookSource from './douban/index.js';
import IsbnWorkBookSource from './isbn-work/index.js';

const plugins = [
  new TanshuBookSource(),
  new DoubanBookSource(),
  new IsbnWorkBookSource()
];

export const bookSourceRegistry = {
  /**
   * 获取所有已注册插件
   */
  getAll() {
    return [...plugins];
  },

  /**
   * 根据 sourceKey 获取插件
   */
  getByKey(sourceKey) {
    return plugins.find(p => p.sourceKey === sourceKey) || null;
  },

  /**
   * 根据配置获取已启用的插件
   * @param {Object} configs - { tanshu: { apiKey }, douban: { apiKey }, ... }
   */
  getEnabled(configs) {
    return plugins.filter(p => {
      const config = configs && configs[p.sourceKey];
      return p.isEnabled(config || {});
    });
  },

  /**
   * 获取所有插件的默认配置定义
   */
  getDefaultConfigs() {
    return plugins.map(p => ({
      sourceKey: p.sourceKey,
      sourceName: p.sourceName,
      apiKey: '',
      isRequired: p.isRequired,
      description: p.description,
      sortOrder: p.sortOrder
    }));
  }
};

export default bookSourceRegistry;
