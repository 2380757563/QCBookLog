/**
 * 配置路由 - 用于配置 Calibre 和 Talebook 书库路径
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import databaseService from '../services/databaseService.js';
import calibreService from '../services/calibreService.js';
import syncService from '../services/syncService.js';

const router = express.Router();

// 配置文件路径
const CONFIG_FILE = path.join(process.cwd(), '../data/metadata/config.json');

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
    // 先读取持久化配置
    const config = await readConfig();

    // 获取数据库服务当前使用的路径（已经从配置文件加载）
    const currentDbPath = databaseService.getDbPath();

    // 确定最终路径：数据库服务当前路径（优先，因为已经从配置文件加载了）
    const calibrePath = currentDbPath;

    const pathExists = fs.existsSync(calibrePath);

    console.log('📋 GET /api/config/calibre-path - 当前配置:', {
      configCalibrePath: config.calibrePath,
      isDefault: config.isDefault,
      currentDbPath: currentDbPath,
      pathExists: pathExists
    });

    res.json({
      success: true,
      calibreDbPath: calibrePath,
      exists: pathExists,
      isDefault: config.isDefault || false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 设置 Calibre 数据库路径
 */
router.post('/calibre-path', async (req, res) => {
  try {
    console.log('📥 收到配置请求:', req.body);

    const { calibreDir, isDefault = false } = req.body;

    if (!calibreDir) {
      return res.status(400).json({
        success: false,
        error: 'Calibre 目录路径不能为空'
      });
    }

    // 解析为绝对路径
    const absolutePath = path.resolve(calibreDir);
    const dbPath = path.join(absolutePath, 'metadata.db');

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
      console.log('🔄 更新数据库连接到:', dbPath);

      try {
        let result;
        if (req.body.talebookDir) {
          result = databaseService.updateTalebookDbPath(dbPath);
        } else {
          result = databaseService.updateCalibreDbPath(dbPath);
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

      // 更新数据库服务的数据库路径，确保下次重启时使用新路径
      console.log('🔄 更新数据库服务配置...');
      databaseService.updateCalibreDbPath(dbPath);
      console.log('✅ 数据库服务配置已更新');

      // 重新初始化calibreService的书库目录
      console.log('🔄 更新calibreService书库目录...');
      calibreService.updateBookDir();
      console.log('✅ calibreService书库目录已更新');

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

    const absolutePath = path.resolve(calibreDir);
    const dbPath = path.join(absolutePath, 'metadata.db');

    if (!fs.existsSync(dbPath)) {
      return res.json({
        success: false,
        error: 'metadata.db 文件不存在'
      });
    }

    const Database = await loadDatabase();
    const testDb = new Database(dbPath, { readonly: true });

    // 检查必要的表
    const tables = testDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name IN ('books', 'authors', 'library_id')
    `).all();

    const tableNames = tables.map(t => t.name);

    if (!tableNames.includes('books') || !tableNames.includes('library_id')) {
      testDb.close();
      return res.json({
        success: false,
        error: '不是有效的 Calibre 数据库'
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
      const calibreDbPath = config.calibrePath || path.join(process.cwd(), '../data/book/metadata.db');
      
      // 检查文件是否存在
      if (fs.existsSync(calibreDbPath)) {
        result.calibre.exists = true;
        
        // 检查数据库结构完整性
        const Database = await loadDatabase();
        const testDb = new Database(calibreDbPath, { readonly: true });
        
        // 检查必要的表
        const tables = testDb.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name IN ('books', 'authors', 'comments', 'publishers')
        `).all();
        
        if (tables.length >= 4) {
          result.calibre.valid = true;
        } else {
          result.calibre.error = 'Calibre数据库表结构不完整';
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
      const talebookDbPath = config.talebookPath || path.join(process.cwd(), '../data/calibre-webserver.db');
      
      // 检查文件是否存在
      if (fs.existsSync(talebookDbPath)) {
        result.talebook.exists = true;
        
        // 检查数据库结构完整性
        const Database = await loadDatabase();
        const testDb = new Database(talebookDbPath, { readonly: true });
        
        // 检查必要的表
        const tables = testDb.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name IN ('items', 'groups', 'bookmarks', 'comments')
        `).all();
        
        if (tables.length >= 4) {
          result.talebook.valid = true;
        } else {
          result.talebook.error = 'Talebook数据库表结构不完整';
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
    
    const absolutePath = path.resolve(dbPath);
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
          last_modified INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
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
      `);
    } else {
      // 创建 Talebook 数据库表结构
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
        
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS item_groups (
          item_id INTEGER,
          group_id INTEGER,
          PRIMARY KEY (item_id, group_id)
        );
        
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER,
          content TEXT,
          page TEXT,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER,
          content TEXT,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    newDb.close();
    
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
    // 读取配置文件
    const config = await readConfig();
    const talebookPath = config.talebookPath || null;
    const pathExists = talebookPath ? fs.existsSync(talebookPath) : false;

    res.json({
      success: true,
      talebookDbPath: talebookPath,
      exists: pathExists
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 设置 Talebook 数据库路径
 */
router.post('/talebook-path', async (req, res) => {
  try {
    const { talebookDir, isDefault = false } = req.body;

    if (!talebookDir) {
      return res.status(400).json({
        success: false,
        error: 'Talebook 目录路径不能为空'
      });
    }

    // 解析为绝对路径
    const absolutePath = path.resolve(talebookDir);
    const dbPath = path.join(absolutePath, 'calibre-webserver.db');

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
      console.log('🔄 更新数据库连接到 Talebook:', dbPath);

      try {
        let result;
        if (req.body.calibreDir) {
          result = databaseService.updateCalibreDbPath(dbPath);
        } else {
          result = databaseService.updateTalebookDbPath(dbPath);
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

      // 更新数据库服务的Talebook数据库路径
      console.log('🔄 更新数据库服务Talebook配置...');
      databaseService.updateTalebookDbPath(dbPath);
      console.log('✅ 数据库服务Talebook配置已更新');

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

    const absolutePath = path.resolve(talebookDir);
    const dbPath = path.join(absolutePath, 'calibre-webserver.db');

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

      // 检查必要的表（Talebook 使用 items 表而不是 books 表）
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name IN ('items')
      `).all();

      const tableNames = tables.map(t => t.name);

      if (!tableNames.includes('items')) {
        testDb.close();
        return res.json({
          success: false,
          error: '不是有效的 Talebook 数据库（缺少 items 表）'
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