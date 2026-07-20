/**
 * 书源设置 Handler
 * 处理 /api/book-source-settings 相关请求
 */

import bookSourceSettingsService from '../services/settings/book-source-settings-service.js';

export const bookSourceSettingsHandler = {
  /**
   * GET /api/book-source-settings
   */
  async getAll(req, res) {
    try {
      const data = await bookSourceSettingsService.getAll();
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('❌ 获取书源设置失败:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/book-source-settings
   */
  async save(req, res) {
    try {
      const { sources } = req.body;
      if (!Array.isArray(sources)) {
        return res.status(400).json({
          success: false,
          error: '参数错误：sources 必须是数组'
        });
      }

      const result = await bookSourceSettingsService.save(sources);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('❌ 保存书源设置失败:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /api/book-source/:sourceKey/isbn/:isbn
   */
  async searchByIsbn(req, res) {
    try {
      const { sourceKey, isbn } = req.params;
      const data = await bookSourceSettingsService.searchByIsbn(sourceKey, isbn);
      res.json(data);
    } catch (error) {
      console.error(`❌ 书源 ${req.params.sourceKey} 查询失败:`, error.message);
      res.status(500).json({
        error: error.message
      });
    }
  }
};

export default bookSourceSettingsHandler;
