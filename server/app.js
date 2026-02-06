/**
 * QC Booklog 后端服务
 * 数据本地化存储解决方案
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import axios from 'axios';
import fs from 'fs/promises';
import fsSync from 'fs';
import calibreService from './services/calibreService.js';
import activityService from './services/activityService.js';
import databaseService from './services/database/index.js';

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), '../data/logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 7401; // 触发重启

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 动态静态文件服务 - 支持任意深度的路径
app.use('/api/static/calibre/*', async (req, res, next) => {
  try {
    // 确保使用最新的书库目录
    calibreService.updateBookDir();
    const bookDir = calibreService.getBookDir();

    // 提取通配符后的路径部分
    const wildcardPath = req.params[0];
    const filePath = path.join(bookDir, decodeURIComponent(wildcardPath));

    console.log(`📂 请求Calibre静态文件: ${filePath}`);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (err) {
      console.error(`❌ 文件不存在: ${filePath}`);
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('❌ 动态静态文件服务错误:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 版本信息路由
app.get('/api/version', (req, res) => {
  try {
    const version = JSON.parse(fsSync.readFileSync(path.join(__dirname, '../data/metadata/version.json'), 'utf8'));
    res.json(version);
  } catch (error) {
    logger.error('Failed to get version info', error);
    res.status(500).json({ error: 'Failed to get version info' });
  }
});

// 豆瓣图片中转接口（核心：完全伪装成豆瓣站内请求）
const DOUBAN_HEADERS = {
  'Referer': 'https://book.douban.com/', // 白名单域名，必带
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 Edg/143.0.0.0',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Connection': 'keep-alive',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-User': '?1'
};

// 多域名轮换（避免单域名被封，提升稳定性）
// 移除img4.doubanio.com，因为它无法解析
const DOUBAN_DOMAINS = [
  'img1.doubanio.com',
  'img9.doubanio.com',
  'img2.doubanio.com',
  'img3.doubanio.com'
];

// 中转接口：前端直接请求 /api/douban/cover/:coverId
app.get('/api/douban/cover/:coverId', async (req, res) => {
  const { coverId } = req.params;
  const randomDomain = DOUBAN_DOMAINS[Math.floor(Math.random() * DOUBAN_DOMAINS.length)];
  const doubanUrl = `https://${randomDomain}/view/subject/l/public/${coverId}.jpg`;

  try {
    console.log(`📤 开始转发图片请求，ID: ${coverId}, URL: ${doubanUrl}`);
    // 后端发起请求（完全自定义请求头，不受浏览器限制）
    const response = await axios.get(doubanUrl, {
      headers: { ...DOUBAN_HEADERS, Host: randomDomain }, // 动态匹配Host
      responseType: 'stream',
      timeout: 15000,
      maxRedirects: 5
    });

    console.log(`✅ 成功获取豆瓣图片，状态码: ${response.status}`);
    // 转发图片流 + 优化缓存
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 缓存7天
    res.setHeader('X-Proxy-Source', 'QC-booklog-Backend'); // 自定义响应头，便于调试

    // 管道传输图片数据到前端
    response.data.pipe(res);

    // 处理流错误
    response.data.on('error', (err) => {
      logger.error('图片流传输错误:', err);
      res.status(500).end();
    });

  } catch (err) {
    console.error(`❌ 封面中转失败（ID: ${coverId}）:`);
    console.error(`   错误类型: ${err.name}`);
    console.error(`   错误消息: ${err.message}`);
    console.error(`   完整错误:`, err);
    logger.error(`封面中转失败（ID: ${coverId}）:`, err);
    // 直接返回404，让前端处理降级，避免依赖外部服务
    res.status(404).end();
  }
});

// 阿里云OSS图片请求头
const ALIYUN_OSS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Referer': 'http://localhost:7402/', // 模拟前端请求的Referer
  'Origin': 'http://localhost:7402' // 模拟前端请求的Origin
};

// 阿里云OSS图片中转接口
app.get('/api/aliyun-oss-image/:imagePath*', async (req, res) => {
  // 合并路径参数，处理带多个斜杠的情况
  const imagePath = req.params.imagePath + (req.params[0] || '');
  const aliyunUrl = `https://data-isbn.oss-cn-hangzhou.aliyuncs.com/${imagePath}`;

  try {
    console.log(`📤 开始转发阿里云OSS图片请求，路径: ${imagePath}, URL: ${aliyunUrl}`);
    // 后端发起请求（添加合适的请求头，避免403错误）
    const response = await axios.get(aliyunUrl, {
      headers: ALIYUN_OSS_HEADERS,
      responseType: 'stream',
      timeout: 15000,
      maxRedirects: 5
    });

    console.log(`✅ 成功获取阿里云OSS图片，状态码: ${response.status}`);
    // 转发图片流 + 优化缓存
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 缓存7天
    res.setHeader('X-Proxy-Source', 'QC-booklog-Backend'); // 自定义响应头，便于调试

    // 管道传输图片数据到前端
    response.data.pipe(res);

    // 处理流错误
    response.data.on('error', (err) => {
      logger.error('阿里云OSS图片流传输错误:', err);
      res.status(500).end();
    });

  } catch (err) {
    console.error(`❌ 阿里云OSS图片中转失败（路径: ${imagePath}）:`);
    console.error(`   错误类型: ${err.name}`);
    console.error(`   错误消息: ${err.message}`);
    console.error(`   完整错误:`, err);
    logger.error(`阿里云OSS图片中转失败（路径: ${imagePath}）:`, err);
    // 直接返回404，让前端处理降级，避免依赖外部服务
    res.status(404).end();
  }
});

// 导入路由模块
import bookRoutes from './routes/books/index.js';
import groupRoutes from './routes/groups.js';
import tagRoutes from './routes/tags.js';
import bookmarkRoutes from './routes/bookmarks.js';
import backupRoutes from './routes/backup.js';
import dbrRoutes from './routes/dbr.js';
import syncRoutes from './routes/sync.js';
import configRoutes from './routes/config/index.js';
import readingStatusRoutes from './routes/readingstatus.js';
import qcGroupsRoutes from './routes/qcGroups.js';
import qcBookmarksRoutes from './routes/qcBookmarks.js';
import readerRoutes from './routes/readers.js';
import readingGoalsRoutes from './routes/readingGoals.js';
import readingHeatmapRoutes from './routes/readingHeatmap.js';
import readingTrackingRoutes from './routes/readingTracking.js';
import wishlistRoutes from './routes/wishlist.js';
import activitiesRoutes from './routes/activities.js';
import dbrService from './services/dbrService.js';

// 注册路由
app.use('/api/books', bookRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/dbr', dbrRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/config', configRoutes);
app.use('/api/readingstatus', readingStatusRoutes);
app.use('/api/qc/groups', qcGroupsRoutes);
app.use('/api/qc/bookmarks', qcBookmarksRoutes);
app.use('/api/readers', readerRoutes);
app.use('/api/reading-goals', readingGoalsRoutes);
app.use('/api/reading-heatmap', readingHeatmapRoutes);
app.use('/api/reading', readingTrackingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/activities', activitiesRoutes);

// 探数图书API代理（解决CORS问题）
app.get('/api/tanshu/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const apiKey = 'bc621345d6f1908f5fff0c062708ed1d';

    console.log(`🔍 探数图书API请求，ISBN: ${isbn}`);

    const response = await axios.get('https://api.tanshuapi.com/api/isbn_base/v1/index', {
      params: {
        key: apiKey,
        isbn: isbn
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`✅ 探数图书API响应:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`❌ 探数图书API错误:`, error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '探数图书API调用失败' });
    }
  }
});

// 豆瓣图书API代理（使用GET请求，解决403问题）
app.get('/api/douban/v2/book/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const apiKey = '0ac44ae016490db2204ce0a042db2916';

    console.log(`🔍 豆瓣图书API请求，ISBN: ${isbn}`);

    const response = await axios.get(
      `https://api.douban.com/v2/book/isbn/${isbn}`,
      {
        params: {
          apikey: apiKey
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 15000
      }
    );

    console.log(`✅ 豆瓣图书API响应成功，书名: ${response.data.title || '无'}`);

    // 处理译者，合并到作者字段
    const data = response.data;
    if (data.translator && Array.isArray(data.translator) && data.translator.length > 0) {
      const translatorStr = data.translator.join(' & ');
      if (data.author && Array.isArray(data.author)) {
        if (data.author.length > 0) {
          // 将译者合并到最后一个作者后
          data.author[data.author.length - 1] = `${data.author[data.author.length - 1]} & ${translatorStr}`;
        } else {
          // 如果没有作者，译者作为作者
          data.author = [translatorStr];
        }
      }
    }

    res.json(data);
  } catch (error) {
    console.error(`❌ 豆瓣图书API错误:`, error.message);
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   响应数据:`, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '豆瓣图书API调用失败', message: error.message });
    }
  }
});

// 公共图书API代理（解决CORS问题）
app.get('/api/isbn-work/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const apiKey = 'ae1718d4587744b0b79f940fbef69e77';

    console.log(`🔍 公共图书API请求，ISBN: ${isbn}`);

    const response = await axios.get('http://data.isbn.work/openApi/getInfoByIsbn', {
      params: {
        appKey: apiKey,
        isbn: isbn
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`✅ 公共图书API响应:`, response.data);
    res.json(response.data);
  } catch (error) {
    console.error(`❌ 公共图书API错误:`, error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '公共图书API调用失败' });
    }
  }
});

// 性能监控路由
app.get('/api/performance/metrics', (req, res) => {
  try {
    const metrics = {
      calibre: calibreService.getPerformanceMetrics(),
      dbr: dbrService.getPerformanceMetrics(),
      timestamp: new Date().toISOString()
    };
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get performance metrics', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// 性能报告路由
app.get('/api/performance/report', (req, res) => {
  try {
    calibreService.printPerformanceReport();
    dbrService.printPerformanceReport();
    res.json({ message: 'Performance report printed to console' });
  } catch (error) {
    logger.error('Failed to print performance report', error);
    res.status(500).json({ error: 'Failed to print performance report' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  console.log(`Server is running on http://localhost:${PORT}`);

  // 显示数据库服务状态
  console.log(`\n📊 数据库服务状态:`);
  console.log(`   - 初始化状态: ${databaseService._initialized ? '✅ 已初始化' : '❌ 未初始化'}`);
  console.log(`   - Calibre数据库: ${databaseService.connectionManager?.calibreDb ? '✅ 已连接' : '❌ 未连接'}`);
  console.log(`   - Talebook数据库: ${databaseService.connectionManager?.talebookDb ? '✅ 已连接' : '❌ 未连接'}`);
  console.log(`   - Calibre路径: ${databaseService.connectionManager?.config?.calibrePath || '未配置'}`);
  console.log(`   - Talebook路径: ${databaseService.connectionManager?.config?.talebookPath || '未配置'}`);

  // 显示当前配置的数据库路径
  const currentDbPath = calibreService.getBookDir();
  console.log(`\n📚 当前 Calibre 书库目录: ${currentDbPath}`);
  console.log(`✅ 如果需要切换书库，请访问: http://localhost:${PORT}/config`);
  console.log('');
});

// 导出app和logger
// export { app, logger };