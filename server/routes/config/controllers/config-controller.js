/**
 * 配置控制器类
 * 处理配置相关的业务逻辑
 */

import databaseService from '../../../services/database/index.js';
import calibreService from '../../../services/calibreService.js';
import syncService from '../../../services/syncService.js';
import pathValidator from '../validators/path-validator.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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
    return {
      calibrePath: null,
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

/**
 * 配置控制器类
 */
class ConfigController {
  /**
   * 获取 Calibre 数据库路径
   */
  async getCalibrePath(req, res) {
    try {
      console.log('📋 GET /api/config/calibre-path 开始处理请求');

      // 先读取持久化配置
      const config = await readConfig();
      console.log('📋 读取到的配置:', config);

      // 确定最终路径：优先使用配置文件中的路径
      let currentDbPath;
      if (config.calibrePath) {
        currentDbPath = config.calibrePath;
        console.log('✅ 使用配置文件中的 calibrePath:', currentDbPath);
      } else {
        try {
          if (databaseService._initialized) {
            currentDbPath = databaseService.getDbPath();
            console.log('✅ 从数据库服务获取 calibrePath:', currentDbPath);
          } else {
            console.log('⚠️ 数据库服务未初始化，使用默认路径');
            currentDbPath = path.join(process.cwd(), 'data/calibre/metadata.db');
          }
        } catch (e) {
          console.error('❌ 从数据库服务获取路径失败:', e);
          // 使用默认路径
          currentDbPath = path.join(process.cwd(), 'data/calibre/metadata.db');
        }
      }

      // 规范化路径：如果在server目录下运行，转换为相对于项目根目录的路径
      let normalizedPath = currentDbPath;
      if (normalizedPath.includes('server' + path.sep + 'data')) {
        // 将 server/data/... 转换为 data/...
        normalizedPath = normalizedPath.replace(
          path.join(process.cwd(), '..') + path.sep, 
          path.join(process.cwd()) + path.sep
        );
        // 简化：如果路径包含 server/data，移除 server 部分
        const serverDataIndex = normalizedPath.indexOf('server' + path.sep + 'data');
        if (serverDataIndex !== -1) {
          normalizedPath = path.join(
            path.dirname(process.cwd()), // 项目根目录
            normalizedPath.substring(serverDataIndex + 7) // 移除 'server/' 部分
          );
        }
      }

      const pathExists = normalizedPath ? fs.existsSync(normalizedPath) : false;

      // 额外检查数据库是否可访问和有效
      let isValid = false;
      let error = null;
      let stats = null;
      let needsReconfig = false;

      if (pathExists) {
        try {
          // 验证数据库结构
          const result = databaseService.validateCalibreSchema();
          isValid = result.isValid;
          if (!isValid) {
            error = `数据库结构无效: ${result.errors.join(', ')}`;
          } else {
            // 获取数据库统计信息
            stats = databaseService.getCalibreStats();
          }
        } catch (dbError) {
          isValid = false;
          error = `数据库验证失败: ${dbError.message}`;
          needsReconfig = true;
        }
      } else {
        needsReconfig = true;
        error = '数据库文件不存在';
      }

      console.log('📋 GET /api/config/calibre-path - 返回配置:', {
        configCalibrePath: config.calibrePath,
        originalPath: currentDbPath,
        normalizedPath: normalizedPath,
        pathExists,
        isValid,
        error,
        needsReconfig
      });

      res.json({
        success: true,
        calibreDbPath: normalizedPath,
        exists: pathExists,
        valid: isValid,
        error: error,
        needsReconfig: needsReconfig,
        stats: stats,
        isDefault: config.isDefault || false
      });
    } catch (error) {
      console.error('❌ GET /api/config/calibre-path 错误:', error);
      console.error('❌ 错误堆栈:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 设置 Calibre 数据库路径
   */
  async setCalibrePath(req, res) {
    try {
      // 支持两种参数名称：calibrePath（旧版）和 calibreDir（新版）
      const { calibrePath, calibreDir } = req.body;
      const pathParam = calibrePath || calibreDir;
      console.log('📝 POST /api/config/calibre-path - 新路径:', pathParam);

      // 如果是目录路径，自动添加 metadata.db
      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = dbPath.endsWith('\\') || dbPath.endsWith('/') 
          ? dbPath + 'metadata.db' 
          : dbPath + '\\metadata.db';
      }

      // 验证路径
      const validation = await pathValidator.validateCalibrePath(dbPath);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
          warnings: validation.warnings
        });
      }

      // 更新数据库服务路径
      databaseService.updateCalibreDbPath(dbPath);

      // 更新 Calibre 服务
      calibreService.updateBookDir();

      // 触发同步
      try {
        await syncService.syncFromCalibre();
      } catch (syncError) {
        console.warn('⚠️ 同步失败，但配置已更新:', syncError.message);
      }

      // 保存到持久化配置文件
      console.log('💾 保存配置到文件...');
      const existingConfig = await readConfig();
      await saveConfig({
        ...existingConfig,
        calibrePath: dbPath,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ 配置已保存到文件');

      res.json({
        success: true,
        calibreDbPath: dbPath,
        message: 'Calibre 数据库路径已更新',
        warnings: validation.warnings
      });
    } catch (error) {
      console.error('❌ 设置 Calibre 数据库路径失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 验证 Calibre 数据库
   */
  async validateCalibre(req, res) {
    try {
      // 支持两种参数名称：calibrePath（旧版）和 calibreDir（新版）
      const { calibrePath, calibreDir } = req.body;
      const pathParam = calibrePath || calibreDir;
      console.log('🔍 POST /api/config/validate-calibre - 验证路径:', pathParam);

      // 如果是目录路径，自动添加 metadata.db
      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = dbPath.endsWith('\\') || dbPath.endsWith('/') 
          ? dbPath + 'metadata.db' 
          : dbPath + '\\metadata.db';
      }

      // 验证路径
      const validation = await pathValidator.validateCalibrePath(dbPath);

      // 验证数据库结构
      let schemaValid = true;
      let schemaErrors = [];
      
      try {
        const result = databaseService.validateCalibreSchema();
        schemaValid = result.isValid;
        schemaErrors = result.errors;
      } catch (dbError) {
        schemaValid = false;
        schemaErrors.push(dbError.message);
      }

      res.json({
        success: schemaValid && validation.isValid,
        pathValid: validation.isValid,
        schemaValid: schemaValid,
        errors: [...validation.errors, ...schemaErrors],
        warnings: validation.warnings
      });
    } catch (error) {
      console.error('❌ 验证 Calibre 数据库失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取 Talebook 数据库路径
   */
  async getTalebookPath(req, res) {
    try {
      console.log('📋 GET /api/config/talebook-path 开始处理请求');

      // 先读取持久化配置
      const config = await readConfig();
      console.log('📋 读取到的配置:', config);

      // 确定最终路径：优先使用配置文件中的路径
      let currentDbPath;
      if (config.talebookPath) {
        currentDbPath = config.talebookPath;
        console.log('✅ 使用配置文件中的 talebookPath:', currentDbPath);
      } else {
        try {
          if (databaseService._initialized) {
            currentDbPath = databaseService.getTalebookDbPath();
            console.log('✅ 从数据库服务获取 talebookPath:', currentDbPath);
          } else {
            console.log('⚠️ 数据库服务未初始化，使用默认路径');
            currentDbPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
          }
        } catch (e) {
          console.error('❌ 从数据库服务获取路径失败:', e);
          // 使用默认路径
          currentDbPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
        }
      }

      // 规范化路径：如果在server目录下运行，转换为相对于项目根目录的路径
      let normalizedPath = currentDbPath;
      if (normalizedPath.includes('server' + path.sep + 'data')) {
        // 简化：如果路径包含 server/data，移除 server 部分
        const serverDataIndex = normalizedPath.indexOf('server' + path.sep + 'data');
        if (serverDataIndex !== -1) {
          normalizedPath = path.join(
            path.dirname(process.cwd()), // 项目根目录
            normalizedPath.substring(serverDataIndex + 7) // 移除 'server/' 部分
          );
        }
      }

      const pathExists = normalizedPath ? fs.existsSync(normalizedPath) : false;

      // 额外检查数据库是否可访问和有效
      let isValid = false;
      let error = null;
      let stats = null;
      let needsReconfig = false;

      if (pathExists) {
        try {
          // 验证数据库结构
          const result = databaseService.validateTalebookSchema();
          isValid = result.isValid;
          if (!isValid) {
            error = `数据库结构无效: ${result.errors.join(', ')}`;
          } else {
            // 获取数据库统计信息
            stats = databaseService.getTalebookStats();
          }
        } catch (dbError) {
          isValid = false;
          error = `数据库验证失败: ${dbError.message}`;
          needsReconfig = true;
        }
      } else {
        needsReconfig = true;
        error = '数据库文件不存在';
      }

      console.log('📋 GET /api/config/talebook-path - 返回配置:', {
        configTalebookPath: config.talebookPath,
        originalPath: currentDbPath,
        normalizedPath: normalizedPath,
        pathExists,
        isValid,
        error,
        needsReconfig
      });

      res.json({
        success: true,
        talebookDbPath: normalizedPath,
        exists: pathExists,
        valid: isValid,
        error: error,
        needsReconfig: needsReconfig,
        stats: stats,
        isDefault: config.isDefault || false
      });
    } catch (error) {
      console.error('❌ GET /api/config/talebook-path 错误:', error);
      console.error('❌ 错误堆栈:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 设置 Talebook 数据库路径
   */
  async setTalebookPath(req, res) {
    try {
      // 支持两种参数名称：talebookPath（旧版）和 talebookDir（新版）
      const { talebookPath, talebookDir } = req.body;
      const pathParam = talebookPath || talebookDir;
      console.log('📝 POST /api/config/talebook-path - 新路径:', pathParam);

      // 如果是目录路径，自动添加 calibre-webserver.db
      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = dbPath.endsWith('\\') || dbPath.endsWith('/') 
          ? dbPath + 'calibre-webserver.db' 
          : dbPath + '\\calibre-webserver.db';
      }

      // 验证路径
      const validation = await pathValidator.validateTalebookPath(dbPath);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
          warnings: validation.warnings
        });
      }

      // 更新数据库服务路径
      databaseService.updateTalebookDbPath(dbPath);

      // 保存到持久化配置文件
      console.log('💾 保存配置到文件...');
      const existingConfig = await readConfig();
      await saveConfig({
        ...existingConfig,
        talebookPath: dbPath,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ 配置已保存到文件');

      res.json({
        success: true,
        talebookDbPath: dbPath,
        message: 'Talebook 数据库路径已更新',
        warnings: validation.warnings
      });
    } catch (error) {
      console.error('❌ 设置 Talebook 数据库路径失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 验证 Talebook 数据库
   */
  async validateTalebook(req, res) {
    try {
      // 支持两种参数名称：talebookPath（旧版）和 talebookDir（新版）
      const { talebookPath, talebookDir } = req.body;
      const pathParam = talebookPath || talebookDir;
      console.log('🔍 POST /api/config/validate-talebook - 验证路径:', pathParam);

      // 如果是目录路径，自动添加 calibre-webserver.db
      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = dbPath.endsWith('\\') || dbPath.endsWith('/') 
          ? dbPath + 'calibre-webserver.db' 
          : dbPath + '\\calibre-webserver.db';
      }

      // 验证路径
      const validation = await pathValidator.validateTalebookPath(dbPath);

      // 验证数据库结构
      let schemaValid = true;
      let schemaErrors = [];
      
      try {
        const result = databaseService.validateTalebookSchema();
        schemaValid = result.isValid;
        schemaErrors = result.errors;
      } catch (dbError) {
        schemaValid = false;
        schemaErrors.push(dbError.message);
      }

      res.json({
        success: schemaValid && validation.isValid,
        pathValid: validation.isValid,
        schemaValid: schemaValid,
        errors: [...validation.errors, ...schemaErrors],
        warnings: validation.warnings
      });
    } catch (error) {
      console.error('❌ 验证 Talebook 数据库失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 检查数据库状态
   */
  async checkDatabases(req, res) {
    try {
      const calibreAvailable = databaseService.isCalibreAvailable();
      const talebookAvailable = databaseService.isTalebookAvailable();

      console.log('📋 GET /api/config/check-databases - 数据库状态:', {
        calibreAvailable,
        talebookAvailable
      });

      res.json({
        success: true,
        data: {
          calibre: {
            valid: calibreAvailable,
            available: calibreAvailable,
            path: databaseService.getDbPath()
          },
          talebook: {
            valid: talebookAvailable,
            available: talebookAvailable,
            path: databaseService.getTalebookDbPath()
          }
        }
      });
    } catch (error) {
      console.error('❌ 检查数据库状态失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(req, res) {
    try {
      const status = {
        calibre: {
          available: databaseService.isCalibreAvailable(),
          path: databaseService.getDbPath()
        },
        talebook: {
          available: databaseService.isTalebookAvailable(),
          path: databaseService.getTalebookDbPath()
        },
        timestamp: new Date().toISOString()
      };

      res.json(status);
    } catch (error) {
      console.error('❌ 获取系统状态失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(req, res) {
    try {
      const syncStatus = await syncService.getSyncStatus();
      res.json({
        success: true,
        status: syncStatus.status,
        message: syncStatus.message,
        data: syncStatus.data,
        errors: syncStatus.errors || []
      });
    } catch (error) {
      console.error('❌ 获取同步状态失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 创建新数据库
   */
  async createDatabase(req, res) {
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
      } else {
        absolutePath = path.resolve(dbPath);
      }
      
      // 根据数据库类型创建相应目录和数据库
      if (dbType === 'calibre') {
        // 确保目录存在
        const dbDir = path.dirname(absolutePath);
        if (!fs.existsSync(dbDir)) {
          await fsPromises.mkdir(dbDir, { recursive: true });
        }
        
        // 如果传入的是目录，自动加上 metadata.db
        const finalPath = absolutePath.endsWith('.db') ? absolutePath : path.join(absolutePath, 'metadata.db');
        
        // 如果数据库文件不存在，创建示例数据库结构
        if (!fs.existsSync(finalPath)) {
          const Database = (await import('better-sqlite3')).default;
          const db = new Database(finalPath);
          
          // 创建基本的 Calibre 数据库结构
          db.exec(`
            CREATE TABLE IF NOT EXISTS books (
              id INTEGER PRIMARY KEY,
              title TEXT NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              pubdate DATETIME,
              uuid TEXT UNIQUE,
              has_cover INTEGER DEFAULT 0,
              path TEXT,
              series_index REAL DEFAULT 1.0,
              author_sort TEXT,
              last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS library_id (
              id INTEGER PRIMARY KEY,
              uuid TEXT UNIQUE
            );
            
            CREATE TABLE IF NOT EXISTS authors (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              sort TEXT
            );
            
            CREATE TABLE IF NOT EXISTS books_authors_link (
              book INTEGER NOT NULL,
              author INTEGER NOT NULL,
              PRIMARY KEY (book, author)
            );
          `);
          
          // 插入默认库UUID
          const libUuid = 'library-' + crypto.randomUUID();
          db.prepare('INSERT INTO library_id (uuid) VALUES (?)').run(libUuid);
          
          db.close();
        }
        
        // 保存到配置
        const existingConfig = await readConfig();
        await saveConfig({
          ...existingConfig,
          calibrePath: finalPath,
          lastUpdated: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Calibre 数据库创建成功',
          dbPath: finalPath
        });
        
      } else if (dbType === 'talebook') {
        // 确保目录存在
        const dbDir = path.dirname(absolutePath);
        if (!fs.existsSync(dbDir)) {
          await fsPromises.mkdir(dbDir, { recursive: true });
        }
        
        // 如果传入的是目录，自动加上 calibre-webserver.db
        const finalPath = absolutePath.endsWith('.db') ? absolutePath : path.join(absolutePath, 'calibre-webserver.db');
        
        // 如果数据库文件不存在，创建示例数据库结构
        if (!fs.existsSync(finalPath)) {
          const Database = (await import('better-sqlite3')).default;
          const db = new Database(finalPath);
          
          // 创建基本的 Talebook 数据库结构
          db.exec(`
            CREATE TABLE IF NOT EXISTS items (
              book_id TEXT PRIMARY KEY,
              book_type TEXT DEFAULT 'book',
              count_guest INTEGER DEFAULT 0,
              count_visit INTEGER DEFAULT 0,
              count_download INTEGER DEFAULT 0,
              website TEXT,
              collector_id INTEGER DEFAULT 0,
              sole INTEGER DEFAULT 0,
              book_count INTEGER DEFAULT 0,
              create_time DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              name TEXT,
              email TEXT,
              avatar TEXT,
              admin INTEGER DEFAULT 0,
              active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS reading_state (
              book_id TEXT,
              reader_id INTEGER,
              favorite INTEGER DEFAULT 0,
              favorite_date DATETIME,
              wants INTEGER DEFAULT 0,
              wants_date DATETIME,
              read_state INTEGER DEFAULT 0,
              read_date DATETIME,
              online_read INTEGER DEFAULT 0,
              download INTEGER DEFAULT 0,
              PRIMARY KEY (book_id, reader_id)
            );
            
            CREATE TABLE IF NOT EXISTS qc_bookdata (
              book_id TEXT PRIMARY KEY,
              page_count INTEGER DEFAULT 0,
              standard_price REAL DEFAULT 0.0,
              purchase_price REAL DEFAULT 0.0,
              purchase_date DATE,
              binding1 TEXT,
              binding2 TEXT,
              note TEXT
            );
          `);
          
          // 插入默认管理员用户
          db.prepare(`
            INSERT OR IGNORE INTO users (username, name, admin, active) 
            VALUES (?, ?, ?, ?)
          `).run('admin', 'Administrator', 1, 1);
          
          db.close();
        }
        
        // 保存到配置
        const existingConfig = await readConfig();
        await saveConfig({
          ...existingConfig,
          talebookPath: finalPath,
          lastUpdated: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: 'Talebook 数据库创建成功',
          dbPath: finalPath
        });
        
      } else {
        res.status(400).json({
          success: false,
          error: '不支持的数据库类型: ' + dbType
        });
      }
    } catch (error) {
      console.error('❌ 创建数据库失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 设置默认数据库
   */
  async setDefault(req, res) {
    try {
      console.log('📥 设置默认数据库请求:', req.body);

      const { calibreDbPath, isDefault } = req.body;

      if (!calibreDbPath) {
        return res.status(400).json({
          success: false,
          error: '数据库路径不能为空'
        });
      }

      // 保存到持久化配置文件，保留原有配置
      console.log('💾 保存默认配置到文件...');
      const existingConfig = await readConfig();
      await saveConfig({
        ...existingConfig, // 保留原有配置
        isDefault: isDefault,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ 默认配置已保存到文件');

      res.json({
        success: true,
        message: '默认配置设置成功',
        isDefault: isDefault
      });
    } catch (error) {
      console.error('❌ 保存默认配置失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ConfigController();
