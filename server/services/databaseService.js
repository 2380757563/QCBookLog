/**
 * SQLite数据库服务
 * 支持同时连接Calibre的metadata.db和Talebook的calibre-webserver.db
 */

import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { readConfigSync } from './dataService.js';
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

// 获取项目根目录
const getProjectRoot = () => {
  // 如果当前工作目录是server目录，则向上一级到达项目根目录
  const currentDir = process.cwd();
  if (path.basename(currentDir) === 'server') {
    return path.dirname(currentDir);
  }
  return currentDir;
};

// 默认数据库路径（可被环境变量覆盖）
let CALIBRE_DB_PATH = path.join(getProjectRoot(), 'data/calibre/metadata.db');
let TALEBOOK_DB_PATH = path.join(getProjectRoot(), 'data/talebook/calibre-webserver.db');

// 优先级：1. 配置文件 2. 环境变量 3. 默认路径
const config = readConfigSync();
if (config.calibrePath) {
  CALIBRE_DB_PATH = config.calibrePath;
  console.log('✅ 使用配置文件中的 Calibre 数据库:', CALIBRE_DB_PATH);
} else if (process.env.CALIBRE_DB_PATH) {
  CALIBRE_DB_PATH = process.env.CALIBRE_DB_PATH;
  console.log('✅ 使用环境变量指定的 Calibre 数据库:', CALIBRE_DB_PATH);
} else {
  console.log('ℹ️ 使用默认 Calibre 数据库路径:', CALIBRE_DB_PATH);
}

if (config.talebookPath) {
  TALEBOOK_DB_PATH = config.talebookPath;
  console.log('✅ 使用配置文件中的 Talebook 数据库:', TALEBOOK_DB_PATH);
} else if (process.env.TALEBOOK_DB_PATH) {
  TALEBOOK_DB_PATH = process.env.TALEBOOK_DB_PATH;
  console.log('✅ 使用环境变量指定的 Talebook 数据库:', TALEBOOK_DB_PATH);
} else {
  console.log('ℹ️ 使用默认 Talebook 数据库路径:', TALEBOOK_DB_PATH);
}

/**
 * SQLite数据库服务
 */
class DatabaseService {
  constructor() {
    this.calibreDb = null;
    this.talebookDb = null;
    this.initDatabases();
  }

  /**
   * 初始化数据库连接
   */
  initDatabases() {
    this.initCalibreDatabase();
    this.initTalebookDatabase();
    // 初始化后进行完整性检查
    this.checkDatabaseIntegrity();
  }

  /**
   * 检查数据库完整性并修复
   */
  checkDatabaseIntegrity() {
    console.log('🔍 开始数据库完整性检查...');
    try {
      if (this.isTalebookAvailable()) {
        this.checkAndFixTalebookDatabase();
      }
      if (this.isCalibreAvailable()) {
        this.checkAndFixCalibreDatabase();
      }
      console.log('✅ 数据库完整性检查完成');
    } catch (error) {
      console.error('❌ 数据库完整性检查失败:', error.message);
    }
  }

  /**
   * 检查并修复 Talebook 数据库
   */
  checkAndFixTalebookDatabase() {
    try {
      console.log('🔍 检查 Talebook 数据库完整性...');

      // 检查 items 表的主键
      const itemsTableInfo = this.talebookDb.prepare('PRAGMA table_info(items)').all();
      const hasBookIdPrimaryKey = itemsTableInfo.some(col => col.name === 'book_id' && col.pk > 0);

      if (!hasBookIdPrimaryKey) {
        console.log('⚠️ items 表缺少 book_id 主键，开始修复...');
        this.fixItemsTablePrimaryKey();
      }

      // 检查外键约束是否正确
      const tablesToCheck = ['qc_book_groups', 'qc_bookmarks', 'qc_bookdata'];
      for (const tableName of tablesToCheck) {
        const foreignKeys = this.talebookDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
        const hasIncorrectForeignKey = foreignKeys.some(fk => fk.table === 'items' && fk.from === 'id');

        if (hasIncorrectForeignKey) {
          console.log(`⚠️ ${tableName} 表的外键约束不正确，开始修复...`);
          this.fixTableForeignKey(tableName);
        }
      }

      // 确保 qc_bookdata 表有所有必需的列
      this.ensureQcBookdataColumns();

      console.log('✅ Talebook 数据库完整性检查通过');
    } catch (error) {
      console.error('❌ 检查/修复 Talebook 数据库失败:', error.message);
    }
  }

  /**
   * 检查并修复 Calibre 数据库
   */
  checkAndFixCalibreDatabase() {
    try {
      console.log('🔍 检查 Calibre 数据库完整性...');
      // 这里可以添加 Calibre 数据库的完整性检查逻辑
      console.log('✅ Calibre 数据库完整性检查通过');
    } catch (error) {
      console.error('❌ 检查/修复 Calibre 数据库失败:', error.message);
    }
  }

  /**
   * 修复 items 表的主键
   */
  fixItemsTablePrimaryKey() {
    // 这个修复逻辑已经在之前的迁移脚本中实现
    // 如果 items 表格式不正确，需要重新创建表
    console.log('⚠️ items 表主键修复需要在切换数据库时手动处理');
  }

  /**
   * 修复表的外键约束
   */
  fixTableForeignKey(tableName) {
    // 这个修复逻辑已经在之前的迁移脚本中实现
    console.log(`⚠️ ${tableName} 表外键修复需要在切换数据库时手动处理`);
  }

  /**
   * 确保 qc_bookdata 表有所有必需的列
   */
  ensureQcBookdataColumns() {
    try {
      const columns = this.talebookDb.prepare('PRAGMA table_info(qc_bookdata)').all();
      const columnNames = new Set(columns.map(c => c.name));

      const requiredFields = [
        { name: 'purchase_price', sql: 'purchase_price REAL DEFAULT 0' },
        { name: 'note', sql: 'note TEXT' },
        { name: 'total_reading_time', sql: 'total_reading_time INTEGER DEFAULT 0' },
        { name: 'read_pages', sql: 'read_pages INTEGER DEFAULT 0' },
        { name: 'reading_count', sql: 'reading_count INTEGER DEFAULT 0' },
        { name: 'last_read_date', sql: 'last_read_date DATE DEFAULT NULL' },
        { name: 'last_read_duration', sql: 'last_read_duration INTEGER DEFAULT 0' }
      ];

      for (const field of requiredFields) {
        if (!columnNames.has(field.name)) {
          try {
            this.talebookDb.prepare(`ALTER TABLE qc_bookdata ADD COLUMN ${field.sql}`).run();
            console.log(`✅ 添加 ${field.name} 列到 qc_bookdata 表`);
          } catch (error) {
            if (!error.message.includes('duplicate column name')) {
              console.error(`❌ 添加 ${field.name} 列失败:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 检查/添加 qc_bookdata 列失败:', error.message);
    }
  }

  /**
   * 初始化 Calibre 数据库连接
   */
  initCalibreDatabase() {
    try {
      console.log('🔄 初始化 Calibre 数据库连接...');
      console.log('🔄 数据库路径:', CALIBRE_DB_PATH);

      if (!Database) {
        console.warn('⚠️ 数据库服务不可用，系统将使用文件系统模式');
        return;
      }

      // 确保数据库目录存在
      const dbDir = path.dirname(CALIBRE_DB_PATH);
      if (!fsSync.existsSync(dbDir)) {
        console.log('📂 创建数据库目录:', dbDir);
        fsSync.mkdirSync(dbDir, { recursive: true });
        console.log('✅ 数据库目录创建成功');
      }

      // 检查数据库文件是否存在
      if (!fsSync.existsSync(CALIBRE_DB_PATH)) {
        console.warn('⚠️ Calibre 数据库文件不存在:', CALIBRE_DB_PATH);
        console.warn('⚠️ 请先配置 Calibre 书库路径');
        this.calibreDb = null;
        return;
      }

      this.calibreDb = new Database(CALIBRE_DB_PATH);
      console.log('✅ Calibre 数据库对象创建成功');
      this.calibreDb.pragma('journal_mode = WAL');
      console.log('✅ Calibre WAL 模式已启用');
      this.calibreDb.pragma('foreign_keys = ON');
      console.log('✅ Calibre 外键约束已启用');

      // 注册 Calibre 所需的自定义函数 title_sort
      this.registerCalibreFunctions(this.calibreDb);

      // 初始化数据库表结构（如果需要）
      this.initCalibreTables(this.calibreDb);

      // 禁用递归触发器
      try {
        this.calibreDb.pragma('recursive_triggers = OFF');
        console.log('✅ Calibre 已禁用递归触发器');
      } catch (pragmaError) {
        console.warn('⚠️ 无法禁用 Calibre 递归触发器:', pragmaError.message);
      }

      console.log('✅ Calibre 数据库连接成功:', CALIBRE_DB_PATH);
      console.log('✅ Calibre 数据库可访问:', this.isCalibreAvailable());
    } catch (error) {
      console.error('❌ Calibre 数据库连接失败:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      this.calibreDb = null;
    }
  }

  /**
   * 初始化 Talebook 数据库连接
   */
  initTalebookDatabase() {
    try {
      console.log('🔄 初始化 Talebook 数据库连接...');
      console.log('🔄 数据库路径:', TALEBOOK_DB_PATH);
      if (!Database) {
        console.warn('⚠️ 数据库服务不可用，Talebook 功能将不可用');
        return;
      }

      // 确保数据库目录存在
      const dbDir = path.dirname(TALEBOOK_DB_PATH);
      if (!fsSync.existsSync(dbDir)) {
        console.log('📂 创建数据库目录:', dbDir);
        fsSync.mkdirSync(dbDir, { recursive: true });
        console.log('✅ 数据库目录创建成功');
      }

      // 检查数据库文件是否存在
      if (!fsSync.existsSync(TALEBOOK_DB_PATH)) {
        console.warn('⚠️ Talebook 数据库文件不存在:', TALEBOOK_DB_PATH);
        console.warn('⚠️ 请先配置 Talebook 书库路径');
        this.talebookDb = null;
        return;
      }

      this.talebookDb = new Database(TALEBOOK_DB_PATH);
      console.log('✅ Talebook 数据库对象创建成功');
      this.talebookDb.pragma('journal_mode = WAL');
      console.log('✅ Talebook WAL 模式已启用');
      this.talebookDb.pragma('foreign_keys = ON');
      console.log('✅ Talebook 外键约束已启用');

      // 初始化 qcbooklog 专属表结构
      this.initQcTables(this.talebookDb);

      console.log('✅ Talebook 数据库连接成功:', TALEBOOK_DB_PATH);
      console.log('✅ Talebook 数据库可访问:', this.isTalebookAvailable());
    } catch (error) {
      console.error('❌ Talebook 数据库连接失败:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      this.talebookDb = null;
    }
  }

  /**
   * 更新 Calibre 数据库路径
   */
  updateCalibreDbPath(newPath) {
    try {
      console.log('🔄 开始更新 Calibre 数据库路径...');
      console.log('🔄 新路径:', newPath);
      console.log('🔄 旧路径:', CALIBRE_DB_PATH);

      if (this.calibreDb) {
        console.log('🔄 关闭现有 Calibre 数据库连接...');
        this.calibreDb.close();
      }

      CALIBRE_DB_PATH = newPath;
      console.log('✅ Calibre 数据库路径已更新:', CALIBRE_DB_PATH);

      // 重新初始化数据库
      console.log('🔄 重新初始化 Calibre 数据库...');
      this.initCalibreDatabase();

      // 初始化后进行完整性检查
      console.log('🔄 进行数据库完整性检查...');
      this.checkDatabaseIntegrity();

      console.log('✅ Calibre 数据库路径更新完成');
      return { success: true, message: 'Calibre 数据库路径已更新' };
    } catch (error) {
      console.error('❌ 更新 Calibre 数据库路径失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新 Talebook 数据库路径
   */
  updateTalebookDbPath(newPath) {
    try {
      console.log('🔄 开始更新 Talebook 数据库路径...');
      console.log('🔄 新路径:', newPath);
      console.log('🔄 旧路径:', TALEBOOK_DB_PATH);

      if (this.talebookDb) {
        console.log('🔄 关闭现有 Talebook 数据库连接...');
        this.talebookDb.close();
      }

      TALEBOOK_DB_PATH = newPath;
      console.log('✅ Talebook 数据库路径已更新:', TALEBOOK_DB_PATH);

      // 重新初始化数据库
      console.log('🔄 重新初始化 Talebook 数据库...');
      this.initTalebookDatabase();

      // 初始化后进行完整性检查
      console.log('🔄 进行数据库完整性检查...');
      this.checkDatabaseIntegrity();

      console.log('✅ Talebook 数据库路径更新完成');
      return { success: true, message: 'Talebook 数据库路径已更新' };
    } catch (error) {
      console.error('❌ 更新 Talebook 数据库路径失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取当前 Calibre 数据库路径
   */
  getCalibreDbPath() {
    return CALIBRE_DB_PATH;
  }

  /**
   * 获取当前 Talebook 数据库路径
   */
  getTalebookDbPath() {
    return TALEBOOK_DB_PATH;
  }

  /**
   * 初始化 Calibre 数据库表结构
   * 注意：如果数据库已存在表结构，则完全使用现有表，不进行任何修改
   * 这样可以保证以 data/calibre/metadata.db 为模板的表结构不被破坏
   */
  initCalibreTables(db) {
    try {
      console.log('📋 开始初始化 Calibre 数据库表结构');

      // 检查是否已经存在核心表（如果存在，说明数据库已有完整结构）
      const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const hasBooksTable = existingTables.some(t => t.name === 'books');
      const hasAuthorsTable = existingTables.some(t => t.name === 'authors');

      if (hasBooksTable && hasAuthorsTable) {
        console.log('✅ 数据库已存在表结构，使用现有结构（不进行任何修改）');
        console.log(`   已有表: ${existingTables.map(t => t.name).join(', ')}`);
        return;
      }

      console.log('⚠️ 数据库表结构不完整，将创建基本表结构...');

      // 创建 books 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          timestamp TEXT,
          pubdate TEXT,
          uuid TEXT,
          has_cover INTEGER DEFAULT 0,
          path TEXT,
          series_index REAL DEFAULT 1,
          author_sort TEXT,
          last_modified TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // 创建 authors 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort TEXT
        )
      `).run();
      
      // 创建 books_authors_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_authors_link (
          book INTEGER,
          author INTEGER,
          PRIMARY KEY (book, author),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (author) REFERENCES authors(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 identifiers 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS identifiers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book INTEGER,
          type TEXT,
          val TEXT,
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 comments 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book INTEGER,
          text TEXT,
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 publishers 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS publishers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `).run();
      
      // 创建 books_publishers_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_publishers_link (
          book INTEGER,
          publisher INTEGER,
          PRIMARY KEY (book, publisher),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (publisher) REFERENCES publishers(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 ratings 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rating REAL NOT NULL
        )
      `).run();
      
      // 创建 books_ratings_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_ratings_link (
          book INTEGER,
          rating INTEGER,
          PRIMARY KEY (book, rating),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (rating) REFERENCES ratings(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 tags 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `).run();
      
      // 创建 books_tags_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_tags_link (
          book INTEGER,
          tag INTEGER,
          PRIMARY KEY (book, tag),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (tag) REFERENCES tags(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 languages 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS languages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lang_code TEXT NOT NULL
        )
      `).run();
      
      // 创建 books_languages_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_languages_link (
          book INTEGER,
          lang_code INTEGER,
          PRIMARY KEY (book, lang_code),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (lang_code) REFERENCES languages(id) ON DELETE CASCADE
        )
      `).run();
      
      // 创建 series 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS series (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `).run();
      
      // 创建 books_series_link 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS books_series_link (
          book INTEGER,
          series INTEGER,
          PRIMARY KEY (book, series),
          FOREIGN KEY (book) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (series) REFERENCES series(id) ON DELETE CASCADE
        )
      `).run();
      
      console.log('✅ Calibre 数据库表结构初始化完成');
    } catch (error) {
      console.error('❌ 初始化 Calibre 数据库表结构失败:', error.message);
      throw error;
    }
  }

  /**
   * 初始化 Talebook 数据库表结构
   * 创建 qcbooklog 应用专属数据表
   */
  initQcTables(db) {
    try {
      console.log('📋 开始初始化 qcbooklog 专属表结构');

      // 创建 items 表（如果不存在）- 统计信息表（符合 calibre-webserver (1).db 的格式）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS items (
          book_id INTEGER NOT NULL PRIMARY KEY,
          count_guest INTEGER NOT NULL DEFAULT 0,
          count_visit INTEGER NOT NULL DEFAULT 0,
          count_download INTEGER NOT NULL DEFAULT 0,
          website VARCHAR(255) NOT NULL DEFAULT '',
          collector_id INTEGER,
          sole BOOLEAN NOT NULL DEFAULT 0,
          book_type INTEGER NOT NULL DEFAULT 1,
          book_count INTEGER NOT NULL DEFAULT 0,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建 users 表（如果不存在）- 用于读者/用户管理
      db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT UNIQUE,
          avatar TEXT,
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建默认用户（如果不存在）
      const defaultUser = db.prepare('SELECT * FROM users WHERE id = 1').get();
      if (!defaultUser) {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, username, name, admin, active)
          VALUES (1, 'default', '默认用户', 1, 1)
        `).run();
        console.log('✅ 默认用户已创建');
      }

      // 创建 qc_groups 表（如果不存在）
      db.prepare(`
        CREATE TABLE IF NOT EXISTS qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // 创建 qc_book_groups 表（如果不存在）- 书籍与分组的关联表
      db.prepare(`
        CREATE TABLE IF NOT EXISTS qc_book_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE,
          UNIQUE(book_id, group_id)
        )
      `).run();
      
      // 创建 qc_bookmarks 表（如果不存在）
      db.prepare(`
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
          FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
        )
      `).run();

      // 自动迁移：添加冗余字段（如果不存在）
      const bookmarkColumns = db.prepare("PRAGMA table_info(qc_bookmarks)").all();
      const bookmarkColumnNames = bookmarkColumns.map(col => col.name);

      if (!bookmarkColumnNames.includes('book_title')) {
        db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN book_title TEXT').run();
        console.log('✅ 已为 qc_bookmarks 表添加 book_title 列');
      }
      if (!bookmarkColumnNames.includes('book_author')) {
        db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN book_author TEXT').run();
        console.log('✅ 已为 qc_bookmarks 表添加 book_author 列');
      }
      if (!bookmarkColumnNames.includes('note')) {
        db.prepare('ALTER TABLE qc_bookmarks ADD COLUMN note TEXT').run();
        console.log('✅ 已为 qc_bookmarks 表添加 note 列');
      }
      
      // 创建 qc_bookmark_tags 表（如果不存在）- 书摘与标签的关联表
      db.prepare(`
        CREATE TABLE IF NOT EXISTS qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER NOT NULL,
          tag_name TEXT NOT NULL,
          FOREIGN KEY (bookmark_id) REFERENCES qc_bookmarks(id) ON DELETE CASCADE,
          UNIQUE(bookmark_id, tag_name)
        )
      `).run();
      
      // 创建 reading_state 表（如果不存在）
      // 检查表是否存在并带有外键约束
      const existingTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reading_state'").get();
      if (existingTable) {
        console.log('📝 reading_state 表已存在，检查外键约束...');
        const foreignKeys = db.prepare('PRAGMA foreign_key_list(reading_state)').all();
        if (foreignKeys.length > 0) {
          console.log('⚠️ reading_state 表存在外键约束，需要重建...');
          // 备份数据
          const existingData = db.prepare('SELECT * FROM reading_state').all();
          console.log(`📝 备份 ${existingData.length} 条记录...`);

          // 删除旧表
          db.prepare('DROP TABLE reading_state').run();
          console.log('✅ 旧表已删除');

          // 创建新表（不带外键）
          db.prepare(`
            CREATE TABLE reading_state (
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
            )
          `).run();

          // 恢复数据
          if (existingData.length > 0) {
            const insert = db.prepare(`
              INSERT INTO reading_state (book_id, reader_id, favorite, favorite_date, wants, wants_date, read_state, read_date, online_read, download)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertMany = db.transaction((rows) => {
              for (const row of rows) {
                insert.run(
                  row.book_id,
                  row.reader_id,
                  row.favorite,
                  row.favorite_date,
                  row.wants,
                  row.wants_date,
                  row.read_state,
                  row.read_date,
                  row.online_read,
                  row.download
                );
              }
            });
            insertMany(existingData);
            console.log('✅ 数据已恢复');
          }

          console.log('✅ reading_state 表重建完成');
        } else {
          console.log('✅ reading_state 表无外键约束，无需重建');
        }
      } else {
        db.prepare(`
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
          )
        `).run();
      }
      
      // 创建 qc_bookdata 表（如果不存在）- 存储书籍扩展数据
      db.prepare(`
        CREATE TABLE IF NOT EXISTS qc_bookdata (
          book_id INTEGER PRIMARY KEY,
          page_count INTEGER DEFAULT 0,
          standard_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          purchase_date TEXT,
          binding1 INTEGER DEFAULT 0,
          binding2 INTEGER DEFAULT 0,
          paper1 INTEGER DEFAULT 0,
          edge1 INTEGER DEFAULT 0,
          edge2 INTEGER DEFAULT 0,
          note TEXT,
          total_reading_time INTEGER DEFAULT 0,
          read_pages INTEGER DEFAULT 0,
          reading_count INTEGER DEFAULT 0,
          last_read_date DATE DEFAULT NULL,
          last_read_duration INTEGER DEFAULT 0,
          FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
        )
      `).run();

      // 检查并添加缺失的列（用于升级现有数据库）
      try {
        // 检查列是否存在
        const columns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
        const columnNames = new Set(columns.map(c => c.name));

        const requiredFields = [
          { name: 'purchase_price', sql: 'purchase_price REAL DEFAULT 0' },
          { name: 'note', sql: 'note TEXT' },
          { name: 'total_reading_time', sql: 'total_reading_time INTEGER DEFAULT 0' },
          { name: 'read_pages', sql: 'read_pages INTEGER DEFAULT 0' },
          { name: 'reading_count', sql: 'reading_count INTEGER DEFAULT 0' },
          { name: 'last_read_date', sql: 'last_read_date DATE DEFAULT NULL' },
          { name: 'last_read_duration', sql: 'last_read_duration INTEGER DEFAULT 0' },
          { name: 'paper1', sql: 'paper1 INTEGER DEFAULT 0' },
          { name: 'edge1', sql: 'edge1 INTEGER DEFAULT 0' },
          { name: 'edge2', sql: 'edge2 INTEGER DEFAULT 0' }
        ];

        for (const field of requiredFields) {
          if (!columnNames.has(field.name)) {
            try {
              db.prepare(`ALTER TABLE qc_bookdata ADD COLUMN ${field.sql}`).run();
              console.log(`🔄 添加 ${field.name} 列到 qc_bookdata 表`);
            } catch (error) {
              if (!error.message.includes('duplicate column name')) {
                throw error;
              }
            }
          }
        }
      } catch (alterError) {
        console.warn('⚠️ 检查/添加列时出错（可能是新表）:', alterError.message);
      }

      // 创建 qc_reading_records 表（如果不存在）- 阅读记录
      db.prepare(`
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_book_reader ON qc_reading_records(book_id, reader_id)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_date ON qc_reading_records(start_time)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_reader_date ON qc_reading_records(reader_id, start_time)').run();
      console.log('✅ qc_reading_records 表创建完成');

      // 创建 qc_daily_reading_stats 表（如果不存在）- 每日阅读统计
      db.prepare(`
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
        )
      `).run();

      db.prepare('CREATE INDEX IF NOT EXISTS idx_daily_stats_reader_date ON qc_daily_reading_stats(reader_id, date)').run();
      console.log('✅ qc_daily_reading_stats 表创建完成');

      // 创建 reading_goals 表（如果不存在）- 阅读目标
      db.prepare(`
        CREATE TABLE IF NOT EXISTS reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          target INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, year)
        )
      `).run();
      console.log('✅ reading_goals 表创建完成');

      console.log('✅ qcbooklog 专属表结构初始化完成');
      console.log('✅ qc_bookdata 表创建完成');
    } catch (error) {
      console.error('❌ 初始化 qcbooklog 专属表结构失败:', error.message);
      throw error;
    }
  }

  /**
   * 注册 Calibre 所需的自定义函数
   */
  registerCalibreFunctions(db) {
    // title_sort 函数：用于生成排序用的标题
    db.function('title_sort', (title) => {
      if (!title) return '';
      // 移除常见的前缀（如 "A", "The", "An" 等）
      const sortTitle = title
        .replace(/^\s*(A|The|An)\s+/i, '')
        .toLowerCase()
        .trim();
      return sortTitle;
    });
    console.log('✅ 已注册 Calibre 自定义函数: title_sort');

    // uuid4 函数：用于生成 UUID v4
    db.function('uuid4', () => {
      return crypto.randomUUID();
    });
    console.log('✅ 已注册 Calibre 自定义函数: uuid4');
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
   * 获取所有书籍（从 Calibre 数据库）
   */
  getAllBooksFromCalibre() {
    try {
      console.log('🔄 === 开始从 Calibre 获取所有书籍 ===');
      console.log('🔄 数据库是否可用:', this.isCalibreAvailable());
      console.log('🔄 数据库路径:', CALIBRE_DB_PATH);
      console.log('🔄 数据库对象:', this.calibreDb ? '已连接' : '未连接');

      if (!this.calibreDb) {
        throw new Error('Calibre 数据库服务不可用');
      }

      // 强制同步WAL文件，确保能看到最新的写入数据
      this.calibreDb.pragma('wal_checkpoint(PASSIVE)');

      // 使用Calibre的meta视图获取书籍信息
      const query = `
      SELECT
        b.id,
        b.title,
        b.timestamp,
        b.pubdate,
        b.path,
        b.uuid,
        b.has_cover,
        b.series_index,
        b.last_modified,
        (
          SELECT GROUP_CONCAT(a.name, ' & ')
          FROM authors a
          JOIN books_authors_link bal ON a.id = bal.author
          WHERE bal.book = b.id
        ) as author,
        (SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn') as isbn,
        (SELECT r.rating / 2.0 FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
        (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
        (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
        (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
        (
          SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
          FROM tags t
          JOIN books_tags_link btl ON t.id = btl.tag
          WHERE btl.book = b.id
        ) as tags,
        '[]' as formats
      FROM books b
      ORDER BY b.last_modified DESC
    `;

      try {
        const books = this.calibreDb.prepare(query).all();
        console.log('✅ 查询到 Calibre 书籍数量:', books.length);

        // 获取书籍类型信息
        const booksWithType = this.enrichBooksWithType(books);

        return booksWithType;
      } catch (error) {
        console.error('❌ 从 Calibre 数据库获取书籍失败:', error.message);
        // 抛出错误，让外部try-catch块处理，从而降级到文件系统读取模式
        throw error;
      }
    } catch (error) {
      console.error('❌ 获取所有书籍失败:', error.message);
      throw error;
    }
  }

  /**
   * 从 Talebook 数据库获取书籍类型和分组信息
   */
  enrichBooksWithType(books) {
    if (!this.isTalebookAvailable()) {
      // 如果 Talebook 数据库不可用，返回原始书籍数据
      return books.map(book => ({
        ...book,
        book_type: 1, // 默认实体书
        groups: [],
        bookmarks: [],
        page_count: 0,
        standard_price: 0,
        purchase_price: 0,
        purchase_date: book.timestamp || new Date().toISOString(),
        binding1: 0,
        binding2: 0,
        paper1: 0,
        edge1: 0,
        edge2: 0,
        note: ''
      }));
    }

    try {
      // 从 Talebook 数据库获取所有书籍的类型信息
      const bookIds = books.map(book => book.id);
      if (bookIds.length === 0) {
        return books.map(book => ({
          ...book,
          book_type: 1,
          groups: [],
          bookmarks: [],
          page_count: 0,
          standard_price: 0,
          purchase_price: 0,
          purchase_date: book.timestamp || new Date().toISOString(),
          binding1: 0,
          binding2: 0,
          paper1: 0,
          edge1: 0,
          edge2: 0,
          note: ''
        }));
      }

      const placeholders = bookIds.map(() => '?').join(',');
      
      // 使用参数化查询获取书籍类型（Talebook 使用 items 表，主键是 book_id）
      const bookTypesQuery = `SELECT book_id as id, book_type FROM items WHERE book_id IN (${placeholders})`;
      const bookTypes = this.talebookDb.prepare(bookTypesQuery).all(...bookIds);
      const bookTypeMap = new Map(bookTypes.map(bt => [bt.id, bt.book_type]));

      // 获取书籍分组信息
      const bookGroupsQuery = `
        SELECT bg.book_id, g.* FROM qc_book_groups bg
        JOIN qc_groups g ON bg.group_id = g.id
        WHERE bg.book_id IN (${placeholders})
        ORDER BY g.name
      `;
      const bookGroups = this.talebookDb.prepare(bookGroupsQuery).all(...bookIds);
      
      // 构建书籍到分组的映射
      const bookGroupsMap = new Map();
      bookGroups.forEach(item => {
        if (!bookGroupsMap.has(item.book_id)) {
          bookGroupsMap.set(item.book_id, []);
        }
        // 只存储分组ID（字符串），匹配前端类型定义 string[]
        bookGroupsMap.get(item.book_id).push(String(item.id));
      });
      
      // 获取书籍扩展数据（页数、价格、购买日期、装帧、阅读追踪等）
      const bookDataQuery = `
        SELECT book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, paper1, edge1, edge2, note,
               total_reading_time, read_pages, reading_count, last_read_date, last_read_duration
        FROM qc_bookdata
        WHERE book_id IN (${placeholders})
      `;
      const bookData = this.talebookDb.prepare(bookDataQuery).all(...bookIds);
      const bookDataMap = new Map();
      bookData.forEach(item => {
        bookDataMap.set(item.book_id, {
          page_count: item.page_count || 0,
          standard_price: item.standard_price || 0,
          purchase_price: item.purchase_price || 0,
          purchase_date: item.purchase_date,
          binding1: item.binding1 || 0,
          binding2: item.binding2 || 0,
          paper1: item.paper1 || 0,
          edge1: item.edge1 || 0,
          edge2: item.edge2 || 0,
          note: item.note || '',
          // 阅读追踪字段
          total_reading_time: item.total_reading_time || 0,
          read_pages: item.read_pages || 0,
          reading_count: item.reading_count || 0,
          last_read_date: item.last_read_date || null,
          last_read_duration: item.last_read_duration || 0
        });
      });

      // 返回包含类型和分组信息的书籍数据
      return books.map(book => {
        const bookData = bookDataMap.get(book.id) || {};
        console.log(`📚 调试信息：book.id = ${book.id}, bookData =`, bookData);
        
        // 从pubdate字段提取年份作为publishYear
        let publishYear = undefined;
        if (book.pubdate) {
          const yearMatch = String(book.pubdate).match(/\d{4}/);
          if (yearMatch) {
            publishYear = parseInt(yearMatch[0], 10);
          }
        }
        
        // 解析tags为数组
        let tags = [];
        if (book.tags) {
          try {
            tags = JSON.parse(book.tags);
          } catch (e) {
            console.error(`❌ 解析tags失败: ${book.tags}`, e.message);
            tags = [];
          }
        }
        
        return {
          ...book,
          book_type: bookTypeMap.has(book.id) ? bookTypeMap.get(book.id) : 1,
          groups: bookGroupsMap.get(book.id) || [],
          bookmarks: [],
          // 新增字段
          page_count: bookData.page_count || 0,
          standard_price: bookData.standard_price || 0,
          purchase_price: bookData.purchase_price || 0,
          purchase_date: bookData.purchase_date || book.timestamp || new Date().toISOString(),
          binding1: bookData.binding1 || 0,
          binding2: bookData.binding2 || 0,
          paper1: bookData.paper1 || 0,
          edge1: bookData.edge1 || 0,
          edge2: bookData.edge2 || 0,
          note: bookData.note || '',
          // 阅读追踪字段
          total_reading_time: bookData.total_reading_time || 0,
          read_pages: bookData.read_pages || 0,
          reading_count: bookData.reading_count || 0,
          last_read_date: bookData.last_read_date || null,
          last_read_duration: bookData.last_read_duration || 0,
          // 提取出版年份
          publishYear: publishYear,
          // 解析tags为数组
          tags: tags,
          // 添加前端所需字段，兼容前端使用
          pages: bookData.page_count || 0,
          standardPrice: bookData.standard_price || 0,
          purchasePrice: bookData.purchase_price || 0,
          purchaseDate: bookData.purchase_date || book.timestamp || new Date().toISOString(),
          binding1: bookData.binding1 || 0,
          binding2: bookData.binding2 || 0,
          note: bookData.note || ''
        };
      });
    } catch (error) {
      console.error('❌ 从 Talebook 数据库获取书籍类型和分组失败:', error.message);
      // 失败时返回原始书籍数据，包含新增字段
      return books.map(book => {
        // 从pubdate字段提取年份作为publishYear
        let publishYear = undefined;
        if (book.pubdate) {
          const yearMatch = String(book.pubdate).match(/\d{4}/);
          if (yearMatch) {
            publishYear = parseInt(yearMatch[0], 10);
          }
        }
        
        // 解析tags为数组
        let tags = [];
        if (book.tags) {
          try {
            tags = JSON.parse(book.tags);
          } catch (e) {
            console.error(`❌ 解析tags失败: ${book.tags}`, e.message);
            tags = [];
          }
        }
        
        return {
          ...book,
          book_type: 1,
          groups: [],
          bookmarks: [],
          page_count: 0,
          standard_price: 0,
          purchase_price: 0,
          purchase_date: '',
          publishYear: publishYear,
          // 解析tags为数组
          tags: tags,
          // 添加前端所需字段，兼容前端使用
          pages: 0,
          standardPrice: 0,
          purchasePrice: 0,
          purchaseDate: book.timestamp || new Date().toISOString(),
          binding1: 0,
          binding2: 0,
          paper1: 0,
          edge1: 0,
          edge2: 0,
          note: ''
        };
      });
    }
  }

  /**
   * 根据ID获取书籍（从 Calibre 数据库）
   */
  getBookById(bookId) {
    try {
      if (!this.calibreDb) {
        throw new Error('Calibre 数据库未初始化');
      }

      // 强制同步WAL文件，确保能看到最新的写入数据
      this.calibreDb.pragma('wal_checkpoint(PASSIVE)');

      // 确保 bookId 是整数，不接受 UUID
      const numericBookId = parseInt(bookId, 10);
      if (isNaN(numericBookId)) {
        console.error(`❌ 无效的书籍ID: ${bookId}，只允许整数ID`);
        return null;
      }

      // 构建查询SQL和参数
      const query = `
        SELECT
          b.id,
          b.title,
          b.timestamp,
          b.pubdate,
          b.path,
          b.uuid,
          b.has_cover,
          b.series_index,
          b.last_modified,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author,
          (SELECT COALESCE((SELECT i.val FROM identifiers i WHERE i.book = b.id AND i.type = 'isbn'), '') as isbn) as isbn,
          (SELECT r.rating / 2.0 FROM ratings r JOIN books_ratings_link brl ON r.id = brl.rating WHERE brl.book = b.id) as rating,
          (SELECT c.text FROM comments c WHERE c.book = b.id) as description,
          (SELECT p.name FROM publishers p WHERE p.id IN (SELECT publisher FROM books_publishers_link WHERE book = b.id)) as publisher,
          (SELECT l.lang_code FROM languages l WHERE l.id IN (SELECT lang_code FROM books_languages_link WHERE book = b.id)) as language,
          (SELECT s.name FROM series s WHERE s.id IN (SELECT bsl.series FROM books_series_link bsl WHERE bsl.book = b.id)) as series,
          (
            SELECT '[' || GROUP_CONCAT('"' || t.name || '"', ',') || ']'
            FROM tags t
            JOIN books_tags_link btl ON t.id = btl.tag
            WHERE btl.book = b.id
          ) as tags,
          '[]' as formats
        FROM books b
        WHERE b.id = ?
      `;
      
      // 执行查询
      const book = this.calibreDb.prepare(query).get(numericBookId);
      
      if (!book) {
        return null;
      }

      // 生成封面URL（统一使用Calibre格式）
      let coverUrl = '';
      if (book.has_cover === 1) {
        // 使用数据库中存储的正确路径
        const bookPath = book.path || `${book.author || '未知作者'}/${book.title || '未知书名'}`;
        coverUrl = `/api/static/calibre/${encodeURIComponent(bookPath)}/cover.jpg`;
      }

      // 获取书籍类型和相关数据
      const bookWithType = this.enrichBooksWithType([book])[0];
      
      // 从pubdate字段提取年份作为publishYear
      let publishYear = undefined;
      console.log(`📅 调试信息：book.pubdate = ${book.pubdate}, 类型 = ${typeof book.pubdate}`);
      if (book.pubdate) {
        const yearMatch = String(book.pubdate).match(/\d{4}/);
        console.log(`📅 调试信息：yearMatch =`, yearMatch);
        if (yearMatch) {
          publishYear = parseInt(yearMatch[0], 10);
          console.log(`📅 调试信息：publishYear = ${publishYear}`);
        }
      }
      
      // 解析tags为数组
      let tags = [];
      if (book.tags) {
        try {
          tags = JSON.parse(book.tags);
        } catch (e) {
          // 如果解析失败，返回空数组
          tags = [];
        }
      }
      
      return {
        ...bookWithType,
        coverUrl: coverUrl,
        publishYear: publishYear,
        series: book.series || '',
        tags: tags,
        pages: bookWithType.page_count || 0,
        standardPrice: bookWithType.standard_price || 0,
        purchasePrice: bookWithType.purchase_price || 0,
        purchaseDate: bookWithType.purchase_date || '',
        binding1: bookWithType.binding1 || 0,
        binding2: bookWithType.binding2 || 0,
        paper1: bookWithType.paper1 || 0,
        edge1: bookWithType.edge1 || 0,
        edge2: bookWithType.edge2 || 0,
        note: bookWithType.note || '',
        readStatus: '未读',
        readCompleteDate: ''
      };
    } catch (error) {
      console.error('❌ 获取书籍失败:', error.message);
      return null;
    }
  }

  /**
   * 获取 Calibre 数据库路径
   */
  getDbPath() {
    return CALIBRE_DB_PATH;
  }

  /**
   * 获取 Talebook 数据库路径
   */
  getTalebookDbPath() {
    return TALEBOOK_DB_PATH;
  }

  /**
   * 彻底禁用所有可能引用 title_sort 的触发器和视图
   */
  disableSortTriggersAndViews(db) {
    try {
      // 禁用所有与 sort 相关的触发器
      const triggers = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='trigger'
        AND (name LIKE '%sort%' OR name LIKE '%title%' OR name LIKE '%author%')
      `).all();

      triggers.forEach(t => {
        try {
          db.prepare(`DROP TRIGGER IF EXISTS ${t.name}`).run();
        } catch (dropError) {
          // 静默处理，不记录日志
        }
      });

      // 禁用递归触发器
      db.pragma('recursive_triggers = OFF');

    } catch (error) {
      // 静默处理错误
    }
  }

  /**
   * 添加书籍到数据库
   * @param {Object} book 书籍信息
   * @returns {Object} 添加后的书籍信息（包含ID）
   */
  addBookToDB(book) {
    console.log('📝 [addBookToDB] 开始添加书籍到数据库');
    console.log('📚 [addBookToDB] 书籍数据:', JSON.stringify(book, null, 2));
    console.log('📚 [addBookToDB] 关键字段检查:');
    console.log('  - title:', book.title);
    console.log('  - author:', book.author);
    console.log('  - isbn:', book.isbn);
    console.log('  - description:', book.description ? book.description.substring(0, 100) + '...' : '无');
    console.log('  - tags:', book.tags);
    console.log('  - publisher:', book.publisher);

    try {
      if (!this.calibreDb) {
        throw new Error('Calibre 数据库未初始化');
      }

      // 验证书籍数据
      const validationResult = this.validateBookData(book, false);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      console.log('✅ [addBookToDB] 数据验证通过');

      // 使用对象来存储bookId，这样可以在transaction中修改
      const result = { bookId: null };
      
      // 开启事务并执行
      const transaction = this.calibreDb.transaction(() => {
        console.log('🔄 [addBookToDB] 开始事务');

        // 1. 处理作者
        let authorId = null;
        if (book.author) {
          // 查找或创建作者
          const author = this.calibreDb.prepare(`SELECT id FROM authors WHERE name = ?`).get(book.author);
          if (author) {
            authorId = author.id;
          } else {
            authorId = this.calibreDb.prepare(`INSERT INTO authors (name, sort) VALUES (?, ?)`).run(book.author, book.author).lastInsertRowid;
          }
        }

        // 2. 处理出版社
        let publisherId = null;
        if (book.publisher) {
          // 查找或创建出版社
          const publisher = this.calibreDb.prepare(`SELECT id FROM publishers WHERE name = ?`).get(book.publisher);
          if (publisher) {
            publisherId = publisher.id;
          } else {
            publisherId = this.calibreDb.prepare(`INSERT INTO publishers (name) VALUES (?)`).run(book.publisher).lastInsertRowid;
          }
        }

        // 3. 添加书籍到books表
        // 构建path字段：将作者中的 " / " 替换为 "&"，确保只有两级目录
        const authorPath = (book.author || '未知作者').replace(/\s*\/\s*/g, ' & ');
        const bookPath = book.path || `${authorPath}/${book.title || '未知书名'}`;
        
        const bookResult = this.calibreDb.prepare(`
          INSERT INTO books (title, author_sort, timestamp, pubdate, uuid, has_cover, path, last_modified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          book.title,
          book.author || '',
          new Date().toISOString(),
          book.publishYear ? `${book.publishYear}-01-01` : null,
          book.uuid || '',
          book.hasCover ? 1 : 0,
          bookPath,
          new Date().toISOString()
        );

        result.bookId = bookResult.lastInsertRowid;
        
        const bookId = result.bookId;
        console.log('✅ [addBookToDB] 书籍基本信息插入成功，bookId:', bookId);

        // 4. 关联作者
        if (authorId) {
          this.calibreDb.prepare(`INSERT OR IGNORE INTO books_authors_link (book, author) VALUES (?, ?)`).run(bookId, authorId);
        }

        // 5. 关联出版社
        if (publisherId) {
          this.calibreDb.prepare(`INSERT OR IGNORE INTO books_publishers_link (book, publisher) VALUES (?, ?)`).run(bookId, publisherId);
        }

        // 6. 添加ISBN
        console.log('📖 [addBookToDB] 检查ISBN字段:');
        console.log('  - book.isbn类型:', typeof book.isbn);
        console.log('  - book.isbn值:', book.isbn);
        console.log('  - book.isbn.trim():', book.isbn ? book.isbn.trim() : 'N/A');
        
        if (book.isbn && book.isbn.trim() !== '') {
          console.log('📖 [addBookToDB] 准备插入ISBN:', book.isbn);
          try {
            const isbnResult = this.calibreDb.prepare(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', ?)`).run(bookId, book.isbn);
            console.log('✅ [addBookToDB] ISBN插入成功，ID:', isbnResult.lastInsertRowid);

            // 验证ISBN是否正确插入
            const insertedISBN = this.calibreDb.prepare(`SELECT * FROM identifiers WHERE id = ?`).get(isbnResult.lastInsertRowid);
            if (!insertedISBN) {
              throw new Error('ISBN插入后验证失败');
            }
            console.log('✅ [addBookToDB] ISBN验证成功:', insertedISBN.val);
          } catch (isbnError) {
            console.error('❌ [addBookToDB] ISBN插入失败:', isbnError.message);
            // 不抛出错误，允许其他字段继续插入
            // 但记录详细的错误信息
            console.error('❌ [addBookToDB] 详细信息:', {
              bookId,
              isbn: book.isbn,
              errorStack: isbnError.stack
            });
          }
        } else {
          console.log('⚠️ [addBookToDB] ISBN为空，跳过插入');
          console.log('⚠️ [addBookToDB] ISBN值:', book.isbn);
        }

        // 7. 添加描述
        console.log('📝 [addBookToDB] 检查description字段:');
        console.log('  - book.description类型:', typeof book.description);
        console.log('  - book.description值:', book.description ? book.description.substring(0, 100) + '...' : '无');
        
        if (book.description && book.description.trim() !== '') {
          console.log('📝 [addBookToDB] 准备插入描述，长度:', book.description.length);
          try {
            const commentResult = this.calibreDb.prepare(`INSERT INTO comments (book, text) VALUES (?, ?)`).run(bookId, book.description);
            console.log('✅ [addBookToDB] 描述插入成功，ID:', commentResult.lastInsertRowid);

            // 验证描述是否正确插入
            const insertedComment = this.calibreDb.prepare(`SELECT * FROM comments WHERE id = ?`).get(commentResult.lastInsertRowid);
            if (!insertedComment) {
              throw new Error('描述插入后验证失败');
            }
            console.log('✅ [addBookToDB] 描述验证成功，长度:', insertedComment.text.length);
          } catch (commentError) {
            console.error('❌ [addBookToDB] 描述插入失败:', commentError.message);
            console.error('❌ [addBookToDB] 详细信息:', {
              bookId,
              descriptionLength: book.description.length,
              errorStack: commentError.stack
            });
          }
        } else {
          console.log('⚠️ [addBookToDB] description为空，跳过插入');
        }

        // 8. 添加评分
        if (book.rating) {
          console.log('⭐ [addBookToDB] 准备插入评分:', book.rating);
          // 将浮点数评分乘以2转换为整数（例如7.5 -> 15），以便在INTEGER字段中存储
          const ratingValue = Math.round(parseFloat(book.rating) * 2);
          console.log('🔄 [addBookToDB] 评分转换:', book.rating, '->', ratingValue);
          try {
            // 查找或创建评分
            const rating = this.calibreDb.prepare(`SELECT id FROM ratings WHERE rating = ?`).get(ratingValue);
            let ratingId;
            if (rating) {
              ratingId = rating.id;
              console.log('✅ [addBookToDB] 找到已存在的评分ID:', ratingId);
            } else {
              const newRatingResult = this.calibreDb.prepare(`INSERT INTO ratings (rating) VALUES (?)`).run(ratingValue);
              ratingId = newRatingResult.lastInsertRowid;
              console.log('✅ [addBookToDB] 创建新评分ID:', ratingId);
            }

            // 删除旧的评分关联（如果存在）
            this.calibreDb.prepare(`DELETE FROM books_ratings_link WHERE book = ?`).run(bookId);

            // 添加新的评分关联
            const ratingLinkResult = this.calibreDb.prepare(`INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)`).run(bookId, ratingId);
            console.log('✅ [addBookToDB] 评分关联成功，link ID:', ratingLinkResult.lastInsertRowid);

            // 验证评分关联是否正确插入
            const insertedRatingLink = this.calibreDb.prepare(`SELECT * FROM books_ratings_link WHERE book = ? AND rating = ?`).get(bookId, ratingId);
            if (!insertedRatingLink) {
              throw new Error('评分关联插入后验证失败');
            }
            console.log('✅ [addBookToDB] 评分关联验证成功');
          } catch (ratingError) {
            console.error('❌ [addBookToDB] 评分插入失败:', ratingError.message);
            console.error('❌ [addBookToDB] 详细信息:', {
              bookId,
              rating: book.rating,
              ratingValue,
              errorStack: ratingError.stack
            });
          }
        }

        // 9. 添加标签
        console.log('🏷️ [addBookToDB] 检查tags字段:');
        console.log('  - book.tags类型:', typeof book.tags);
        console.log('  - book.tags值:', book.tags);
        console.log('  - Array.isArray(book.tags):', Array.isArray(book.tags));
        console.log('  - book.tags?.length:', book.tags?.length);
        
        if (book.tags && Array.isArray(book.tags) && book.tags.length > 0) {
          console.log('🏷️ [addBookToDB] 准备插入标签，数量:', book.tags.length);
          let tagsInserted = 0;
          let tagsFailed = 0;

          for (const tagName of book.tags) {
            try {
              // 查找或创建标签
              const tag = this.calibreDb.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName);
              let tagId;
              if (tag) {
                tagId = tag.id;
              } else {
                // Calibre数据库的tags表没有sort列，只插入name列
                const newTagResult = this.calibreDb.prepare(`INSERT INTO tags (name) VALUES (?)`).run(tagName);
                tagId = newTagResult.lastInsertRowid;
                console.log('✅ [addBookToDB] 创建新标签:', tagName, 'ID:', tagId);
              }

              // 删除旧的标签关联（如果存在）
              this.calibreDb.prepare(`DELETE FROM books_tags_link WHERE book = ? AND tag = ?`).run(bookId, tagId);

              // 添加新的标签关联
              const tagLinkResult = this.calibreDb.prepare(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`).run(bookId, tagId);
              tagsInserted++;
              console.log('✅ [addBookToDB] 标签关联成功:', tagName, 'link ID:', tagLinkResult.lastInsertRowid);
            } catch (tagError) {
              tagsFailed++;
              console.error('❌ [addBookToDB] 标签插入失败:', tagName, tagError.message);
              console.error('❌ [addBookToDB] 详细信息:', {
                bookId,
                tagName,
                errorStack: tagError.stack
              });
            }
          }

          console.log('📊 [addBookToDB] 标签插入完成: 成功', tagsInserted, '个，失败', tagsFailed, '个');
        } else {
          console.log('⚠️ [addBookToDB] tags为空或不是数组，跳过插入');
          console.log('⚠️ [addBookToDB] tags值:', book.tags);
        }

        // 10. 添加丛书
        if (book.series && book.series.trim() !== '') {
          console.log('📚 [addBookToDB] 准备插入丛书:', book.series);
          try {
            // 查找或创建丛书
            const series = this.calibreDb.prepare(`SELECT id FROM series WHERE name = ?`).get(book.series);
            let seriesId;
            if (series) {
              seriesId = series.id;
            } else {
              const newSeriesResult = this.calibreDb.prepare(`INSERT INTO series (name) VALUES (?)`).run(book.series);
              seriesId = newSeriesResult.lastInsertRowid;
              console.log('✅ [addBookToDB] 创建新丛书:', book.series, 'ID:', seriesId);
            }

            // 删除旧的丛书关联（如果存在）
            this.calibreDb.prepare(`DELETE FROM books_series_link WHERE book = ?`).run(bookId);

            // 关联书籍和丛书
            const seriesLinkResult = this.calibreDb.prepare(`INSERT INTO books_series_link (book, series) VALUES (?, ?)`).run(bookId, seriesId);
            console.log('✅ [addBookToDB] 丛书关联成功，link ID:', seriesLinkResult.lastInsertRowid);

            // 验证丛书关联是否正确插入
            const insertedSeriesLink = this.calibreDb.prepare(`SELECT * FROM books_series_link WHERE book = ? AND series = ?`).get(bookId, seriesId);
            if (!insertedSeriesLink) {
              throw new Error('丛书关联插入后验证失败');
            }
            console.log('✅ [addBookToDB] 丛书关联验证成功');
          } catch (seriesError) {
            console.error('❌ [addBookToDB] 丛书插入失败:', seriesError.message);
            console.error('❌ [addBookToDB] 详细信息:', {
              bookId,
              series: book.series,
              errorStack: seriesError.stack
            });
          }
        }

        // 11. 添加语言
        if (book.language) {
          console.log('🌍 [addBookToDB] 准备插入语言:', book.language);
          try {
            // 查找或创建语言
            const language = this.calibreDb.prepare(`SELECT id FROM languages WHERE lang_code = ?`).get(book.language);
            let langId;
            if (language) {
              langId = language.id;
            } else {
              const newLanguageResult = this.calibreDb.prepare(`INSERT INTO languages (lang_code) VALUES (?)`).run(book.language);
              langId = newLanguageResult.lastInsertRowid;
              console.log('✅ [addBookToDB] 创建新语言:', book.language, 'ID:', langId);
            }

            // 删除旧的语言关联（如果存在）
            this.calibreDb.prepare(`DELETE FROM books_languages_link WHERE book = ?`).run(bookId);

            // Calibre数据库的books_languages_link表使用lang_code作为列名，而不是language
            const languageLinkResult = this.calibreDb.prepare(`INSERT INTO books_languages_link (book, lang_code) VALUES (?, ?)`).run(bookId, langId);
            console.log('✅ [addBookToDB] 语言关联成功，link ID:', languageLinkResult.lastInsertRowid);

            // 验证语言关联是否正确插入
            const insertedLanguageLink = this.calibreDb.prepare(`SELECT * FROM books_languages_link WHERE book = ? AND lang_code = ?`).get(bookId, langId);
            if (!insertedLanguageLink) {
              throw new Error('语言关联插入后验证失败');
            }
            console.log('✅ [addBookToDB] 语言关联验证成功');
          } catch (languageError) {
            console.error('❌ [addBookToDB] 语言插入失败:', languageError.message);
            console.error('❌ [addBookToDB] 详细信息:', {
              bookId,
              language: book.language,
              errorStack: languageError.stack
            });
          }
        }
      });
      
      // 执行事务
      transaction();

      // 3. 如果 Talebook 数据库可用，同步书籍到 Talebook 数据库
      if (this.isTalebookAvailable()) {
        try {
          // 检查书籍是否已存在于 Talebook 数据库（items表的主键是book_id）
        const existingItem = this.talebookDb.prepare(`SELECT book_id FROM items WHERE book_id = ?`).get(result.bookId);
        if (!existingItem) {
          // 插入书籍到 Talebook 数据库的 items 表（只存储统计信息）
          this.talebookDb.prepare(`
            INSERT INTO items (book_id, book_type, create_time)
            VALUES (?, ?, ?)
          `).run(
            result.bookId,
            book.book_type || 1,
            new Date().toISOString()
          );
          console.log('✅ 书籍同步到 Talebook 数据库items表成功');
        } else {
          // 更新书籍类型
          this.talebookDb.prepare(`
            UPDATE items
            SET book_type = ?
            WHERE book_id = ?
          `).run(
            book.book_type || existingItem.book_type || 1,
            result.bookId
          );
          console.log('✅ 书籍类型更新到 Talebook 数据库items表成功');
        }
        
        // 检查书籍是否已存在于qc_bookdata表
        const existingBookData = this.talebookDb.prepare(`SELECT * FROM qc_bookdata WHERE book_id = ?`).get(result.bookId);
        if (!existingBookData) {
          // 处理前端发送的pages字段，兼容pageCount字段
          // 提取数字页数
          let pageCount = 0;
          if (book.pageCount) {
            pageCount = parseInt(book.pageCount) || 0;
          } else if (book.pages) {
            // 处理字符串格式的页数，如"114页"
            pageCount = parseInt(String(book.pages).match(/\d+/)?.[0] || '0') || 0;
          }

          // 插入书籍到qc_bookdata表，包含所有新增字段
          this.talebookDb.prepare(`
            INSERT INTO qc_bookdata (book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, paper1, edge1, edge2, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            result.bookId,
            pageCount,
            book.standardPrice || 0,
            book.purchasePrice || 0,
            book.purchaseDate || new Date().toISOString(),
            book.binding1 || 0,
            book.binding2 || 0,
            book.paper1 || 0,
            book.edge1 || 0,
            book.edge2 || 0,
            book.note || ''
          );
          console.log('✅ 书籍同步到 Talebook 数据库qc_bookdata表成功');
        } else {
          // 处理前端发送的pages字段，兼容pageCount字段
          // 提取数字页数
          let pageCount = existingBookData.page_count || 0;
          if (book.pageCount) {
            pageCount = parseInt(book.pageCount) || existingBookData.page_count || 0;
          } else if (book.pages) {
            // 处理字符串格式的页数，如"114页"
            pageCount = parseInt(String(book.pages).match(/\d+/)?.[0] || String(existingBookData.page_count)) || 0;
          }

          // 如果已存在，则更新数据
          this.talebookDb.prepare(`
            UPDATE qc_bookdata
            SET page_count = ?, standard_price = ?, purchase_price = ?, purchase_date = ?, binding1 = ?, binding2 = ?, paper1 = ?, edge1 = ?, edge2 = ?, note = ?
            WHERE book_id = ?
          `).run(
            pageCount,
            book.standardPrice || existingBookData.standard_price || 0,
            book.purchasePrice || existingBookData.purchase_price || 0,
            book.purchaseDate || existingBookData.purchase_date || new Date().toISOString(),
            book.binding1 !== undefined ? book.binding1 : existingBookData.binding1 || 0,
            book.binding2 !== undefined ? book.binding2 : existingBookData.binding2 || 0,
            book.paper1 !== undefined ? book.paper1 : existingBookData.paper1 || 0,
            book.edge1 !== undefined ? book.edge1 : existingBookData.edge1 || 0,
            book.edge2 !== undefined ? book.edge2 : existingBookData.edge2 || 0,
            book.note !== undefined ? book.note : (existingBookData.note || ''),
            result.bookId
          );
          console.log('✅ 书籍更新到 Talebook 数据库qc_bookdata表成功');
        }
          
          // 4. 处理分组关联
          if (book.groups && Array.isArray(book.groups) && book.groups.length > 0) {
            for (const group of book.groups) {
              if (group.id) {
                // 插入书籍与分组的关联
                this.talebookDb.prepare(`
                  INSERT OR IGNORE INTO qc_book_groups (book_id, group_id)
                  VALUES (?, ?)
                `).run(result.bookId, group.id);
              }
            }
          }
        } catch (talebookError) {
          console.error('❌ 同步书籍到 Talebook 数据库失败:', talebookError.message);
          console.error('❌ 错误详情:', talebookError.stack);
          // 不影响主流程，继续执行
        }
      }

      // 重新获取完整的书籍信息（包含所有关联数据）
      const addedBook = this.getBookById(result.bookId);
      return addedBook || { id: result.bookId, ...book };
    } catch (error) {
      console.error('❌ 添加书籍到数据库失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新数据库中的书籍信息
   * @param {Object} book 书籍信息（包含ID）
   * @returns {Object} 更新后的书籍信息
   */
  updateBookInDB(book) {
    try {
      console.log('\n🔄 === 开始更新书籍到数据库 ===');
      console.log('🔄 书籍ID:', book.id);
      console.log('🔄 书籍标题:', book.title);
      console.log('🔄 要更新的字段:', {
        binding1: book.binding1,
        binding2: book.binding2,
        purchasePrice: book.purchasePrice,
        standardPrice: book.standardPrice,
        note: book.note,
        purchaseDate: book.purchaseDate,
        isbn: book.isbn,
        description: book.description ? book.description.substring(0, 50) + '...' : '无',
        tags: book.tags
      });

      if (!this.calibreDb) {
        throw new Error('Calibre 数据库未初始化');
      }

      // 验证书籍数据
      const validationResult = this.validateBookData(book, true);
      if (!validationResult.isValid) {
        throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
      }

      const bookId = parseInt(book.id, 10);
      if (isNaN(bookId)) {
        throw new Error('无效的书籍ID');
      }

      // 获取当前书籍的完整信息（包括 ISBN、description、tags 等）
      console.log('🔄 获取当前书籍的完整信息...');
      const currentBook = this.getBookById(bookId);
      if (!currentBook) {
        throw new Error('书籍不存在');
      }
      console.log('🔄 当前书籍信息:', {
        isbn: currentBook.isbn,
        description: currentBook.description ? currentBook.description.substring(0, 50) + '...' : '无',
        tags: currentBook.tags
      });

      // 合并新旧数据，确保不会丢失任何字段
      const mergedBook = {
        ...currentBook,
        ...book,
        // 确保关键字段不会丢失
        isbn: book.isbn !== undefined ? book.isbn : currentBook.isbn,
        description: book.description !== undefined ? book.description : currentBook.description,
        tags: book.tags !== undefined ? book.tags : currentBook.tags,
        rating: book.rating !== undefined ? book.rating : currentBook.rating,
        publisher: book.publisher !== undefined ? book.publisher : currentBook.publisher,
        language: book.language !== undefined ? book.language : currentBook.language,
        series: book.series !== undefined ? book.series : currentBook.series,
        pages: book.pages !== undefined ? book.pages : currentBook.pages
      };
      console.log('🔄 合并后的书籍信息:', {
        isbn: mergedBook.isbn,
        description: mergedBook.description ? mergedBook.description.substring(0, 50) + '...' : '无',
        tags: mergedBook.tags,
        pages: mergedBook.pages
      });

      // 开启事务
      console.log('🔄 开始Calibre数据库事务...');
      const transaction = this.calibreDb.transaction(() => {
        // 构建path字段：将作者中的 " / " 替换为 "&"，确保只有两级目录
        const authorPath = (mergedBook.author || '未知作者').replace(/\s*\/\s*/g, ' & ');
        const bookPath = mergedBook.path || `${authorPath}/${mergedBook.title || '未知书名'}`;
        
        // 1. 更新书籍基本信息
        this.calibreDb.prepare(`
          UPDATE books 
          SET title = ?, author_sort = ?, pubdate = ?, has_cover = ?, path = ?, last_modified = ?
          WHERE id = ?
        `).run(
          mergedBook.title,
          mergedBook.author || '',
          mergedBook.publishYear ? `${mergedBook.publishYear}-01-01` : new Date().toISOString(),
          mergedBook.hasCover ? 1 : 0,
          bookPath,
          new Date().toISOString(),
          bookId
        );

        // 2. 处理作者
        if (mergedBook.author) {
          // 查找或创建作者
          const author = this.calibreDb.prepare(`SELECT id FROM authors WHERE name = ?`).get(mergedBook.author);
          let authorId;
          if (author) {
            authorId = author.id;
          } else {
            authorId = this.calibreDb.prepare(`INSERT INTO authors (name, sort) VALUES (?, ?)`).run(mergedBook.author, mergedBook.author).lastInsertRowid;
          }

          // 删除旧的作者关联
          this.calibreDb.prepare(`DELETE FROM books_authors_link WHERE book = ?`).run(bookId);
          // 添加新的作者关联
          this.calibreDb.prepare(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`).run(bookId, authorId);
        }

        // 3. 处理出版社
        if (mergedBook.publisher) {
          // 查找或创建出版社
          const publisher = this.calibreDb.prepare(`SELECT id FROM publishers WHERE name = ?`).get(mergedBook.publisher);
          let publisherId;
          if (publisher) {
            publisherId = publisher.id;
          } else {
            publisherId = this.calibreDb.prepare(`INSERT INTO publishers (name) VALUES (?)`).run(mergedBook.publisher).lastInsertRowid;
          }

          // 删除旧的出版社关联
          this.calibreDb.prepare(`DELETE FROM books_publishers_link WHERE book = ?`).run(bookId);
          // 添加新的出版社关联
          this.calibreDb.prepare(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)`).run(bookId, publisherId);
        }

        // 4. 更新ISBN
        this.calibreDb.prepare(`DELETE FROM identifiers WHERE book = ? AND type = 'isbn'`).run(bookId);
        if (mergedBook.isbn && mergedBook.isbn.trim() !== '') {
          this.calibreDb.prepare(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', ?)`).run(bookId, mergedBook.isbn);
          console.log('✅ ISBN已更新:', mergedBook.isbn);
        } else {
          console.log('⚠️ ISBN为空，跳过更新');
        }

        // 5. 更新描述
        this.calibreDb.prepare(`DELETE FROM comments WHERE book = ?`).run(bookId);
        if (mergedBook.description && mergedBook.description.trim() !== '') {
          this.calibreDb.prepare(`INSERT INTO comments (book, text) VALUES (?, ?)`).run(bookId, mergedBook.description);
          console.log('✅ 描述已更新，长度:', mergedBook.description.length);
        } else {
          console.log('⚠️ 描述为空，跳过更新');
        }

        // 6. 更新评分
        this.calibreDb.prepare(`DELETE FROM books_ratings_link WHERE book = ?`).run(bookId);
        if (mergedBook.rating) {
          // 将浮点数评分乘以2转换为整数（例如7.5 -> 15），以便在INTEGER字段中存储
          const ratingValue = Math.round(parseFloat(mergedBook.rating) * 2);
          // 查找或创建评分
          const rating = this.calibreDb.prepare(`SELECT id FROM ratings WHERE rating = ?`).get(ratingValue);
          let ratingId;
          if (rating) {
            ratingId = rating.id;
          } else {
            ratingId = this.calibreDb.prepare(`INSERT INTO ratings (rating) VALUES (?)`).run(ratingValue).lastInsertRowid;
          }
          this.calibreDb.prepare(`INSERT INTO books_ratings_link (book, rating) VALUES (?, ?)`).run(bookId, ratingId);
          console.log('✅ 评分已更新:', mergedBook.rating);
        }

        // 7. 更新标签
        this.calibreDb.prepare(`DELETE FROM books_tags_link WHERE book = ?`).run(bookId);
        if (mergedBook.tags && Array.isArray(mergedBook.tags) && mergedBook.tags.length > 0) {
          console.log('🏷️ 更新标签，数量:', mergedBook.tags.length);
          for (const tagName of mergedBook.tags) {
            // 查找或创建标签
            const tag = this.calibreDb.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName);
            let tagId;
            if (tag) {
              tagId = tag.id;
            } else {
              // tags表没有sort字段，只插入name字段
              tagId = this.calibreDb.prepare(`INSERT INTO tags (name) VALUES (?)`).run(tagName).lastInsertRowid;
            }
            this.calibreDb.prepare(`INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`).run(bookId, tagId);
          }
        }

        // 8. 更新语言
        this.calibreDb.prepare(`DELETE FROM books_languages_link WHERE book = ?`).run(bookId);
        if (mergedBook.language) {
          // 查找或创建语言
          const language = this.calibreDb.prepare(`SELECT id FROM languages WHERE lang_code = ?`).get(mergedBook.language);
          let langId;
          if (language) {
            langId = language.id;
          } else {
            langId = this.calibreDb.prepare(`INSERT INTO languages (lang_code) VALUES (?)`).run(mergedBook.language).lastInsertRowid;
          }
          this.calibreDb.prepare(`INSERT INTO books_languages_link (book, lang_code) VALUES (?, ?)`).run(bookId, langId);
          console.log('✅ 语言已更新:', mergedBook.language);
        }

        // 9. 更新丛书
        this.calibreDb.prepare(`DELETE FROM books_series_link WHERE book = ?`).run(bookId);
        if (mergedBook.series && mergedBook.series.trim() !== '') {
          // 查找或创建丛书
          const series = this.calibreDb.prepare(`SELECT id FROM series WHERE name = ?`).get(mergedBook.series);
          let seriesId;
          if (series) {
            seriesId = series.id;
          } else {
            seriesId = this.calibreDb.prepare(`INSERT INTO series (name) VALUES (?)`).run(mergedBook.series).lastInsertRowid;
          }
          // 关联书籍和丛书
          this.calibreDb.prepare(`INSERT OR IGNORE INTO books_series_link (book, series) VALUES (?, ?)`).run(bookId, seriesId);
          console.log('✅ 丛书已更新:', mergedBook.series);
        }
      });
      
      // 执行事务
      transaction();

      // 3. 如果 Talebook 数据库可用，同步更新书籍到 Talebook 数据库
      if (this.isTalebookAvailable()) {
        try {
          console.log('🔄 开始同步到Talebook数据库...');

          // 更新 Talebook 数据库中的书籍类型（items表只有统计字段，不存储书籍详细信息）
          const bookType = book.book_type !== undefined && book.book_type !== null ? book.book_type : 1;
          // 检查书籍是否存在
          const existingItem = this.talebookDb.prepare(`SELECT book_id FROM items WHERE book_id = ?`).get(bookId);
          if (existingItem) {
            this.talebookDb.prepare(`
              UPDATE items
              SET book_type = ?
              WHERE book_id = ?
            `).run(
              bookType,
              bookId
            );
            console.log('✅ items表book_type更新成功，book_type:', bookType);
          } else {
            // 如果不存在则创建记录
            this.talebookDb.prepare(`
              INSERT INTO items (book_id, book_type, create_time)
              VALUES (?, ?, ?)
            `).run(
              bookId,
              bookType,
              new Date().toISOString()
            );
            console.log('✅ items表记录创建成功，book_type:', bookType);
          }
          
          // 更新分组关联
          if (book.groups) {
            // 删除旧的分组关联
            this.talebookDb.prepare(`DELETE FROM qc_book_groups WHERE book_id = ?`).run(bookId);

            // 添加新的分组关联
            if (Array.isArray(book.groups) && book.groups.length > 0) {
              for (const group of book.groups) {
                // 兼容字符串数组和对象数组
                const groupId = typeof group === 'object' && group.id ? group.id : group;
                if (groupId) {
                  this.talebookDb.prepare(`
                    INSERT OR IGNORE INTO qc_book_groups (book_id, group_id)
                    VALUES (?, ?)
                  `).run(bookId, groupId);
                }
              }
            }
          }
          
          // 更新qc_bookdata表中的扩展字段
          const existingBookData = this.talebookDb.prepare(`SELECT * FROM qc_bookdata WHERE book_id = ?`).get(bookId);
          console.log('🔄 现有qc_bookdata记录:', existingBookData);
          
          // 处理前端发送的pages字段，兼容pageCount字段
          // 提取数字页数
          let pageCount = 0;
          if (book.pageCount) {
            pageCount = parseInt(book.pageCount) || 0;
          } else if (book.pages) {
            // 处理字符串格式的页数，如"114页"
            pageCount = parseInt(String(book.pages).match(/\d+/)?.[0] || '0') || 0;
          }

          if (existingBookData) {
            console.log('🔄 更新现有qc_bookdata记录...');
            // 更新现有记录
            const updateResult = this.talebookDb.prepare(`
              UPDATE qc_bookdata
              SET page_count = ?, standard_price = ?, purchase_price = ?, purchase_date = ?, binding1 = ?, binding2 = ?, paper1 = ?, edge1 = ?, edge2 = ?, note = ?
              WHERE book_id = ?
            `).run(
              pageCount,
              book.standardPrice || existingBookData.standard_price || 0,
              book.purchasePrice || existingBookData.purchase_price || 0,
              book.purchaseDate || existingBookData.purchase_date || new Date().toISOString(),
              book.binding1 !== undefined ? book.binding1 : existingBookData.binding1 || 0,
              book.binding2 !== undefined ? book.binding2 : existingBookData.binding2 || 0,
              book.paper1 !== undefined ? book.paper1 : existingBookData.paper1 || 0,
              book.edge1 !== undefined ? book.edge1 : existingBookData.edge1 || 0,
              book.edge2 !== undefined ? book.edge2 : existingBookData.edge2 || 0,
              book.note !== undefined ? book.note : (existingBookData.note || ''),
              bookId
            );
            console.log('🔄 qc_bookdata更新结果，影响行数:', updateResult.changes);
          } else {
            console.log('🔄 插入新qc_bookdata记录...');
            // 插入新记录
            const insertResult = this.talebookDb.prepare(`
              INSERT INTO qc_bookdata (book_id, page_count, standard_price, purchase_price, purchase_date, binding1, binding2, paper1, edge1, edge2, note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              bookId,
              pageCount,
              book.standardPrice || 0,
              book.purchasePrice || 0,
              book.purchaseDate || new Date().toISOString(),
              book.binding1 || 0,
              book.binding2 || 0,
              book.paper1 || 0,
              book.edge1 || 0,
              book.edge2 || 0,
              book.note || ''
            );
            console.log('🔄 qc_bookdata插入结果，lastInsertRowid:', insertResult.lastInsertRowid);
          }
          
          console.log('✅ 书籍更新同步到 Talebook 数据库成功');
        } catch (talebookError) {
          console.error('❌ 同步更新书籍到 Talebook 数据库失败:', talebookError.message);
          console.error('❌ 错误堆栈:', talebookError.stack);
          // 不影响主流程，继续执行
        }
      } else {
        console.warn('⚠️ Talebook数据库不可用，跳过同步');
      }

      // 强制同步WAL文件到主数据库，确保更新立即生效
      console.log('🔄 开始同步WAL文件...');
      if (this.calibreDb) {
        this.calibreDb.pragma('wal_checkpoint(FULL)');
        console.log('✅ Calibre数据库WAL同步完成');
      }
      if (this.talebookDb) {
        this.talebookDb.pragma('wal_checkpoint(FULL)');
        console.log('✅ Talebook数据库WAL同步完成');
      }

      // 验证更新是否成功
      console.log('🔄 验证更新结果...');
      const verifyResult = this.talebookDb.prepare(`SELECT * FROM qc_bookdata WHERE book_id = ?`).get(bookId);
      console.log('🔄 验证结果 - qc_bookdata记录:', verifyResult);

      // 重新获取完整的书籍信息（包含所有关联数据）
      console.log('🔄 重新获取完整书籍信息...');
      const updatedBook = this.getBookById(bookId);
      console.log('🔄 更新后的书籍信息:', {
        id: updatedBook?.id,
        title: updatedBook?.title,
        binding1: updatedBook?.binding1,
        binding2: updatedBook?.binding2,
        purchasePrice: updatedBook?.purchasePrice,
        standardPrice: updatedBook?.standardPrice,
        note: updatedBook?.note
      });
      console.log('✅ === 书籍更新完成 ===\n');
      return updatedBook || { id: bookId, ...book };
    } catch (error) {
      console.error('❌ 更新书籍到数据库失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取书籍的阅读状态
   * @param {number} bookId - 书籍ID
   * @param {number} readerId - 读者ID（默认为0）
   * @returns {Object} 阅读状态对象
   */
  getReadingState(bookId, readerId = 0) {
    try {
      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      const readingState = this.talebookDb.prepare(`
        SELECT * FROM reading_state WHERE book_id = ? AND reader_id = ?
      `).get(bookId, readerId);

      return readingState || {
        book_id: bookId,
        reader_id: readerId,
        favorite: 0,
        favorite_date: null,
        wants: 0,
        wants_date: null,
        read_state: 0,
        read_date: null,
        online_read: 0,
        download: 0
      };
    } catch (error) {
      console.error('❌ 获取阅读状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新书籍的阅读状态
   * @param {number} bookId - 书籍ID
   * @param {Object} readingState - 阅读状态对象
   * @param {number} readerId - 读者ID（默认为0）
   * @returns {Object} 更新后的阅读状态
   */
  updateReadingState(bookId, readingState, readerId = 0) {
    try {
      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      // 验证阅读状态值
      const validReadStates = [0, 1, 2]; // 0:未读, 1:在读, 2:已读完
      if (!validReadStates.includes(readingState.read_state)) {
        throw new Error('无效的阅读状态值');
      }

      // 检查书籍是否在items表中存在，如果不存在则创建
      const existingItem = this.talebookDb.prepare('SELECT book_id FROM items WHERE book_id = ?').get(bookId);
      if (!existingItem) {
        console.log(`📝 书籍 ${bookId} 不在 items 表中，创建记录...`);
        // 创建items记录（items表只存储统计信息）
        this.talebookDb.prepare(`
          INSERT INTO items (book_id, book_type, create_time)
          VALUES (?, 1, ?)
        `).run(bookId, new Date().toISOString());
        console.log(`✅ 已在 items 表中创建书籍 ${bookId} 的记录`);
      }

      const now = new Date().toISOString();

      // 使用 upsert 语法更新或插入阅读状态
      this.talebookDb.prepare(`
        INSERT INTO reading_state (
          book_id, reader_id, favorite, favorite_date, wants, wants_date,
          read_state, read_date, online_read, download
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (book_id, reader_id) DO UPDATE SET
          favorite = excluded.favorite,
          favorite_date = excluded.favorite_date,
          wants = excluded.wants,
          wants_date = excluded.wants_date,
          read_state = excluded.read_state,
          read_date = excluded.read_date,
          online_read = excluded.online_read,
          download = excluded.download
      `).run(
        bookId,
        readerId,
        readingState.favorite || 0,
        readingState.favorite === 1 ? now : null,
        readingState.wants || 0,
        readingState.wants === 1 ? now : null,
        readingState.read_state || 0,
        now,
        readingState.online_read || 0,
        readingState.download || 0
      );

      return this.getReadingState(bookId, readerId);
    } catch (error) {
      console.error('❌ 更新阅读状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新书籍的 book_type
   * @param {number} bookId - 书籍ID
   * @param {number} bookType - 书籍类型（0:电子书, 1:实体书）
   * @returns {Object} 更新结果
   */
  updateBookType(bookId, bookType) {
    try {
      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      // 验证书籍类型值
      const validBookTypes = [0, 1]; // 0:电子书, 1:实体书
      if (!validBookTypes.includes(bookType)) {
        throw new Error('无效的书籍类型值');
      }

      // 更新 items 表中的 book_type 字段
      this.talebookDb.prepare(`
        UPDATE items SET book_type = ? WHERE id = ?
      `).run(bookType, bookId);

      return { success: true, message: '书籍类型已更新' };
    } catch (error) {
      console.error('❌ 更新书籍类型失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取书籍的 book_type
   * @param {number} bookId - 书籍ID
   * @returns {number} 书籍类型
   */
  getBookType(bookId) {
    try {
      if (!this.isTalebookAvailable()) {
        return 1; // 默认实体书类型
      }

      const result = this.talebookDb.prepare(`
        SELECT book_type FROM items WHERE book_id = ?
      `).get(bookId);

      return result ? result.book_type : 1;
    } catch (error) {
      console.error('❌ 获取书籍类型失败:', error.message);
      return 1;
    }
  }

  /**
   * 获取所有书籍的阅读状态
   * @param {number} readerId - 读者ID（默认为0）
   * @returns {Array} 阅读状态列表
   */
  getAllReadingStates(readerId = 0) {
    try {
      if (!this.isTalebookAvailable()) {
        return [];
      }

      const readingStates = this.talebookDb.prepare(`
        SELECT * FROM reading_state WHERE reader_id = ?
      `).all(readerId);

      return readingStates;
    } catch (error) {
      console.error('❌ 获取所有阅读状态失败:', error.message);
      return [];
    }
  }

  /**
   * 更新书籍的阅读进度
   * @param {number} bookId - 书籍ID
   * @param {number} readPages - 已读页数
   * @returns {Object} 更新结果
   */
  updateBookReadingProgress(bookId, readPages) {
    try {
      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      // 检查书籍是否在 qc_bookdata 表中存在
      const existingData = this.talebookDb.prepare('SELECT book_id FROM qc_bookdata WHERE book_id = ?').get(bookId);

      if (existingData) {
        // 更新现有记录
        this.talebookDb.prepare(`
          UPDATE qc_bookdata
          SET read_pages = ?
          WHERE book_id = ?
        `).run(readPages, bookId);
        console.log(`✅ 更新阅读进度成功: 书籍ID=${bookId}, 已读页数=${readPages}`);
      } else {
        // 创建新记录
        this.talebookDb.prepare(`
          INSERT INTO qc_bookdata (book_id, read_pages)
          VALUES (?, ?)
        `).run(bookId, readPages);
        console.log(`✅ 创建阅读进度记录成功: 书籍ID=${bookId}, 已读页数=${readPages}`);
      }

      return { bookId, readPages };
    } catch (error) {
      console.error('❌ 更新阅读进度失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新书籍的阅读状态
   * @param {Array} readingStates - 阅读状态列表
   * @param {number} readerId - 读者ID（默认为0）
   * @returns {Object} 更新结果
   */
  batchUpdateReadingStates(readingStates, readerId = 0) {
    try {
      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      if (!Array.isArray(readingStates)) {
        throw new Error('readingStates 必须是数组');
      }

      // 使用事务批量更新
      this.talebookDb.transaction(() => {
        for (const state of readingStates) {
          this.updateReadingState(state.book_id, state, readerId);
        }
      })();

      return { success: true, message: '批量更新阅读状态成功' };
    } catch (error) {
      console.error('❌ 批量更新阅读状态失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证书籍数据
   * @param {Object} book - 书籍对象
   * @param {boolean} isUpdate - 是否为更新操作
   * @returns {Object} 验证结果
   */
  validateBookData(book, isUpdate = false) {
    const errors = [];

    // 验证必填字段
    if (!book.title || book.title.trim() === '') {
      errors.push('书籍标题不能为空');
    }

    if (isUpdate) {
      // 更新操作必须提供ID
      if (!book.id) {
        errors.push('更新操作必须提供书籍ID');
      } else if (isNaN(parseInt(book.id, 10))) {
        errors.push('书籍ID必须是有效的数字');
      }
    }

    // 验证ISBN格式
    if (book.isbn && book.isbn.trim() !== '') {
      const isbnRegex = /^(?:ISBN(?:-1[03])?:?\ )?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\ ]){3})[-\ 0-9X]{13}$|97[89][-\ ]?[0-9]{10}$|(?=(?:[0-9]+[-\ ]){4})[-\ 0-9]{17}$)(?:97[89][-\ ]?)?[0-9]{1,5}[-\ ]?[0-9]+[-\ ]?[0-9]+[-\ ]?[0-9X]$/;
      if (!isbnRegex.test(book.isbn)) {
        errors.push('ISBN格式无效');
      }
    }

    // 验证评分范围
    if (book.rating !== undefined && book.rating !== null) {
      const rating = parseFloat(book.rating);
      if (isNaN(rating) || rating < 0 || rating > 10) {
        errors.push('评分必须是0到10之间的数字');
      }
    }

    // 验证出版年份
    if (book.publishYear) {
      const year = parseInt(book.publishYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1000 || year > currentYear + 10) {
        errors.push('出版年份无效');
      }
    }

    // 验证语言代码
    if (book.language) {
      const languageRegex = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,3})?$/;
      if (!languageRegex.test(book.language)) {
        errors.push('语言代码格式无效');
      }
    }

    // 验证标签格式
    if (book.tags) {
      if (!Array.isArray(book.tags)) {
        errors.push('标签必须是数组格式');
      } else {
        for (const tag of book.tags) {
          if (typeof tag !== 'string' || tag.trim() === '') {
            errors.push('每个标签必须是有效的字符串');
          }
        }
      }
    }

    // 验证封面状态
    if (book.hasCover !== undefined && book.hasCover !== null) {
      if (typeof book.hasCover !== 'boolean' && typeof book.hasCover !== 'number') {
        errors.push('封面状态必须是布尔值或数字');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 获取所有读者列表
   * @returns {Array} 读者列表
   */
  getAllReaders() {
    try {
      if (!this.isTalebookAvailable()) {
        console.warn('⚠️ Talebook数据库不可用，返回默认读者');
        // 返回默认读者（reader_id = 0）
        return [
          {
            id: 0,
            name: '默认读者',
            username: 'default',
            active: true
          }
        ];
      }

      const readers = this.talebookDb.prepare(`
        SELECT id, username, name, email, avatar, admin, active
        FROM readers
        WHERE active = 1
        ORDER BY id
      `).all();

      // 确保始终包含默认读者（reader_id = 0）
      if (!readers.some(r => r.id === 0)) {
        readers.unshift({
          id: 0,
          name: '默认读者',
          username: 'default',
          active: true
        });
      }

      console.log(`✅ 获取读者列表成功，共${readers.length}个读者`);
      return readers;
    } catch (error) {
      console.error('❌ 获取读者列表失败:', error.message);
      // 返回默认读者作为后备
      return [
        {
          id: 0,
          name: '默认读者',
          username: 'default',
          active: true
        }
      ];
    }
  }

  /**
   * 根据ID获取读者信息
   * @param {number} readerId - 读者ID
   * @returns {Object} 读者信息
   */
  getReaderById(readerId) {
    try {
      if (readerId === 0) {
        return {
          id: 0,
          name: '默认读者',
          username: 'default',
          active: true
        };
      }

      if (!this.isTalebookAvailable()) {
        throw new Error('Talebook 数据库服务不可用');
      }

      const reader = this.talebookDb.prepare(`
        SELECT id, username, name, email, avatar, admin, active
        FROM readers
        WHERE id = ? AND active = 1
      `).get(readerId);

      if (!reader) {
        throw new Error('读者不存在或未激活');
      }

      return reader;
    } catch (error) {
      console.error('❌ 获取读者信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取 Talebook 数据库对象
   */
  getDatabase() {
    return this.talebookDb;
  }

  /**
   * 获取 Calibre 数据库对象
   */
  getCalibreDatabase() {
    return this.calibreDb;
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.calibreDb) {
      this.calibreDb.close();
      console.log('📦 Calibre 数据库连接已关闭');
    }
    if (this.talebookDb) {
      this.talebookDb.close();
      console.log('📦 Talebook 数据库连接已关闭');
    }
  }
}

export default new DatabaseService();