import databaseService from '../../../services/database/index.js';
import calibreService from '../../../services/calibreService.js';
import syncService from '../../../services/syncService.js';
import pathValidator from '../validators/path-validator.js';
import configManager from '../../../services/configManager.js';
import fs from 'fs';
import path from 'path';

class ConfigController {
  async getAllConfig(req, res) {
    try {
      const config = configManager.loadConfigSync();
      res.json({
        success: true,
        config: {
          calibrePath: config.calibrePath || '',
          talebookPath: config.talebookPath || '',
          calibreDir: config.calibreDir || '',
          talebookDir: config.talebookDir || '',
          tanshuApiKey: config.tanshuApiKey || '',
          doubanApiKey: config.doubanApiKey || '',
          isbnWorkApiKey: config.isbnWorkApiKey || '',
          syncInterval: config.syncInterval || 300000
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateAllConfig(req, res) {
    try {
      const newConfig = req.body;
      console.log('📝 更新配置:', newConfig);
      
      await configManager.saveConfig(newConfig);
      
      if (newConfig.calibrePath) {
        await databaseService.updateCalibreDbPath(newConfig.calibrePath);
        calibreService.updateBookDir();
      }
      
      res.json({
        success: true,
        message: '配置已更新到 .env 文件',
        config: configManager.config
      });
    } catch (error) {
      console.error('❌ 更新配置失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCalibrePath(req, res) {
    try {
      console.log('📋 [getCalibrePath] 开始获取 Calibre 配置...');
      const config = configManager.loadConfigSync();
      let currentDbPath = config.calibrePath;
      
      if (!currentDbPath && databaseService._initialized) {
        try {
          currentDbPath = databaseService.getDbPath();
        } catch (e) {
          currentDbPath = path.join(process.cwd(), 'data/calibre/metadata.db');
        }
      }

      console.log('📋 [getCalibrePath] 数据库路径:', currentDbPath);
      
      const pathExists = currentDbPath ? fs.existsSync(currentDbPath) : false;
      console.log('📋 [getCalibrePath] 文件存在:', pathExists);
      
      let isValid = false;
      let stats = null;
      let validationErrors = [];
      let needsReconfig = false;

      console.log('📋 [getCalibrePath] databaseService._initialized:', databaseService._initialized);
      console.log('📋 [getCalibrePath] connectionManager 存在:', !!databaseService.connectionManager);
      console.log('📋 [getCalibrePath] calibreDb 存在:', !!databaseService.connectionManager?.calibreDb);
      
      const connectionError = databaseService.connectionManager?.getCalibreError();
      console.log('📋 [getCalibrePath] 连接错误:', connectionError);
      
      if (connectionError) {
        validationErrors.push(`数据库连接失败: ${connectionError}`);
        needsReconfig = true;
      }

      if (pathExists && !connectionError) {
        try {
          console.log('📋 [getCalibrePath] 开始验证数据库结构...');
          const result = databaseService.validateCalibreSchema();
          console.log('📋 [getCalibrePath] 验证结果:', result);
          isValid = result.isValid;
          validationErrors = result.errors || [];
          if (isValid) {
            stats = databaseService.getCalibreStats();
          } else {
            needsReconfig = true;
            console.warn('⚠️ Calibre 数据库验证失败:', validationErrors);
          }
        } catch (e) {
          console.warn('❌ Calibre 验证异常:', e.message);
          validationErrors = [e.message];
          needsReconfig = true;
        }
      } else if (currentDbPath && !pathExists) {
        needsReconfig = true;
        validationErrors = ['数据库文件不存在'];
      }

      const response = {
        success: true,
        calibreDbPath: currentDbPath,
        exists: pathExists,
        valid: isValid,
        stats: stats,
        error: validationErrors.length > 0 ? validationErrors.join('; ') : null,
        needsReconfig: needsReconfig
      };
      console.log('📋 [getCalibrePath] 返回响应:', response);
      res.json(response);
    } catch (error) {
      console.error('❌ [getCalibrePath] 错误:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async setCalibrePath(req, res) {
    try {
      const { calibrePath, calibreDir } = req.body;
      const pathParam = calibrePath || calibreDir;
      console.log('📝 设置 Calibre 路径:', pathParam);

      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = path.join(dbPath, 'metadata.db');
      }

      const validation = await pathValidator.validateCalibrePath(dbPath);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', ')
        });
      }

      await databaseService.updateCalibreDbPath(dbPath);
      calibreService.updateBookDir();

      try {
        await syncService.syncFromCalibre();
      } catch (syncError) {
        console.warn('⚠️ 同步失败:', syncError.message);
      }

      const calibreDirPath = path.dirname(dbPath);
      const talebookPath = path.join(calibreDirPath, 'calibre-webserver.db');
      
      const newConfig = {
        calibrePath: dbPath,
        calibreDir: calibreDirPath
      };
      
      if (fs.existsSync(talebookPath)) {
        newConfig.talebookPath = talebookPath;
        newConfig.talebookDir = calibreDirPath;
      }
      
      await configManager.saveConfig(newConfig);

      res.json({
        success: true,
        calibreDbPath: dbPath,
        talebookPath: newConfig.talebookPath || null,
        message: 'Calibre 数据库路径已更新'
      });
    } catch (error) {
      console.error('❌ 设置 Calibre 路径失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async validateCalibre(req, res) {
    try {
      const { calibrePath, calibreDir } = req.body;
      const pathParam = calibrePath || calibreDir;

      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = path.join(dbPath, 'metadata.db');
      }

      const validation = await pathValidator.validateCalibrePath(dbPath);
      let schemaValid = true;
      let schemaErrors = [];
      
      try {
        const result = databaseService.validateCalibreSchema();
        schemaValid = result.isValid;
        schemaErrors = result.errors;
      } catch (e) {
        schemaValid = false;
        schemaErrors.push(e.message);
      }

      res.json({
        success: schemaValid && validation.isValid,
        pathValid: validation.isValid,
        schemaValid: schemaValid,
        errors: [...validation.errors, ...schemaErrors]
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTalebookPath(req, res) {
    try {
      console.log('📋 [getTalebookPath] 开始获取 Talebook 配置...');
      const config = configManager.loadConfigSync();
      let currentDbPath = config.talebookPath;
      
      if (!currentDbPath && databaseService._initialized) {
        try {
          currentDbPath = databaseService.getTalebookDbPath();
        } catch (e) {
          currentDbPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');
        }
      }

      console.log('📋 [getTalebookPath] 数据库路径:', currentDbPath);
      
      const pathExists = currentDbPath ? fs.existsSync(currentDbPath) : false;
      console.log('📋 [getTalebookPath] 文件存在:', pathExists);
      
      let isValid = false;
      let stats = null;
      let validationErrors = [];
      let needsReconfig = false;

      console.log('📋 [getTalebookPath] databaseService._initialized:', databaseService._initialized);
      console.log('📋 [getTalebookPath] connectionManager 存在:', !!databaseService.connectionManager);
      console.log('📋 [getTalebookPath] talebookDb 存在:', !!databaseService.connectionManager?.talebookDb);
      
      const connectionError = databaseService.connectionManager?.getTalebookError();
      console.log('📋 [getTalebookPath] 连接错误:', connectionError);
      
      if (connectionError) {
        validationErrors.push(`数据库连接失败: ${connectionError}`);
        needsReconfig = true;
      }

      if (pathExists && !connectionError) {
        try {
          console.log('📋 [getTalebookPath] 开始验证数据库结构...');
          const result = databaseService.validateTalebookSchema();
          console.log('📋 [getTalebookPath] 验证结果:', result);
          isValid = result.isValid;
          validationErrors = result.errors || [];
          if (isValid) {
            stats = databaseService.getTalebookStats();
          } else {
            needsReconfig = true;
            console.warn('⚠️ Talebook 数据库验证失败:', validationErrors);
          }
        } catch (e) {
          console.warn('❌ Talebook 验证异常:', e.message);
          validationErrors = [e.message];
          needsReconfig = true;
        }
      } else if (currentDbPath && !pathExists) {
        needsReconfig = true;
        validationErrors = ['数据库文件不存在'];
      }

      res.json({
        success: true,
        talebookDbPath: currentDbPath,
        exists: pathExists,
        valid: isValid,
        stats: stats,
        error: validationErrors.length > 0 ? validationErrors.join('; ') : null,
        needsReconfig: needsReconfig
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async setTalebookPath(req, res) {
    try {
      const { talebookPath, talebookDir } = req.body;
      const pathParam = talebookPath || talebookDir;
      console.log('📝 设置 Talebook 路径:', pathParam);

      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = path.join(dbPath, 'calibre-webserver.db');
      }

      const validation = await pathValidator.validateTalebookPath(dbPath);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join(', ')
        });
      }

      await databaseService.updateTalebookDbPath(dbPath);
      
      await configManager.saveConfig({
        talebookPath: dbPath,
        talebookDir: path.dirname(dbPath)
      });

      res.json({
        success: true,
        talebookDbPath: dbPath,
        message: 'Talebook 数据库路径已更新'
      });
    } catch (error) {
      console.error('❌ 设置 Talebook 路径失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async validateTalebook(req, res) {
    try {
      const { talebookPath, talebookDir } = req.body;
      const pathParam = talebookPath || talebookDir;

      let dbPath = pathParam;
      if (dbPath && !dbPath.endsWith('.db')) {
        dbPath = path.join(dbPath, 'calibre-webserver.db');
      }

      const validation = await pathValidator.validateTalebookPath(dbPath);
      let schemaValid = true;
      let schemaErrors = [];
      
      try {
        const result = databaseService.validateTalebookSchema();
        schemaValid = result.isValid;
        schemaErrors = result.errors;
      } catch (e) {
        schemaValid = false;
        schemaErrors.push(e.message);
      }

      res.json({
        success: schemaValid && validation.isValid,
        pathValid: validation.isValid,
        schemaValid: schemaValid,
        errors: [...validation.errors, ...schemaErrors]
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async checkDatabases(req, res) {
    try {
      res.json({
        success: true,
        data: {
          calibre: {
            available: databaseService.isCalibreAvailable(),
            valid: databaseService.isCalibreAvailable(),
            path: databaseService.getDbPath()
          },
          talebook: {
            available: databaseService.isTalebookAvailable(),
            valid: databaseService.isTalebookAvailable(),
            path: databaseService.getTalebookDbPath()
          },
          qcBooklog: {
            available: databaseService.isQcBooklogAvailable(),
            valid: databaseService.isQcBooklogAvailable(),
            path: databaseService.getQcBooklogDbPath()
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSystemStatus(req, res) {
    try {
      res.json({
        calibre: {
          available: databaseService.isCalibreAvailable(),
          path: databaseService.getDbPath()
        },
        talebook: {
          available: databaseService.isTalebookAvailable(),
          path: databaseService.getTalebookDbPath()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSyncStatus(req, res) {
    try {
      const syncStatus = await syncService.getSyncStatus();
      res.json({
        success: true,
        status: syncStatus.status,
        message: syncStatus.message,
        data: syncStatus.data
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ConfigController();
