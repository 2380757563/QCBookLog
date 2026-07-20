/**
 * 书源插件基类
 * 所有书源插件（豆瓣、探数、ISBN-WORK 等）都应继承此类
 */

export class BookSourcePlugin {
  /**
   * 插件标识，唯一，如 'tanshu' / 'douban' / 'isbn-work'
   */
  get sourceKey() {
    throw new Error('sourceKey must be implemented');
  }

  /**
   * 人类可读的名称，如 '探数图书'
   */
  get sourceName() {
    throw new Error('sourceName must be implemented');
  }

  /**
   * 是否需要 API Key
   */
  get isRequired() {
    return true;
  }

  /**
   * 插件描述
   */
  get description() {
    return '';
  }

  /**
   * 默认排序
   */
  get sortOrder() {
    return 0;
  }

  /**
   * 是否启用（默认只要配置了 key 就启用）
   * @param {Object} config - { apiKey, ... }
   */
  isEnabled(config) {
    return !!(config && config.apiKey);
  }

  /**
   * 根据 ISBN 查询图书元数据
   * @param {string} isbn
   * @param {Object} config - { apiKey, ... }
   * @returns {Promise<Object|null>} 图书元数据
   */
  async searchByIsbn(isbn, config) {
    return null;
  }

  /**
   * 根据标题搜索图书
   * @param {string} title
   * @param {Object} config
   * @returns {Promise<Array>} 图书列表
   */
  async searchByTitle(title, config) {
    return [];
  }

  /**
   * 获取最佳匹配
   * @param {Object} query - { isbn, title, author }
   * @param {Object} config
   * @returns {Promise<Object|null>}
   */
  async searchBest(query, config) {
    const { isbn, title } = query || {};
    if (isbn) {
      const result = await this.searchByIsbn(isbn, config);
      if (result) return result;
    }
    if (title) {
      const results = await this.searchByTitle(title, config);
      return results && results.length > 0 ? results[0] : null;
    }
    return null;
  }

  /**
   * 获取图书封面
   * @param {string} coverUrl
   * @param {Object} config
   * @returns {Promise<Buffer|null>}
   */
  async getCover(coverUrl, config) {
    return null;
  }
}

export default BookSourcePlugin;
