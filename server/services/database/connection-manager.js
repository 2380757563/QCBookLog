/**
 * 数据库连接管理器
 * 负责管理 Calibre 和 Talebook 数据库的连接
 */

import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import configManager from '../configManager.js';
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
    this.qcBooklogDb = null;
    this.config = this.loadConfig();
    this._currentLibraryUuid = null;
    this.calibreError = null;
    this.talebookError = null;
    this.qcBooklogError = null;
  }

  /**
   * 加载配置
   */
  loadConfig() {
    const config = configManager.loadConfigSync();
    
    const projectRoot = this.getProjectRoot();
    
    const defaultCalibrePath = path.join(projectRoot, 'data/calibre/metadata.db');
    const defaultTalebookPath = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
    const defaultQcBooklogPath = path.join(projectRoot, 'data/qc_booklog.db');

    const resolvePath = (dbPath) => {
      if (!dbPath) return dbPath;
      if (path.isAbsolute(dbPath)) return dbPath;
      return path.resolve(projectRoot, dbPath);
    };

    // 调试日志：显示环境变量和配置值
    console.log('🔍 connection-manager 配置调试:');
    console.log('  process.env.CALIBRE_DB_PATH:', process.env.CALIBRE_DB_PATH || '(未设置)');
    console.log('  process.env.TALEBOOK_DB_PATH:', process.env.TALEBOOK_DB_PATH || '(未设置)');
    console.log('  process.env.QCBOOKLOG_DB_PATH:', process.env.QCBOOKLOG_DB_PATH || '(未设置)');
    console.log('  config.calibrePath:', config.calibrePath || '(未设置)');
    console.log('  config.talebookPath:', config.talebookPath || '(未设置)');
    console.log('  config.qcBooklogPath:', config.qcBooklogPath || '(未设置)');

    // 优先级：1. 环境变量（Docker） 2. 配置文件 3. 默认路径
    const calibrePath = process.env.CALIBRE_DB_PATH || config.calibrePath;
    const talebookPath = process.env.TALEBOOK_DB_PATH || config.talebookPath;
    const qcBooklogPath = process.env.QCBOOKLOG_DB_PATH || config.qcBooklogPath;

    return {
      calibrePath: resolvePath(calibrePath) || defaultCalibrePath,
      talebookPath: resolvePath(talebookPath) || defaultTalebookPath,
      qcBooklogPath: resolvePath(qcBooklogPath) || defaultQcBooklogPath
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
      await this.initQcBooklog();
    }
  }

  /**
   * 初始化 Calibre 数据库
   */
  async initCalibre() {
    if (!this.calibreDb) {
      this.calibreError = null;
      try {
        this.calibreDb = new Database(this.config.calibrePath);
        this.calibreDb.pragma('journal_mode = WAL');
        this.calibreDb.pragma('busy_timeout = 10000');
        this.calibreDb.pragma('foreign_keys = ON');
        console.log('✅ Calibre 数据库连接成功:', this.config.calibrePath);
        this._currentLibraryUuid = this.fetchLibraryUuid();
        if (this._currentLibraryUuid) {
          console.log('📚 当前 Calibre 库 UUID:', this._currentLibraryUuid);
        }
      } catch (error) {
        console.error('❌ Calibre 数据库连接失败:', error.message);
        console.error('❌ 数据库路径:', this.config.calibrePath);
        this.calibreDb = null;
        this.calibreError = error.message;
      }
    }
  }

  /**
   * 从 Calibre 数据库获取 library_uuid
   */
  fetchLibraryUuid() {
    if (!this.calibreDb) {
      return null;
    }

    try {
      let libraryUuid = null;

      // 方法1: 从 library_id 表获取（Calibre 标准位置）
      try {
        const result = this.calibreDb.prepare(`
          SELECT uuid FROM library_id LIMIT 1
        `).get();
        libraryUuid = result ? result.uuid : null;
        if (libraryUuid) {
          console.log('📚 从 library_id 表获取到 UUID:', libraryUuid);
          return libraryUuid;
        }
      } catch (e) {
        // library_id 表可能不存在
      }

      // 方法2: 从 metadata_plugins 表获取
      try {
        const result = this.calibreDb.prepare(`
          SELECT value FROM metadata_plugins WHERE name = 'calibre_library_uuid'
        `).get();
        libraryUuid = result ? result.value : null;
        if (libraryUuid) {
          console.log('📚 从 metadata_plugins 表获取到 UUID:', libraryUuid);
          return libraryUuid;
        }
      } catch (e) {
        // metadata_plugins 表可能不存在
      }

      // 方法3: 从 preferences 表获取（key/val 结构）
      try {
        const result = this.calibreDb.prepare(`
          SELECT val FROM preferences WHERE key = 'library_uuid'
        `).get();
        libraryUuid = result ? result.val : null;
        if (libraryUuid) {
          console.log('📚 从 preferences 表(key/val)获取到 UUID:', libraryUuid);
          return libraryUuid;
        }
      } catch (e) {
        // preferences 表可能不存在或结构不同
      }

      // 方法4: 从 preferences 表获取（name/value 结构）
      try {
        const result = this.calibreDb.prepare(`
          SELECT value FROM preferences WHERE name = 'library_uuid'
        `).get();
        libraryUuid = result ? result.value : null;
        if (libraryUuid) {
          console.log('📚 从 preferences 表(name/value)获取到 UUID:', libraryUuid);
          return libraryUuid;
        }
      } catch (e) {
        // preferences 表结构不同
      }

      // 方法5: 生成基于数据库路径的默认 UUID
      const dbPath = this.config.calibrePath;
      const defaultUuid = 'qc-' + crypto.createHash('md5').update(dbPath).digest('hex').substring(0, 8);
      console.log('📚 无法从数据库获取 UUID，生成默认 UUID:', defaultUuid, '(基于路径:', dbPath, ')');
      return defaultUuid;
    } catch (error) {
      console.warn('⚠️ 获取 library_uuid 失败:', error.message);
      // 返回一个默认值，确保系统可以正常运行
      return 'qc-default-library';
    }
  }

  /**
   * 获取当前 Calibre 库的 UUID
   */
  getCurrentLibraryUuid() {
    if (!this._currentLibraryUuid && this.calibreDb) {
      this._currentLibraryUuid = this.fetchLibraryUuid();
      console.log('📚 getCurrentLibraryUuid - 获取到的 UUID:', this._currentLibraryUuid);
    }
    if (!this._currentLibraryUuid) {
      console.warn('⚠️ getCurrentLibraryUuid - UUID 为空, calibreDb:', !!this.calibreDb);
    }
    return this._currentLibraryUuid;
  }

  /**
   * 初始化 Talebook 数据库
   */
  async initTalebook() {
    if (!this.talebookDb) {
      this.talebookError = null;
      try {
        this.talebookDb = new Database(this.config.talebookPath);
        this.talebookDb.pragma('journal_mode = WAL');
        this.talebookDb.pragma('busy_timeout = 10000');
        this.talebookDb.pragma('foreign_keys = ON');
        console.log('✅ Talebook 数据库连接成功:', this.config.talebookPath);
        
        this.ensureDefaultReader();
      } catch (error) {
        console.error('❌ Talebook 数据库连接失败:', error.message);
        console.error('❌ 数据库路径:', this.config.talebookPath);
        this.talebookDb = null;
        this.talebookError = error.message;
      }
    }
  }

  ensureDefaultReader() {
    if (!this.talebookDb) return;
    
    try {
      const existing = this.talebookDb.prepare('SELECT id FROM readers WHERE id = 0').get();
      if (!existing) {
        this.talebookDb.prepare(`
          INSERT INTO readers (id, username, password, salt, name, email, admin, active, permission, create_time, update_time)
          VALUES (0, 'default', '', '', 'Default Reader', '', 0, 1, '', datetime('now'), datetime('now'))
        `).run();
        console.log('✅ 已创建默认读者 (id=0)');
      }
    } catch (error) {
      console.warn('⚠️ 创建默认读者失败:', error.message);
    }
  }

  /**
   * 初始化 QCBookLog 数据库
   */
  async initQcBooklog() {
    if (!this.qcBooklogDb) {
      this.qcBooklogError = null;
      try {
        this.qcBooklogDb = new Database(this.config.qcBooklogPath);
        this.qcBooklogDb.pragma('journal_mode = WAL');
        this.qcBooklogDb.pragma('busy_timeout = 10000');
        this.qcBooklogDb.pragma('foreign_keys = ON');
        console.log('✅ QCBookLog 数据库连接成功:', this.config.qcBooklogPath);
        
        this.createQcBooklogTables();
      } catch (error) {
        console.error('❌ QCBookLog 数据库连接失败:', error.message);
        console.error('❌ 数据库路径:', this.config.qcBooklogPath);
        this.qcBooklogDb = null;
        this.qcBooklogError = error.message;
      }
    }
  }

  /**
   * 创建 QCBookLog 数据库表结构
   */
  createQcBooklogTables() {
    if (!this.qcBooklogDb) {
      console.error('❌ 数据库未连接，无法创建表结构');
      return;
    }

    try {
      console.log('📝 检查并创建 QCBookLog 数据库表结构...');

      // 创建书籍映射表
      console.log('📝 创建书籍映射表 (qc_book_mapping)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_book_mapping (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          library_uuid TEXT NOT NULL DEFAULT '',
          calibre_book_id INTEGER NOT NULL,
          talebook_book_id INTEGER,
          title TEXT,
          author TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(library_uuid, calibre_book_id)
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_mapping_library ON qc_book_mapping(library_uuid)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_mapping_calibre ON qc_book_mapping(calibre_book_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_mapping_library_calibre ON qc_book_mapping(library_uuid, calibre_book_id)
      `);
      console.log('  ✅ qc_book_mapping 表创建成功');

      this.ensureLibraryUuidColumn();

      // 创建用户表
      console.log('📝 创建用户表 (qc_users)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_users (
          id INTEGER PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100),
          name VARCHAR(100),
          email VARCHAR(100),
          avatar_url VARCHAR(255),
          avatar VARCHAR(255),
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_qc_users_username ON qc_users(username)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_qc_users_email ON qc_users(email)
      `);
      console.log('  ✅ qc_users 表创建成功');

      // 创建分组表
      console.log('📝 创建分组表 (qc_groups)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(50) NOT NULL UNIQUE,
          description TEXT,
          color VARCHAR(7),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✅ qc_groups 表创建成功');

      // 创建标签表
      console.log('📝 创建标签表 (qc_tags)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(50) NOT NULL UNIQUE,
          color VARCHAR(7),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('  ✅ qc_tags 表创建成功');

      // 检查并更新 qc_bookdata 表结构（添加 book_id UNIQUE 约束）
      const bookdataInfo = this.qcBooklogDb.prepare("SELECT sql FROM sqlite_master WHERE name = 'qc_bookdata'").get();
      if (bookdataInfo && !bookdataInfo.sql.includes('book_id INTEGER NOT NULL UNIQUE')) {
        console.log('  🔄 检测到 qc_bookdata 表结构需要更新，正在重建...');
        this.qcBooklogDb.exec('DROP TABLE IF EXISTS qc_reading_records');
        this.qcBooklogDb.exec('DROP TABLE IF EXISTS qc_bookdata');
        console.log('  ✅ 旧表已删除');
      }

      // 创建书籍扩展数据表
      console.log('📝 创建书籍扩展数据表 (qc_bookdata)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_bookdata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER,
          book_id INTEGER NOT NULL UNIQUE,
          page_count INTEGER DEFAULT 0,
          standard_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          purchase_date TEXT,
          binding1 INTEGER DEFAULT 0,
          binding2 INTEGER DEFAULT 0,
          paper1 INTEGER DEFAULT 0,
          edge1 INTEGER DEFAULT 0,
          edge2 INTEGER DEFAULT 0,
          note TEXT DEFAULT '',
          book_type INTEGER DEFAULT 1,
          total_reading_time INTEGER DEFAULT 0,
          read_pages INTEGER DEFAULT 0,
          reading_count INTEGER DEFAULT 0,
          last_read_date TEXT,
          last_read_duration INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE SET NULL
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_bookdata_mapping ON qc_bookdata(mapping_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_bookdata_book_id ON qc_bookdata(book_id)
      `);
      console.log('  ✅ qc_bookdata 表创建成功');

      // 检查并添加缺失的 book_type 列（兼容旧数据库）
      try {
        const columns = this.qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
        const hasBookType = columns.some(col => col.name === 'book_type');
        if (!hasBookType) {
          console.log('  🔄 检测到 qc_bookdata 表缺少 book_type 列，正在添加...');
          this.qcBooklogDb.exec('ALTER TABLE qc_bookdata ADD COLUMN book_type INTEGER DEFAULT 1');
          console.log('  ✅ book_type 列添加成功');
        }
      } catch (err) {
        console.warn('  ⚠️ 检查/添加 book_type 列失败:', err.message);
      }

      // 创建书摘表
      console.log('📝 创建书摘表 (qc_bookmarks)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER NOT NULL,
          user_id INTEGER DEFAULT 0,
          chapter TEXT,
          pos INTEGER DEFAULT 0,
          pos_type TEXT DEFAULT 'chapter',
          text TEXT,
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅ qc_bookmarks 表创建成功');

      // 创建书摘标签关联表
      console.log('📝 创建书摘标签关联表 (qc_bookmark_tags)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER NOT NULL,
          tag_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bookmark_id) REFERENCES qc_bookmarks(id) ON DELETE CASCADE
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmark_id ON qc_bookmark_tags(bookmark_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag_id ON qc_bookmark_tags(tag_id)
      `);
      console.log('  ✅ qc_bookmark_tags 表创建成功');

      // 创建书籍分组关联表
      console.log('📝 创建书籍分组关联表 (qc_book_groups)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_book_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE,
          UNIQUE(mapping_id, group_id)
        )
      `);
      console.log('  ✅ qc_book_groups 表创建成功');

      // 创建书籍标签关联表
      console.log('📝 创建书籍标签关联表 (qc_book_tags)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_book_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES qc_tags(id) ON DELETE CASCADE,
          UNIQUE(mapping_id, tag_id)
        )
      `);
      console.log('  ✅ qc_book_tags 表创建成功');

      // 创建阅读记录表
      console.log('📝 创建阅读记录表 (qc_reading_records)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_reading_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          user_id INTEGER DEFAULT 0,
          reader_id INTEGER DEFAULT 0,
          start_time TEXT,
          end_time TEXT,
          duration INTEGER DEFAULT 0,
          start_page INTEGER DEFAULT 0,
          end_page INTEGER DEFAULT 0,
          pages_read INTEGER DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_reading_book_user ON qc_reading_records(book_id, user_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_reading_start_time ON qc_reading_records(start_time)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_reading_user_date ON qc_reading_records(user_id, start_time)
      `);
      console.log('  ✅ qc_reading_records 表创建成功');

      // 创建阅读状态表
      console.log('📝 创建阅读状态表 (qc_reading_state)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_reading_state (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER NOT NULL UNIQUE,
          user_id INTEGER DEFAULT 0,
          read_status TEXT DEFAULT '未读',
          current_chapter TEXT,
          current_page INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          progress REAL DEFAULT 0,
          last_read_at DATETIME,
          book_id INTEGER,
          reader_id INTEGER DEFAULT 0,
          favorite INTEGER DEFAULT 0,
          wants INTEGER DEFAULT 0,
          read_state INTEGER DEFAULT 0,
          online_read INTEGER DEFAULT 0,
          download INTEGER DEFAULT 0,
          progress_percent INTEGER DEFAULT 0,
          notes TEXT,
          rating INTEGER DEFAULT 0,
          favorite_date TEXT,
          wants_date TEXT,
          read_date TEXT,
          start_date TEXT,
          last_read_time TEXT,
          sync_status INTEGER DEFAULT 0,
          last_sync_time TEXT,
          sync_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅ qc_reading_state 表创建成功');

      // 创建阅读状态表索引
      console.log('📝 创建阅读状态表索引...');
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_qc_reading_state_mapping_id ON qc_reading_state(mapping_id);
        CREATE INDEX IF NOT EXISTS idx_qc_reading_state_user_id ON qc_reading_state(user_id);
        CREATE INDEX IF NOT EXISTS idx_qc_reading_state_read_status ON qc_reading_state(read_status);
      `);
      console.log('  ✅ qc_reading_state 表索引创建成功');

      // 创建每日统计表
      console.log('📝 创建每日统计表 (qc_daily_reading_stats)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_daily_reading_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          reader_id INTEGER DEFAULT 0,
          stat_date DATE NOT NULL,
          date DATE,
          total_reading_time INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          total_pages_read INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          books_read_count INTEGER DEFAULT 0,
          total_books INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, stat_date),
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON qc_daily_reading_stats(user_id, stat_date)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_daily_stats_reader_date ON qc_daily_reading_stats(reader_id, stat_date)
      `);
      console.log('  ✅ qc_daily_reading_stats 表创建成功');

      // 创建阅读目标表
      console.log('📝 创建阅读目标表 (qc_reading_goals)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          reader_id INTEGER DEFAULT 0,
          year INTEGER,
          goal_type VARCHAR(20) NOT NULL,
          target INTEGER DEFAULT 0,
          target_value INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          current_value INTEGER DEFAULT 0,
          start_date DATE NOT NULL,
          end_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, year),
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_reading_goals_user_year ON qc_reading_goals(user_id, year)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_reading_goals_reader_year ON qc_reading_goals(reader_id, year)
      `);
      console.log('  ✅ qc_reading_goals 表创建成功');

      // 创建评论表
      console.log('📝 创建评论表 (qc_comments)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          rating INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅ qc_comments 表创建成功');

      // 创建愿望清单表
      console.log('📝 创建愿望清单表 (qc_wishlist)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_wishlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mapping_id INTEGER,
          user_id INTEGER DEFAULT 0,
          reader_id INTEGER DEFAULT 0,
          title TEXT NOT NULL,
          author TEXT,
          isbn TEXT,
          publisher TEXT,
          price REAL,
          priority INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, isbn),
          FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON qc_wishlist(user_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_wishlist_reader_id ON qc_wishlist(reader_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_wishlist_isbn ON qc_wishlist(isbn)
      `);
      console.log('  ✅ qc_wishlist 表创建成功');

      // 创建活动日志表
      console.log('📝 创建活动日志表 (qc_activity_log)...');
      this.qcBooklogDb.exec(`
        CREATE TABLE IF NOT EXISTS qc_activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          user_id INTEGER DEFAULT 0,
          reader_id INTEGER DEFAULT 0,
          book_id INTEGER,
          book_title TEXT,
          book_author TEXT,
          book_cover TEXT,
          content TEXT,
          chapter TEXT,
          start_page INTEGER,
          end_page INTEGER,
          pages_read INTEGER,
          duration INTEGER,
          start_time TEXT,
          end_time TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON qc_activity_log(user_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_reader_id ON qc_activity_log(reader_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_type ON qc_activity_log(type)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_book_id ON qc_activity_log(book_id)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON qc_activity_log(created_at)
      `);
      this.qcBooklogDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON qc_activity_log(user_id, created_at)
      `);
      console.log('  ✅ qc_activity_log 表创建成功');

      console.log('✅ QCBookLog 数据库表结构创建完成');
    } catch (error) {
      console.error('❌ 创建 QCBookLog 数据库表结构失败:', error.message);
      throw error;
    }
  }

  /**
   * 确保 qc_book_mapping 表有 library_uuid 字段（兼容旧数据库）
   */
  ensureLibraryUuidColumn() {
    if (!this.qcBooklogDb) {
      return;
    }

    try {
      const columns = this.qcBooklogDb.prepare("PRAGMA table_info(qc_book_mapping)").all();
      const columnNames = columns.map(col => col.name);

      if (!columnNames.includes('library_uuid')) {
        console.log('📝 检测到旧版 qc_book_mapping 表结构，开始迁移...');

        this.qcBooklogDb.pragma('foreign_keys = OFF');

        const existingData = this.qcBooklogDb.prepare('SELECT * FROM qc_book_mapping').all();

        this.qcBooklogDb.exec(`
          CREATE TABLE IF NOT EXISTS qc_book_mapping_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            library_uuid TEXT NOT NULL DEFAULT '',
            calibre_book_id INTEGER NOT NULL,
            talebook_book_id INTEGER,
            title TEXT,
            author TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(library_uuid, calibre_book_id)
          )
        `);

        const insertStmt = this.qcBooklogDb.prepare(`
          INSERT INTO qc_book_mapping_new (id, library_uuid, calibre_book_id, talebook_book_id, created_at, updated_at)
          VALUES (?, '', ?, ?, ?, ?)
        `);

        const migrateTransaction = this.qcBooklogDb.transaction(() => {
          for (const row of existingData) {
            insertStmt.run(
              row.id,
              row.calibre_book_id,
              row.talebook_book_id || row.calibre_book_id,
              row.created_at,
              row.updated_at
            );
          }
        });

        migrateTransaction();

        this.qcBooklogDb.exec(`
          DROP TABLE qc_book_mapping;
          ALTER TABLE qc_book_mapping_new RENAME TO qc_book_mapping;
        `);

        this.qcBooklogDb.exec(`
          CREATE INDEX IF NOT EXISTS idx_mapping_library ON qc_book_mapping(library_uuid);
          CREATE INDEX IF NOT EXISTS idx_mapping_calibre ON qc_book_mapping(calibre_book_id);
          CREATE INDEX IF NOT EXISTS idx_mapping_library_calibre ON qc_book_mapping(library_uuid, calibre_book_id);
        `);

        this.qcBooklogDb.pragma('foreign_keys = ON');

        console.log('✅ qc_book_mapping 表迁移完成，已添加 library_uuid 字段');
      }
    } catch (error) {
      console.warn('⚠️ 检查/迁移 qc_book_mapping 表时出错:', error.message);
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
   * 获取 QCBookLog 数据库实例
   */
  getQcBooklogDb() {
    return this.qcBooklogDb;
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
   * 检查 QCBookLog 数据库是否可用
   */
  isQcBooklogAvailable() {
    return this.qcBooklogDb !== null;
  }

  getCalibreError() {
    return this.calibreError;
  }

  getTalebookError() {
    return this.talebookError;
  }

  getQcBooklogError() {
    return this.qcBooklogError;
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
    
    this.calibreError = null;
    this.talebookError = null;
    this.qcBooklogError = null;
    
    if (this.calibreDb) {
      this.calibreDb.close();
      this.calibreDb = null;
    }
    if (this.talebookDb) {
      this.talebookDb.close();
      this.talebookDb = null;
    }
    if (this.qcBooklogDb) {
      this.qcBooklogDb.close();
      this.qcBooklogDb = null;
    }

    await this.init();
  }

  close() {
    if (this.calibreDb) {
      this.calibreDb.close();
      this.calibreDb = null;
    }
    if (this.talebookDb) {
      this.talebookDb.close();
      this.talebookDb = null;
    }
    if (this.qcBooklogDb) {
      this.qcBooklogDb.close();
      this.qcBooklogDb = null;
    }
    this.calibreError = null;
    this.talebookError = null;
    this.qcBooklogError = null;
  }
}

export default DatabaseConnectionManager;
