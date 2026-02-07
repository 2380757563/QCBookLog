/**
 * 数据库连接管理器
 * 负责管理 Calibre 和 Talebook 数据库的连接
 */

import path from 'path';
import { createRequire } from 'module';
import { readConfigSync } from '../dataService.js';
import fsSync from 'fs';

// 使用同步 require 导入 better-sqlite3
const require = createRequire(import.meta.url);
let Database = null;

try {
  const module = require('better-sqlite3');
  Database = module.default || module;
  console.log('✅ better-sqlite3 导入成功');
} catch (error) {
  console.warn('⚠️ better-sqlite3 未安装，数据库服务将不可用');
  console.warn('⚠️ 请运行: cd server && npm install better-sqlite3 --build-from-source');
  console.warn('⚠️ 或安装 Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/');
}

/**
 * 数据库连接管理器
 */
class DatabaseConnectionManager {
  constructor() {
    this.calibreDb = null;
    this.talebookDb = null;
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  loadConfig() {
    const config = readConfigSync();
    
    // 获取项目根目录
    const projectRoot = this.getProjectRoot();
    
    // 默认数据库路径
    const defaultCalibrePath = path.join(projectRoot, 'data/calibre/metadata.db');
    const defaultTalebookPath = path.join(projectRoot, 'data/talebook/calibre-webserver.db');

    return {
      calibrePath: config.calibrePath || process.env.CALIBRE_DB_PATH || defaultCalibrePath,
      talebookPath: config.talebookPath || process.env.TALEBOOK_DB_PATH || defaultTalebookPath
    };
  }
  
  /**
   * 获取项目根目录
   */
  getProjectRoot() {
    // 如果当前工作目录是server目录，则向上一级到达项目根目录
    const currentDir = process.cwd();
    if (path.basename(currentDir) === 'server') {
      return path.dirname(currentDir);
    }
    return currentDir;
  }

  /**
   * 初始化所有数据库连接
   */
  async init() {
    if (Database) {
      await this.initCalibre();
      await this.initTalebook();
    }
  }

  /**
   * 初始化 Calibre 数据库
   */
  async initCalibre() {
    if (!this.calibreDb) {
      try {
        this.calibreDb = new Database(this.config.calibrePath);
        this.calibreDb.pragma('journal_mode = WAL');
        this.calibreDb.pragma('foreign_keys = ON');
        console.log('✅ Calibre 数据库连接成功:', this.config.calibrePath);
      } catch (error) {
        console.error('❌ Calibre 数据库连接失败:', error.message);
        this.calibreDb = null;
      }
    }
  }

  /**
   * 初始化 Talebook 数据库
   */
  async initTalebook() {
    if (!this.talebookDb) {
      try {
        this.talebookDb = new Database(this.config.talebookPath);
        this.talebookDb.pragma('journal_mode = WAL');
        this.talebookDb.pragma('foreign_keys = ON');
        console.log('✅ Talebook 数据库连接成功:', this.config.talebookPath);
      } catch (error) {
        console.error('❌ Talebook 数据库连接失败:', error.message);
        this.talebookDb = null;
      }
    }
  }

  /**
   * 获取 Calibre 数据库实例
   */
  getCalibreDb() {
    return this.calibreDb;
  }

  /**
   * 获取 Talebook 数据库实例
   */
  getTalebookDb() {
    return this.talebookDb;
  }

  /**
   * 检查 Calibre 数据库是否可用
   */
  isCalibreAvailable() {
    return this.calibreDb !== null;
  }

  /**
   * 检查 Talebook 数据库是否可用
   */
  isTalebookAvailable() {
    return this.talebookDb !== null;
  }

  /**
   * 重新加载配置
   */
  reloadConfig() {
    this.config = this.loadConfig();
    console.log('🔄 配置已重新加载');
  }

  /**
   * 重新连接数据库（当路径变化时）
   */
  async reconnect() {
    this.reloadConfig();
    
    // 关闭现有连接
    if (this.calibreDb) {
      this.calibreDb.close();
      this.calibreDb = null;
    }
    if (this.talebookDb) {
      this.talebookDb.close();
      this.talebookDb = null;
    }

    // 重新连接
    await this.init();
  }

  /**
   * 关闭所有数据库连接
   */
  close() {
    if (this.calibreDb) {
      this.calibreDb.close();
      this.calibreDb = null;
    }
    if (this.talebookDb) {
      this.talebookDb.close();
      this.talebookDb = null;
    }
  }
}

export default DatabaseConnectionManager;
