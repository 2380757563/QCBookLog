/**
 * 配置路由 - 用于配置 Calibre 和 Talebook 书库路径
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import crypto from 'crypto';
import databaseService, { initPromise } from '../services/database/index.js';
import calibreService from '../services/calibreService.js';
import syncService from '../services/syncService.js';

const router = express.Router();

// 配置文件路径
const CONFIG_FILE = path.join(process.cwd(), 'data/metadata/config.json');

// 中间件：确保数据库服务已初始化
router.use(async (req, res, next) => {
  try {
    await initPromise;
    next();
  } catch (error) {
    console.error('❌ 等待数据库服务初始化失败:', error);
    // 继续执行，让具体的路由处理未初始化的情况
    next();
  }
});

/**
 * 读取配置文件
 */
const readConfig = async () => {
  try {
    const configData = await fsPromises.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    // 文件不存在，返回默认配置
    return {
      calibrePath: null,
      calibreDir: null,
      talebookPath: null,
      isDefault: false
    };
  }
};

/**
 * 保存配置文件
 */
const saveConfig = async (config) => {
  const configDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    await fsPromises.mkdir(configDir, { recursive: true });
  }
  await fsPromises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
};

// 延迟加载better-sqlite3
let Database = null;
const loadDatabase = async () => {
  if (!Database) {
    try {
      Database = (await import('better-sqlite3')).default;
      if (!Database) {
        throw new Error('better-sqlite3 模块加载失败');
      }
    } catch (error) {
      console.error('❌ better-sqlite3 加载失败:', error.message);
      throw new Error('数据库支持不可用。请确保已安装 better-sqlite3：npm install better-sqlite3 --build-from-source');
    }
  }
  return Database;
};

/**
 * 获取 Calibre 数据库路径配置
 */
router.get('/calibre-path', async (req, res) => {
  try {
    console.log('📋 GET /api/config/calibre-path 开始处理请求');

    // 先读取持久化配置
    const config = await readConfig();
    console.log('📋 读取到的配置:', config);

    // 确定最终路径：优先使用配置文件中的路径
    // 如果配置文件中有路径，直接使用；否则尝试从数据库服务获取
    let calibrePath;
    if (config.calibrePath) {
      calibrePath = config.calibrePath;
      console.log('✅ 使用配置文件中的 calibrePath:', calibrePath);
    } else {
      try {
        if (databaseService._initialized) {
          calibrePath = databaseService.getDbPath();
          console.log('✅ 从数据库服务获取 calibrePath:', calibrePath);
        } else {
          console.log('⚠️ 数据库服务未初始化，使用默认路径');
          calibrePath = path.join(process.cwd(), 'data/calibre/metadata.db');
        }
      } catch (e) {
        console.error('❌ 从数据库服务获取路径失败:', e);
        // 如果数据库服务未初始化，使用默认路径
        calibrePath = path.join(process.cwd(), 'data/calibre/metadata.db');
      }
    }

    const pathExists = fs.existsSync(calibrePath);
    let pathValid = pathExists;
    let pathError = null;
    let dbStats = null;

    // 检查数据库有效性
    if (pathExists) {
      try {
        const Database = await loadDatabase();
        const testDb = new Database(calibrePath, { readonly: true });

        // 检查必要的表
        const tables = testDb.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table'
          AND name IN ('books', 'library_id')
        `).all();

        const tableNames = tables.map(t => t.name);

        if (!tableNames.includes('books') || !tableNames.includes('library_id')) {
          pathValid = false;
          pathError = '不是有效的 Calibre 数据库（缺少 books 或 library_id 表）';
          console.log('❌ Calibre 数据库结构无效:', pathError);
        } else {
          // 获取统计信息
          dbStats = {
            bookCount: testDb.prepare('SELECT COUNT(*) as count FROM books').get().count,
            libraryUuid: testDb.prepare('SELECT uuid FROM library_id LIMIT 1').get()?.uuid
          };
        }

        testDb.close();
      } catch (dbError) {
        pathValid = false;
        pathError = `数据库验证失败: ${dbError.message}`;
        console.error('❌ Calibre 数据库验证失败:', dbError);
      }
    } else {
      pathError = 'Calibre 数据库文件不存在';
    }

    console.log('📋 GET /api/config/calibre-path - 返回配置:', {
      configCalibrePath: config.calibrePath,
      calibreDir: config.calibreDir,
      isDefault: config.isDefault,
      calibrePath: calibrePath,
      pathExists: pathExists,
      pathValid: pathValid,
      pathError: pathError,
      dbStats: dbStats,
      lastUpdated: config.lastUpdated
    });

    res.json({
      success: true,
      calibreDbPath: calibrePath,
      calibreDir: config.calibreDir || path.dirname(calibrePath),
      exists: pathExists,
      valid: pathValid,
      error: pathError,
      isDefault: config.isDefault || false,
      stats: dbStats,
      needsReconfig: !pathValid && pathExists
    });
  } catch (error) {
    console.error('❌ GET /api/config/calibre-path 错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      needsReconfig: true
    });
  }
});

/**
 * 设置 Calibre 数据库路径
 */
router.post('/calibre-path', async (req, res) => {
  try {
    console.log('📥 收到配置请求:', req.body);

    // 兼容两种字段名：calibrePath 和 calibreDir
    let inputPath = req.body.calibreDir || req.body.calibrePath;
    const { isDefault = false } = req.body;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        error: 'Calibre 目录路径不能为空'
      });
    }

    // 解析为绝对路径
    let absolutePath = path.resolve(inputPath);
    let dbPath;

    // 检查是否已经是数据库文件路径（包含 metadata.db）
    if (inputPath.includes('metadata.db')) {
      // 提取目录路径
      absolutePath = path.dirname(absolutePath);
      dbPath = path.join(absolutePath, 'metadata.db');
    } else {
      dbPath = path.join(absolutePath, 'metadata.db');
    }

    // 验证目录存在
    if (!fs.existsSync(absolutePath)) {
      return res.status(400).json({
        success: false,
        error: '目录不存在: ' + absolutePath
      });
    }

    // 验证 metadata.db 存在
    if (!fs.existsSync(dbPath)) {
      return res.status(400).json({
        success: false,
        error: 'metadata.db 不存在于: ' + dbPath
      });
    }

    // 验证是否是有效的 Calibre 数据库
    try {
      const Database = await loadDatabase();
      const testDb = new Database(dbPath, { readonly: true });

      // 检查必要的表
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name IN ('books', 'library_id')
      `).all();

      const tableNames = tables.map(t => t.name);

      if (!tableNames.includes('books') || !tableNames.includes('library_id')) {
        testDb.close();
        return res.status(400).json({
          success: false,
          error: '不是有效的 Calibre 数据库（缺少 books 或 library_id 表）'
        });
      }

      // 获取统计信息
      const bookCount = testDb.prepare('SELECT COUNT(*) as count FROM books').get().count;
      const libraryInfo = testDb.prepare('SELECT uuid FROM library_id LIMIT 1').get();
      testDb.close();

      // 保存到环境变量（临时）或配置文件
      process.env.CALIBRE_DB_PATH = dbPath;

      // 更新数据库服务的连接
      console.log('🔄 更新数据库服务到:', dbPath);

      try {
        let result;
        if (req.body.talebookDir) {
          result = await databaseService.updateTalebookDbPath(dbPath);
        } else {
          result = await databaseService.updateCalibreDbPath(dbPath);
        }
        console.log('✅ 数据库服务更新结果:', result);
      } catch (updateError) {
        console.error('❌ 数据库服务更新异常:', updateError);
        console.error('❌ 异常类型:', updateError.constructor.name);
        throw updateError; // 重新抛出，让外层 catch 捕获
      }

      // 更新 calibreService 的书库目录
      console.log('🔄 更新 calibreService 书库目录...');
      calibreService.updateBookDir();
      console.log('✅ calibreService 书库目录已更新');

      // 更新配置后，需要清除缓存并重新初始化相关服务
      console.log('🔄 清除 calibreService 缓存...');
      calibreService.clearAllCache();
      console.log('✅ calibreService 缓存已清除');

      // 保存到持久化配置文件，保留原有配置
      console.log('💾 保存配置到文件...');
      const existingConfig = await readConfig();
      await saveConfig({
        ...existingConfig, // 保留原有配置
        calibrePath: dbPath,
        calibreDir: absolutePath,
        isDefault: isDefault,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ 配置已保存到文件');

      res.json({
        success: true,
        message: 'Calibre 数据库路径设置成功',
        calibreDbPath: dbPath,
        calibreDir: absolutePath,
        isDefault: isDefault,
        stats: {
          bookCount,
          libraryUuid: libraryInfo?.uuid
        }
      });

    } catch (error) {
      console.error('❌ 验证 Calibre 数据库失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      return res.status(500).json({
        success: false,
        error: '验证 Calibre 数据库失败: ' + error.message
      });
    }
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 验证 Calibre 数据库
 */
router.post('/validate-calibre', async (req, res) => {
  try {
    console.log('🔍 验证 Calibre 数据库:', req.body);

    const { calibreDir } = req.body;

    // 如果是相对路径，解析为项目目录下的路径
    let absolutePath = calibreDir;
    if (!path.isAbsolute(calibreDir)) {
      const projectRoot = path.join(process.cwd(), '..');
      absolutePath = path.resolve(projectRoot, calibreDir);
    } else {
      absolutePath = path.resolve(calibreDir);
    }
    
    let dbPath;
    // 检查是否已经是数据库文件路径
    if (absolutePath.endsWith('.db')) {
      dbPath = absolutePath;
      absolutePath = path.dirname(absolutePath);
    } else {
      dbPath = path.join(absolutePath, 'metadata.db');
    }

    if (!fs.existsSync(dbPath)) {
      return res.json({
        success: false,
        error: 'metadata.db 文件不存在'
      });
    }

    const Database = await loadDatabase();
    const testDb = new Database(dbPath, { readonly: true });

    console.log('📋 验证数据库路径:', dbPath);
    
    // Calibre 数据库必需的表和字段
    const calibreRequiredTables = {
      books: ['id', 'title', 'timestamp', 'pubdate', 'uuid', 'has_cover', 'path', 'series_index', 'author_sort', 'last_modified'],
      authors: ['id', 'name', 'sort'],
      books_authors_link: ['book', 'author'],
      publishers: ['id', 'name'],
      books_publishers_link: ['book', 'publisher'],
      identifiers: ['id', 'book', 'type', 'val'],
      comments: ['id', 'book', 'text'],
      ratings: ['id', 'rating'],
      books_ratings_link: ['book', 'rating'],
      tags: ['id', 'name'],
      books_tags_link: ['book', 'tag'],
      languages: ['id', 'lang_code'],
      books_languages_link: ['book', 'lang_code'],
      series: ['id', 'name'],
      books_series_link: ['book', 'series'],
      library_id: ['id', 'uuid']
    };
    
    // 检查所有必需的表和字段
    let allValid = true;
    const missingTables = [];
    const missingFields = [];
    
    for (const [tableName, requiredFields] of Object.entries(calibreRequiredTables)) {
      const tableInfo = testDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).get(tableName);
      
      if (!tableInfo) {
        missingTables.push(tableName);
        allValid = false;
        continue;
      }
      
      // 检查字段
      const columns = testDb.prepare(`PRAGMA table_info(${tableName})`).all();
      const columnNames = columns.map(col => col.name);
      
      for (const field of requiredFields) {
        if (!columnNames.includes(field)) {
          missingFields.push(`${tableName}.${field}`);
          allValid = false;
        }
      }
    }
    
    if (!allValid) {
      testDb.close();
      console.log('❌ 数据库结构不完整:', {
        missingTables,
        missingFields
      });
      return res.json({
        success: false,
        error: `数据库结构不完整。缺少表: ${missingTables.join(', ') || '无'}，缺少字段: ${missingFields.join(', ') || '无'}`
      });
    }

    const bookCount = testDb.prepare('SELECT COUNT(*) as count FROM books').get().count;
    const libraryInfo = testDb.prepare('SELECT uuid FROM library_id LIMIT 1').get();
    testDb.close();

    res.json({
      success: true,
      message: '有效的 Calibre 数据库',
      stats: {
        bookCount,
        libraryUuid: libraryInfo?.uuid,
        dbPath
      }
    });
  } catch (error) {
    console.error('❌ 验证Calibre数据库失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 检测所有数据库状态
 */
router.get('/check-databases', async (req, res) => {
  try {
    console.log('🔍 检测所有数据库状态');
    
    const result = {
      calibre: {
        exists: false,
        valid: false,
        error: null
      },
      talebook: {
        exists: false,
        valid: false,
        error: null
      }
    };
    
    // 检测 Calibre 数据库
    try {
      const config = await readConfig();
      const calibreDbPath = config.calibrePath || path.join(process.cwd(), 'data/calibre/metadata.db');
      
      // 检查文件是否存在
      if (fs.existsSync(calibreDbPath)) {
        result.calibre.exists = true;
        
        // 检查数据库结构完整性
        const Database = await loadDatabase();
        const testDb = new Database(calibreDbPath, { readonly: true });
        
        // Calibre 数据库必需的表和字段
        const calibreRequiredTables = {
          books: ['id', 'title', 'timestamp', 'pubdate', 'uuid', 'has_cover', 'path', 'series_index', 'author_sort', 'last_modified'],
          authors: ['id', 'name', 'sort'],
          books_authors_link: ['book', 'author'],
          publishers: ['id', 'name'],
          books_publishers_link: ['book', 'publisher'],
          identifiers: ['id', 'book', 'type', 'val'],
          comments: ['id', 'book', 'text'],
          ratings: ['id', 'rating'],
          books_ratings_link: ['book', 'rating'],
          tags: ['id', 'name'],
          books_tags_link: ['book', 'tag'],
          languages: ['id', 'lang_code'],
          books_languages_link: ['book', 'lang_code'],
          series: ['id', 'name'],
          books_series_link: ['book', 'series'],
          library_id: ['id', 'uuid']
        };
        
        // 检查所有必需的表和字段
        let allValid = true;
        const missingTables = [];
        const missingFields = [];
        
        for (const [tableName, requiredFields] of Object.entries(calibreRequiredTables)) {
          const tableInfo = testDb.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name=?
          `).get(tableName);
          
          if (!tableInfo) {
            missingTables.push(tableName);
            allValid = false;
            continue;
          }
          
          // 检查字段
          const columns = testDb.prepare(`PRAGMA table_info(${tableName})`).all();
          const columnNames = columns.map(col => col.name);
          
          for (const field of requiredFields) {
            if (!columnNames.includes(field)) {
              missingFields.push(`${tableName}.${field}`);
              allValid = false;
            }
          }
        }
        
        if (allValid) {
          result.calibre.valid = true;
        } else {
          result.calibre.valid = false;
          result.calibre.error = `Calibre数据库结构不完整。缺少表: ${missingTables.join(', ') || '无'}，缺少字段: ${missingFields.join(', ') || '无'}`;
        }
        
        testDb.close();
      } else {
        result.calibre.error = 'Calibre数据库文件不存在';
      }
    } catch (error) {
      result.calibre.error = `Calibre数据库检测失败: ${error.message}`;
    }
    
    // 检测 Talebook 数据库
    try {
      const config = await readConfig();
      const talebookDbPath = config.talebookPath || path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
      
      // 检查文件是否存在
      if (fs.existsSync(talebookDbPath)) {
        result.talebook.exists = true;
        
        // 检查数据库结构完整性
        const Database = await loadDatabase();
        const testDb = new Database(talebookDbPath, { readonly: true });
        
        // Talebook 数据库必需的表和字段
        const talebookRequiredTables = {
          items: ['book_id', 'book_type', 'count_guest', 'count_visit', 'count_download', 'website', 'collector_id', 'sole', 'book_count', 'create_time'],
          comments: ['id', 'item_id', 'content', 'created'],
          users: ['id', 'username', 'name', 'email', 'avatar', 'admin', 'active', 'created_at'],
          qc_groups: ['id', 'name', 'description', 'created_at', 'updated_at'],
          qc_book_groups: ['id', 'book_id', 'group_id'],
          qc_bookmarks: ['id', 'book_id', 'book_title', 'book_author', 'content', 'note', 'page', 'created_at', 'updated_at'],
          qc_bookmark_tags: ['id', 'bookmark_id', 'tag_id', 'tag_name'],
          qc_tags: ['id', 'name', 'created_at', 'updated_at'],
          reading_state: ['book_id', 'reader_id', 'favorite', 'favorite_date', 'wants', 'wants_date', 'read_state', 'read_date', 'online_read', 'download'],
          qc_bookdata: ['book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'note'],
          qc_reading_records: ['id', 'book_id', 'reader_id', 'start_time', 'end_time', 'duration', 'start_page', 'end_page', 'pages_read', 'notes', 'created_at'],
          qc_daily_reading_stats: ['id', 'reader_id', 'date', 'total_books', 'total_pages', 'total_time', 'created_at', 'updated_at'],
          reading_goals: ['id', 'reader_id', 'year', 'target', 'completed', 'created_at', 'updated_at']
        };
        
        // 检查所有必需的表和字段
        let allValid = true;
        const missingTables = [];
        const missingFields = [];
        
        for (const [tableName, requiredFields] of Object.entries(talebookRequiredTables)) {
          const tableInfo = testDb.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name=?
          `).get(tableName);
          
          if (!tableInfo) {
            missingTables.push(tableName);
            allValid = false;
            continue;
          }
          
          // 检查字段
          const columns = testDb.prepare(`PRAGMA table_info(${tableName})`).all();
          const columnNames = columns.map(col => col.name);
          
          for (const field of requiredFields) {
            if (!columnNames.includes(field)) {
              missingFields.push(`${tableName}.${field}`);
              allValid = false;
            }
          }
        }
        
        if (allValid) {
          result.talebook.valid = true;
        } else {
          result.talebook.valid = false;
          result.talebook.error = `Talebook数据库结构不完整。缺少表: ${missingTables.join(', ') || '无'}，缺少字段: ${missingFields.join(', ') || '无'}`;
        }
        
        testDb.close();
      } else {
        result.talebook.error = 'Talebook数据库文件不存在';
      }
    } catch (error) {
      result.talebook.error = `Talebook数据库检测失败: ${error.message}`;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 创建新数据库
 */
router.post('/create-database', async (req, res) => {
  try {
    console.log('📥 创建新数据库请求:', req.body);
    
    const { dbType, dbPath } = req.body;
    
    if (!dbType || !dbPath) {
      return res.status(400).json({
        success: false,
        error: '数据库类型和路径不能为空'
      });
    }
    
    // 如果是相对路径，解析为项目目录下的 data 子目录
    let absolutePath = dbPath;
    if (!path.isAbsolute(dbPath)) {
      const projectRoot = path.join(process.cwd(), '..');
      absolutePath = path.resolve(projectRoot, dbPath);
    }
    
    const dbFileName = dbType === 'calibre' ? 'metadata.db' : 'calibre-webserver.db';
    const fullDbPath = path.join(absolutePath, dbFileName);
    
    // 确保目录存在
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }
    
    // 检查目录是否可写
    fs.accessSync(absolutePath, fs.constants.W_OK);
    
    const Database = await loadDatabase();
    const newDb = new Database(fullDbPath);
    
    if (dbType === 'calibre') {
      console.log('📦 开始创建 Calibre 数据库表结构...');
      // 创建 Calibre 数据库表结构
      newDb.exec(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          timestamp INTEGER,
          pubdate INTEGER,
          path TEXT NOT NULL,
          uuid TEXT NOT NULL,
          has_cover INTEGER DEFAULT 0,
          series_index REAL DEFAULT 1,
          author_sort TEXT,
          last_modified INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort TEXT
        );
        
        CREATE TABLE IF NOT EXISTS books_authors_link (
          book INTEGER,
          author INTEGER,
          PRIMARY KEY (book, author)
        );
        
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book INTEGER,
          text TEXT
        );
        
        CREATE TABLE IF NOT EXISTS publishers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS books_publishers_link (
          book INTEGER,
          publisher INTEGER,
          PRIMARY KEY (book, publisher)
        );
        
        CREATE TABLE IF NOT EXISTS series (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS books_series_link (
          book INTEGER,
          series INTEGER,
          PRIMARY KEY (book, series)
        );
        
        CREATE TABLE IF NOT EXISTS identifiers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book INTEGER,
          type TEXT,
          val TEXT
        );
        
        CREATE TABLE IF NOT EXISTS ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rating INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS books_ratings_link (
          book INTEGER,
          rating INTEGER,
          PRIMARY KEY (book, rating)
        );
        
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS books_tags_link (
          book INTEGER,
          tag INTEGER,
          PRIMARY KEY (book, tag)
        );
        
        CREATE TABLE IF NOT EXISTS languages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lang_code TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS books_languages_link (
          book INTEGER,
          lang_code INTEGER,
          PRIMARY KEY (book, lang_code)
        );
      `);
      console.log('✅ Calibre 基础表结构创建完成');
      
      // 单独创建 library_id 表
      newDb.exec(`
        CREATE TABLE IF NOT EXISTS library_id (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT NOT NULL UNIQUE
        );
      `);
      console.log('✅ library_id 表创建完成');
      
      // 验证表是否创建成功
      const tables = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('📋 当前数据库中的表:', tables.map(t => t.name));
      
      // 初始化 library_id 表数据
      const libraryCount = newDb.prepare('SELECT COUNT(*) as count FROM library_id').get().count;
      console.log('📋 library_id 表记录数:', libraryCount);
      if (libraryCount === 0) {
        const uuid = crypto.randomUUID();
        newDb.prepare('INSERT INTO library_id (uuid) VALUES (?)').run(uuid);
        console.log('✅ 已初始化 library_id 表，UUID:', uuid);
      }
    } else {
      // 创建 Talebook 数据库表结构
      console.log('📦 开始创建 Talebook 数据库表结构...');
      newDb.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_type INTEGER DEFAULT 1,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          cover TEXT,
          description TEXT,
          pubdate TEXT,
          publisher TEXT,
          isbn TEXT,
          language TEXT,
          series TEXT,
          series_index REAL,
          path TEXT NOT NULL,
          uuid TEXT NOT NULL,
          added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER,
          content TEXT,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT UNIQUE,
          avatar TEXT,
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS qc_book_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE,
          UNIQUE(book_id, group_id)
        );
        
        CREATE TABLE IF NOT EXISTS qc_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          book_title TEXT,
          book_author TEXT,
          content TEXT NOT NULL,
          note TEXT,
          page INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER,
          tag_id INTEGER,
          tag_name TEXT
        );
        
        CREATE TABLE IF NOT EXISTS qc_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS reading_state (
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          favorite_date TEXT,
          wants INTEGER DEFAULT 0,
          wants_date TEXT,
          read_state INTEGER DEFAULT 0,
          read_date TEXT,
          online_read INTEGER DEFAULT 0,
          download INTEGER DEFAULT 0,
          PRIMARY KEY (book_id, reader_id)
        );
        
        CREATE TABLE IF NOT EXISTS qc_bookdata (
          book_id INTEGER PRIMARY KEY,
          page_count INTEGER DEFAULT 0,
          standard_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          purchase_date TEXT,
          binding1 INTEGER DEFAULT 0,
          binding2 INTEGER DEFAULT 0,
          note TEXT,
          total_reading_time INTEGER DEFAULT 0,
          read_pages INTEGER DEFAULT 0,
          reading_count INTEGER DEFAULT 0,
          last_read_date DATE DEFAULT NULL,
          last_read_duration INTEGER DEFAULT 0,
          FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS qc_reading_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          duration INTEGER NOT NULL,
          start_page INTEGER NOT NULL DEFAULT 0,
          end_page INTEGER NOT NULL DEFAULT 0,
          pages_read INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS qc_daily_reading_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL,
          date DATE NOT NULL,
          total_books INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, date)
        );
        
        CREATE TABLE IF NOT EXISTS reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          target INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, year)
        );
      `);
      console.log('✅ Talebook 数据库表结构创建完成');
      
      // 初始化默认用户
      const userCount = newDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
      if (userCount === 0) {
        newDb.prepare('INSERT INTO users (id, username, name, admin, active) VALUES (1, \'default\', \'默认用户\', 1, 1)').run();
        console.log('✅ 默认用户已创建');
      }
    }

    newDb.close();

    // 创建数据库后，更新数据库服务并初始化
    console.log('🔄 更新数据库服务...');
    if (dbType === 'calibre') {
      databaseService.updateCalibreDbPath(fullDbPath);
    } else {
      databaseService.updateTalebookDbPath(fullDbPath);
    }

    // 保存到持久化配置文件
    console.log('💾 保存配置到文件...');
    const existingConfig = await readConfig();
    if (dbType === 'calibre') {
      await saveConfig({
        ...existingConfig,
        calibrePath: fullDbPath,
        calibreDir: absolutePath,
        lastUpdated: new Date().toISOString()
      });
    } else {
      await saveConfig({
        ...existingConfig,
        talebookPath: fullDbPath,
        talebookDir: absolutePath,
        lastUpdated: new Date().toISOString()
      });
    }
    console.log('✅ 配置已保存到文件');

    res.json({
      success: true,
      message: `${dbType}数据库创建成功`,
      dbPath: fullDbPath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `创建数据库失败: ${error.message}`
    });
  }
});

/**
 * 获取 Talebook 数据库路径配置
 */
router.get('/talebook-path', async (req, res) => {
  try {
    console.log('📋 GET /api/config/talebook-path 开始处理请求');

    // 读取配置文件
    const config = await readConfig();
    console.log('📋 读取到的配置:', config);

    // 确定最终路径：优先使用配置文件中的路径
    // 如果配置文件中有路径，直接使用；否则尝试从数据库服务获取
    let talebookPath;
    if (config.talebookPath) {
      talebookPath = config.talebookPath;
      console.log('✅ 使用配置文件中的 talebookPath:', talebookPath);
    } else {
      try {
        if (databaseService._initialized) {
          talebookPath = databaseService.getTalebookDbPath();
          console.log('✅ 从数据库服务获取 talebookPath:', talebookPath);
        } else {
          console.log('⚠️ 数据库服务未初始化，使用默认路径');
          talebookPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
        }
      } catch (e) {
        console.error('❌ 从数据库服务获取路径失败:', e);
        // 如果数据库服务未初始化，使用默认路径
        talebookPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
      }
    }

    const pathExists = fs.existsSync(talebookPath);
    let pathValid = pathExists;
    let pathError = null;
    let dbStats = null;

    // 检查数据库有效性
    if (pathExists) {
      try {
        const Database = await loadDatabase();
        const testDb = new Database(talebookPath, { readonly: true });

        // 检查必要的表
        const tables = testDb.prepare(`
          SELECT name FROM sqlite_master
          WHERE type='table'
          AND name IN ('items')
        `).all();

        const tableNames = tables.map(t => t.name);

        if (!tableNames.includes('items')) {
          pathValid = false;
          pathError = '不是有效的 Talebook 数据库（缺少 items 表）';
          console.log('❌ Talebook 数据库结构无效:', pathError);
        } else {
          // 获取统计信息
          dbStats = {
            bookCount: testDb.prepare('SELECT COUNT(*) as count FROM items').get().count
          };
        }

        testDb.close();
      } catch (dbError) {
        pathValid = false;
        pathError = `数据库验证失败: ${dbError.message}`;
        console.error('❌ Talebook 数据库验证失败:', dbError);
      }
    } else {
      pathError = 'Talebook 数据库文件不存在';
    }

    console.log('📋 GET /api/config/talebook-path - 返回配置:', {
      configTalebookPath: config.talebookPath,
      talebookDir: config.talebookDir,
      isDefault: config.isDefault,
      talebookPath: talebookPath,
      pathExists: pathExists,
      pathValid: pathValid,
      pathError: pathError,
      dbStats: dbStats,
      lastUpdated: config.lastUpdated
    });

    res.json({
      success: true,
      talebookDbPath: talebookPath,
      talebookDir: config.talebookDir || path.dirname(talebookPath),
      exists: pathExists,
      valid: pathValid,
      error: pathError,
      isDefault: config.isDefault || false,
      stats: dbStats,
      needsReconfig: !pathValid && pathExists
    });
  } catch (error) {
    console.error('❌ GET /api/config/talebook-path 错误:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      needsReconfig: true
    });
  }
});

/**
 * 设置 Talebook 数据库路径
 */
router.post('/talebook-path', async (req, res) => {
  try {
    // 兼容两种字段名：talebookPath 和 talebookDir
    let inputPath = req.body.talebookDir || req.body.talebookPath;
    const { isDefault = false } = req.body;

    if (!inputPath) {
      return res.status(400).json({
        success: false,
        error: 'Talebook 目录路径不能为空'
      });
    }

    // 解析为绝对路径
    let absolutePath = path.resolve(inputPath);
    let dbPath;

    // 检查是否已经是数据库文件路径（包含 calibre-webserver.db）
    if (inputPath.includes('calibre-webserver.db')) {
      // 提取目录路径
      absolutePath = path.dirname(absolutePath);
      dbPath = path.join(absolutePath, 'calibre-webserver.db');
    } else {
      dbPath = path.join(absolutePath, 'calibre-webserver.db');
    }

    // 验证目录存在
    if (!fs.existsSync(absolutePath)) {
      return res.status(400).json({
        success: false,
        error: '目录不存在: ' + absolutePath
      });
    }

    // 验证 calibre-webserver.db 存在
    if (!fs.existsSync(dbPath)) {
      return res.status(400).json({
        success: false,
        error: 'calibre-webserver.db 不存在于: ' + dbPath
      });
    }

    // 验证是否是有效的 Talebook 数据库
    try {
      const Database = await loadDatabase();
      const testDb = new Database(dbPath, { readonly: true });

      // 检查必要的表
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name IN ('items')
      `).all();

      const tableNames = tables.map(t => t.name);

      if (!tableNames.includes('items')) {
        testDb.close();
        return res.status(400).json({
          success: false,
          error: '不是有效的 Talebook 数据库（缺少 items 表）'
        });
      }

      // 获取统计信息
      const bookCount = testDb.prepare('SELECT COUNT(*) as count FROM items').get().count;
      testDb.close();

      // 保存到环境变量（临时）或配置文件
      process.env.CALIBRE_DB_PATH = dbPath;

      // 更新数据库服务的连接
      console.log('🔄 更新数据库服务到 Talebook:', dbPath);

      try {
        let result;
        if (req.body.calibreDir) {
          result = await databaseService.updateCalibreDbPath(dbPath);
        } else {
          result = await databaseService.updateTalebookDbPath(dbPath);
        }
        console.log('✅ 数据库服务更新结果:', result);
      } catch (updateError) {
        console.error('❌ databaseService.updateDbPath() 抛出异常:', updateError);
        console.error('❌ 异常类型:', updateError.constructor.name);
        throw updateError; // 重新抛出，让外层 catch 捕获
      }

      // 更新 calibreService 的书库目录
      console.log('🔄 更新 calibreService 书库目录...');
      calibreService.updateBookDir();
      console.log('✅ calibreService 书库目录已更新');

      // 清除 calibreService 的所有缓存
      console.log('🔄 清除 calibreService 缓存...');
      calibreService.clearAllCache();
      console.log('✅ calibreService 缓存已清除');

      // 保存到持久化配置文件，保留原有配置
      console.log('💾 保存配置到文件...');
      const existingConfig = await readConfig();
      await saveConfig({
        ...existingConfig, // 保留原有配置
        talebookPath: dbPath, // 保存Talebook路径到专门的字段
        talebookDir: absolutePath,
        isDefault: isDefault,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ 配置已保存到文件');

      res.json({
        success: true,
        message: 'Talebook 数据库路径设置成功',
        calibreDbPath: dbPath, // 返回 calibreDbPath 以保持前端兼容
        talebookDbPath: dbPath,
        isDefault: isDefault,
        stats: {
          bookCount
        }
      });

    } catch (error) {
      console.error('❌ 验证 Talebook 数据库失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      return res.status(500).json({
        success: false,
        error: '验证 Talebook 数据库失败: ' + error.message
      });
    }
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 验证 Talebook 数据库
 */
router.post('/validate-talebook', async (req, res) => {
  try {
    const { talebookDir } = req.body;

    // 如果是相对路径，解析为项目目录下的路径
    let absolutePath = talebookDir;
    if (!path.isAbsolute(talebookDir)) {
      const projectRoot = path.join(process.cwd(), '..');
      absolutePath = path.resolve(projectRoot, talebookDir);
    } else {
      absolutePath = path.resolve(talebookDir);
    }
    
    let dbPath;
    // 检查是否已经是数据库文件路径
    if (absolutePath.endsWith('.db')) {
      dbPath = absolutePath;
      absolutePath = path.dirname(absolutePath);
    } else {
      dbPath = path.join(absolutePath, 'calibre-webserver.db');
    }

    if (!fs.existsSync(dbPath)) {
      return res.json({
        success: false,
        error: 'calibre-webserver.db 文件不存在'
      });
    }

    // 验证是否是有效的 Talebook 数据库
    try {
      const Database = await loadDatabase();
      const testDb = new Database(dbPath, { readonly: true });

      // Talebook 数据库必需的表和字段
      const talebookRequiredTables = {
        items: ['book_id', 'book_type', 'count_guest', 'count_visit', 'count_download', 'website', 'collector_id', 'sole', 'book_count', 'create_time'],
        comments: ['id', 'item_id', 'content', 'created'],
        users: ['id', 'username', 'name', 'email', 'avatar', 'admin', 'active', 'created_at'],
        qc_groups: ['id', 'name', 'description', 'created_at', 'updated_at'],
        qc_book_groups: ['id', 'book_id', 'group_id'],
        qc_bookmarks: ['id', 'book_id', 'book_title', 'book_author', 'content', 'note', 'page', 'created_at', 'updated_at'],
        qc_bookmark_tags: ['id', 'bookmark_id', 'tag_id', 'tag_name'],
        qc_tags: ['id', 'name', 'created_at', 'updated_at'],
        reading_state: ['book_id', 'reader_id', 'favorite', 'favorite_date', 'wants', 'wants_date', 'read_state', 'read_date', 'online_read', 'download'],
        qc_bookdata: ['book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'note'],
        qc_reading_records: ['id', 'book_id', 'reader_id', 'start_time', 'end_time', 'duration', 'start_page', 'end_page', 'pages_read', 'notes', 'created_at'],
        qc_daily_reading_stats: ['id', 'reader_id', 'date', 'total_books', 'total_pages', 'total_time', 'created_at', 'updated_at'],
        reading_goals: ['id', 'reader_id', 'year', 'target', 'completed', 'created_at', 'updated_at']
      };
      
      // 检查所有必需的表和字段
      let allValid = true;
      const missingTables = [];
      const missingFields = [];
      
      for (const [tableName, requiredFields] of Object.entries(talebookRequiredTables)) {
        const tableInfo = testDb.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name=?
        `).get(tableName);
        
        if (!tableInfo) {
          missingTables.push(tableName);
          allValid = false;
          continue;
        }
        
        // 检查字段
        const columns = testDb.prepare(`PRAGMA table_info(${tableName})`).all();
        const columnNames = columns.map(col => col.name);
        
        for (const field of requiredFields) {
          if (!columnNames.includes(field)) {
            missingFields.push(`${tableName}.${field}`);
            allValid = false;
          }
        }
      }
      
      if (!allValid) {
        testDb.close();
        console.log('❌ 数据库结构不完整:', {
          missingTables,
          missingFields
        });
        return res.json({
          success: false,
          error: `数据库结构不完整。缺少表: ${missingTables.join(', ') || '无'}，缺少字段: ${missingFields.join(', ') || '无'}`
        });
      }

      // 获取统计信息
      const bookCount = testDb.prepare('SELECT COUNT(*) as count FROM items').get().count;
      testDb.close();

      res.json({
        success: true,
        message: '有效的 Talebook 数据库',
        stats: {
          bookCount,
          dbPath
        }
      });
    } catch (error) {
      return res.json({
        success: false,
        error: '不是有效的 SQLite 数据库: ' + error.message
      });
    }
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 设置默认书库
 */
router.post('/set-default', async (req, res) => {
  try {
    const { calibreDbPath, isDefault } = req.body;

    console.log('🔄 设置默认书库:', { calibreDbPath, isDefault });

    // 读取当前配置
    const config = await readConfig();

    // 更新默认标记
    config.isDefault = isDefault;
    config.lastUpdated = new Date().toISOString();

    // 保存配置
    await saveConfig(config);

    console.log(`✅ ${isDefault ? '已设为默认书库' : '已取消默认书库'}`);

    res.json({
      success: true,
      message: isDefault ? '已设为默认书库' : '已取消默认书库',
      isDefault: isDefault
    });
  } catch (error) {
    console.error('❌ 设置默认书库失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取Calibre和Talebook之间的同步状态
 */
router.get('/sync-status', async (req, res) => {
  try {
    console.log('📊 获取Calibre和Talebook同步状态');
    
    // 调用同步服务获取真实同步状态
    const syncStatus = await syncService.getSyncStatus();
    
    res.json({
      success: true,
      data: syncStatus
    });
  } catch (error) {
    console.error('❌ 获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;