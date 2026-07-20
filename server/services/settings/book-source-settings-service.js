/**
 * 书源设置服务
 * 管理书源 API Key 的持久化、读取与插件配置同步
 */

import databaseService from '../legacy/database-service.js';
import { bookSourceRegistry } from '../../plugins/book-source/registry.js';

class BookSourceSettingsService {
  /**
   * 获取 QCBookLog 数据库实例
   */
  getDb() {
    return databaseService.getQcBooklogDb();
  }

  /**
   * 获取所有书源配置
   */
  getAll() {
    const db = this.getDb();
    if (!db) {
      return bookSourceRegistry.getDefaultConfigs();
    }

    const rows = db.prepare(`
      SELECT
        id,
        source_key AS sourceKey,
        source_name AS sourceName,
        api_key AS apiKey,
        is_required AS isRequired,
        description,
        sort_order AS sortOrder,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM qc_book_source_settings
      ORDER BY sort_order ASC, id ASC
    `).all();

    return rows.map(row => ({
      ...row,
      isRequired: !!row.isRequired
    }));
  }

  /**
   * 以 Map 形式获取所有书源配置，key 为 sourceKey
   */
  getAllAsMap() {
    const all = this.getAll();
    const map = {};
    for (const item of all) {
      map[item.sourceKey] = {
        apiKey: item.apiKey || '',
        sourceKey: item.sourceKey,
        sourceName: item.sourceName
      };
    }
    return map;
  }

  /**
   * 保存书源配置
   * @param {Array} sources - [{ sourceKey, apiKey }, ...]
   */
  save(sources) {
    const db = this.getDb();
    if (!db) {
      throw new Error('QCBookLog 数据库不可用');
    }

    const updateStmt = db.prepare(`
      UPDATE qc_book_source_settings
      SET api_key = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE source_key = ?
    `);

    const transaction = db.transaction(() => {
      for (const source of sources) {
        const { sourceKey, apiKey } = source;
        if (!sourceKey) continue;
        updateStmt.run(apiKey || '', sourceKey);
      }
    });

    transaction();
    return { success: true, message: '书源设置已保存' };
  }

  /**
   * 根据 sourceKey 获取配置
   */
  getByKey(sourceKey) {
    const all = this.getAllAsMap();
    return all[sourceKey] || { apiKey: '' };
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins() {
    const configs = this.getAllAsMap();
    return bookSourceRegistry.getEnabled(configs);
  }

  /**
   * 通过插件查询 ISBN
   * @param {string} sourceKey
   * @param {string} isbn
   */
  async searchByIsbn(sourceKey, isbn) {
    const plugin = bookSourceRegistry.getByKey(sourceKey);
    if (!plugin) {
      throw new Error(`未知书源: ${sourceKey}`);
    }

    const config = this.getByKey(sourceKey);
    if (!plugin.isEnabled(config)) {
      throw new Error(`${plugin.sourceName} API Key 未配置`);
    }

    return await plugin.searchByIsbn(isbn, config);
  }
}

export default new BookSourceSettingsService();
export { BookSourceSettingsService };
