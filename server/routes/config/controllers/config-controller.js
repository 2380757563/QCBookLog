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

      const pathExists = currentDbPath ? fs.existsSync(currentDbPath) : false;

      console.log('📋 GET /api/config/calibre-path - 返回配置:', {
        configCalibrePath: config.calibrePath,
        currentDbPath,
        pathExists
      });

      res.json({
        success: true,
        calibreDbPath: currentDbPath,
        exists: pathExists
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
      const { calibrePath } = req.body;
      console.log('📝 POST /api/config/calibre-path - 新路径:', calibrePath);

      // 如果是目录路径，自动添加 metadata.db
      let dbPath = calibrePath;
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
      const { calibrePath } = req.body;
      console.log('🔍 POST /api/config/validate-calibre - 验证路径:', calibrePath);

      // 如果是目录路径，自动添加 metadata.db
      let dbPath = calibrePath;
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

      const pathExists = currentDbPath ? fs.existsSync(currentDbPath) : false;

      console.log('📋 GET /api/config/talebook-path - 返回配置:', {
        configTalebookPath: config.talebookPath,
        currentDbPath,
        pathExists
      });

      res.json({
        success: true,
        talebookDbPath: currentDbPath,
        exists: pathExists
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
      const { talebookPath } = req.body;
      console.log('📝 POST /api/config/talebook-path - 新路径:', talebookPath);

      // 如果是目录路径，自动添加 calibre-webserver.db
      let dbPath = talebookPath;
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
      const { talebookPath } = req.body;
      console.log('🔍 POST /api/config/validate-talebook - 验证路径:', talebookPath);

      // 如果是目录路径，自动添加 calibre-webserver.db
      let dbPath = talebookPath;
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
}

export default new ConfigController();
