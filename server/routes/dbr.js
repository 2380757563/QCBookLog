/**
 * DBR (Douban Book Rust) 路由模块
 * 处理DBR搜索相关的API请求
 */

import express from 'express';
import dbrService from '../services/dbrService.js';

const router = express.Router();

/**
 * DBR书籍搜索
 * GET /api/dbr/search
 * @param {string} q - 搜索关键词
 * @param {number} count - 返回结果数量，默认10
 */
router.get('/search', async (req, res) => {
  try {
    const { q, count = 10 } = req.query;
    const results = await dbrService.search(q, parseInt(count));
    res.json({
      code: 0,
      msg: 'success',
      data: results
    });
  } catch (error) {
    console.error('DBR搜索路由错误:', error);
    res.status(500).json({
      code: -1,
      msg: `搜索失败: ${error.message}`
    });
  }
});

/**
 * 根据ISBN获取DBR书籍信息
 * GET /api/dbr/isbn/:isbn
 * @param {string} isbn - ISBN号码
 */
router.get('/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const result = await dbrService.getBookByIsbn(isbn);

    if (result) {
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } else {
      // 返回200状态码，错误信息在JSON中
      res.json({
        code: 404,
        msg: `未找到ISBN为 ${isbn} 的书籍`
      });
    }
  } catch (error) {
    console.error('DBR ISBN查询路由错误:', error);
    res.status(500).json({
      code: -1,
      msg: `ISBN查询失败: ${error.message}`
    });
  }
});

/**
 * 根据ID获取DBR书籍信息
 * GET /api/dbr/id/:id
 * @param {string} id - 书籍ID
 */
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbrService.getBookById(id);

    if (result) {
      res.json({
        code: 0,
        msg: 'success',
        data: result
      });
    } else {
      // 返回200状态码，错误信息在JSON中
      res.json({
        code: 404,
        msg: `未找到ID为 ${id} 的书籍`
      });
    }
  } catch (error) {
    console.error('DBR ID查询路由错误:', error);
    res.status(500).json({
      code: -1,
      msg: `ID查询失败: ${error.message}`
    });
  }
});

export default router;
