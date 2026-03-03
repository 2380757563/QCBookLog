/**
 * 数据库结构修复脚本
 * 用于添加缺失的表和字段
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

function log(message, type = 'info') {
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    fix: '🔧'
  }[type] || '📋';
  console.log(`${prefix} ${message}`);
}

function checkTableExists(db, tableName) {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
}

function checkColumnExists(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(col => col.name === columnName);
}

function addDevicesTable(db) {
  log('检查 devices 表...', 'info');
  
  if (checkTableExists(db, 'devices')) {
    log('devices 表已存在', 'success');
    return true;
  }
  
  log('创建 devices 表...', 'fix');
  
  try {
    db.exec(`
      CREATE TABLE devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL DEFAULT 0,
        device_name VARCHAR(200) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'unknown',
        device_id VARCHAR(255),
        last_access DATETIME,
        user_agent TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_devices_reader_id ON devices(reader_id);
      CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
      CREATE INDEX IF NOT EXISTS idx_devices_last_access ON devices(last_access);
    `);
    
    log('devices 表创建成功', 'success');
    return true;
  } catch (error) {
    log(`创建 devices 表失败: ${error.message}`, 'error');
    return false;
  }
}

function addBookTypeToQcBookdata(db) {
  log('检查 qc_bookdata 表的 book_type 字段...', 'info');
  
  if (!checkTableExists(db, 'qc_bookdata')) {
    log('qc_bookdata 表不存在，将在初始化时创建', 'warning');
    return false;
  }
  
  if (checkColumnExists(db, 'qc_bookdata', 'book_type')) {
    log('book_type 字段已存在', 'success');
    return true;
  }
  
  log('添加 book_type 字段到 qc_bookdata 表...', 'fix');
  
  try {
    db.exec(`ALTER TABLE qc_bookdata ADD COLUMN book_type INTEGER NOT NULL DEFAULT 1`);
    log('book_type 字段添加成功 (默认值: 1 = 实体书)', 'success');
    return true;
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      log('book_type 字段已存在', 'success');
      return true;
    }
    log(`添加 book_type 字段失败: ${error.message}`, 'error');
    return false;
  }
}

function ensureTalebookTables(db) {
  log('确保 Talebook 数据库表结构完整...', 'info');
  
  const tables = [
    {
      name: 'readers',
      sql: `
        CREATE TABLE IF NOT EXISTS readers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(200) UNIQUE,
          password VARCHAR(200),
          salt VARCHAR(200),
          name VARCHAR(100),
          email VARCHAR(200),
          avatar VARCHAR(200),
          admin BOOLEAN DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          permission VARCHAR(100),
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          access_time DATETIME,
          extra TEXT,
          vipquota INTEGER DEFAULT 0,
          vipexpire DATETIME
        )
      `
    },
    {
      name: 'readerlogs',
      sql: `
        CREATE TABLE IF NOT EXISTS readerlogs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER,
          action INTEGER,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          extra TEXT,
          revision VARCHAR(100),
          operator_id INTEGER
        )
      `
    },
    {
      name: 'items',
      sql: `
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
      `
    },
    {
      name: 'reading_state',
      sql: `
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
      `
    },
    {
      name: 'reading_goals',
      sql: `
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
      `
    },
    {
      name: 'qc_bookdata',
      sql: `
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
          book_type INTEGER DEFAULT 1
        )
      `
    },
    {
      name: 'qc_bookmarks',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          book_title TEXT,
          book_author TEXT,
          content TEXT NOT NULL,
          note TEXT,
          page INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'qc_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'qc_book_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_book_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE,
          UNIQUE(book_id, group_id)
        )
      `
    }
  ];
  
  for (const table of tables) {
    if (!checkTableExists(db, table.name)) {
      log(`创建 ${table.name} 表...`, 'fix');
      try {
        db.exec(table.sql);
        log(`${table.name} 表创建成功`, 'success');
      } catch (error) {
        log(`创建 ${table.name} 表失败: ${error.message}`, 'error');
      }
    } else {
      log(`${table.name} 表已存在`, 'success');
    }
  }
  
  addDevicesTable(db);
  
  addBookTypeToQcBookdata(db);
  
  ensureItemsBookType(db);
}

function ensureItemsBookType(db) {
  log('检查 items 表的 book_type 字段...', 'info');
  
  if (!checkTableExists(db, 'items')) {
    return;
  }
  
  if (checkColumnExists(db, 'items', 'book_type')) {
    log('items.book_type 字段已存在', 'success');
    return;
  }
  
  log('添加 book_type 字段到 items 表...', 'fix');
  
  try {
    db.exec(`ALTER TABLE items ADD COLUMN book_type INTEGER NOT NULL DEFAULT 1`);
    log('items.book_type 字段添加成功', 'success');
  } catch (error) {
    if (!error.message.includes('duplicate column')) {
      log(`添加 items.book_type 字段失败: ${error.message}`, 'error');
    }
  }
}

function ensureQcbooklogTables(db) {
  log('确保 QCBookLog 数据库表结构完整...', 'info');
  
  const tables = [
    {
      name: 'qc_book_mapping',
      sql: `
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
        );

        CREATE INDEX IF NOT EXISTS idx_mapping_library ON qc_book_mapping(library_uuid);
        CREATE INDEX IF NOT EXISTS idx_mapping_calibre ON qc_book_mapping(calibre_book_id);
        CREATE INDEX IF NOT EXISTS idx_mapping_library_calibre ON qc_book_mapping(library_uuid, calibre_book_id);
      `
    },
    {
      name: 'qc_users',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT,
          avatar TEXT,
          admin INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON qc_users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON qc_users(email);
      `
    },
    {
      name: 'qc_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_groups_name ON qc_groups(name);
      `
    },
    {
      name: 'qc_tags',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_tags_name ON qc_tags(name);
      `
    },
    {
      name: 'qc_bookdata',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_bookdata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL UNIQUE,
          page_count INTEGER DEFAULT 0,
          standard_price REAL DEFAULT 0,
          purchase_price REAL DEFAULT 0,
          purchase_date DATE DEFAULT NULL,
          binding1 INTEGER DEFAULT 0,
          binding2 INTEGER DEFAULT 0,
          paper1 INTEGER DEFAULT 0,
          edge1 INTEGER DEFAULT 0,
          edge2 INTEGER DEFAULT 0,
          note TEXT DEFAULT '',
          total_reading_time INTEGER DEFAULT 0,
          read_pages INTEGER DEFAULT 0,
          reading_count INTEGER DEFAULT 0,
          last_read_date DATE DEFAULT NULL,
          last_read_duration INTEGER DEFAULT 0,
          book_type INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_bookdata_book_id ON qc_bookdata(book_id);
      `
    },
    {
      name: 'qc_bookmarks',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          book_title TEXT,
          book_author TEXT,
          content TEXT NOT NULL,
          note TEXT,
          page_number INTEGER,
          chapter TEXT,
          user_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON qc_bookmarks(book_id);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON qc_bookmarks(created_at);
      `
    },
    {
      name: 'qc_bookmark_tags',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_bookmark_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookmark_id INTEGER NOT NULL,
          tag_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bookmark_id) REFERENCES qc_bookmarks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmark_id ON qc_bookmark_tags(bookmark_id);
        CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag_id ON qc_bookmark_tags(tag_id);
      `
    },
    {
      name: 'qc_book_groups',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_book_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_book_groups_book_id ON qc_book_groups(book_id);
        CREATE INDEX IF NOT EXISTS idx_book_groups_group_id ON qc_book_groups(group_id);
      `
    },
    {
      name: 'qc_book_tags',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_book_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          tag_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_book_tags_book_id ON qc_book_tags(book_id);
        CREATE INDEX IF NOT EXISTS idx_book_tags_tag_name ON qc_book_tags(tag_name);
      `
    },
    {
      name: 'qc_reading_records',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_reading_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          reader_id INTEGER NOT NULL DEFAULT 0,
          start_time DATETIME NOT NULL,
          end_time DATETIME NOT NULL,
          duration INTEGER NOT NULL,
          start_page INTEGER NOT NULL DEFAULT 0,
          end_page INTEGER NOT NULL DEFAULT 0,
          pages_read INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE,
          FOREIGN KEY (reader_id) REFERENCES qc_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reading_book_reader ON qc_reading_records(book_id, reader_id);
        CREATE INDEX IF NOT EXISTS idx_reading_date ON qc_reading_records(start_time);
        CREATE INDEX IF NOT EXISTS idx_reading_reader_date ON qc_reading_records(reader_id, start_time);
      `
    },
    {
      name: 'qc_daily_reading_stats',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_daily_reading_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          date DATE NOT NULL,
          total_books INTEGER DEFAULT 0,
          total_pages INTEGER DEFAULT 0,
          total_time INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, date),
          FOREIGN KEY (reader_id) REFERENCES qc_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_daily_stats_reader_date ON qc_daily_reading_stats(reader_id, date);
      `
    },
    {
      name: 'qc_reading_goals',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_reading_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          year INTEGER NOT NULL,
          target INTEGER NOT NULL,
          completed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, year),
          FOREIGN KEY (reader_id) REFERENCES qc_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reading_goals_reader_year ON qc_reading_goals(reader_id, year);
      `
    },
    {
      name: 'qc_comments',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_comments_book_id ON qc_comments(book_id);
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON qc_comments(user_id);
      `
    },
    {
      name: 'qc_wishlist',
      sql: `
        CREATE TABLE IF NOT EXISTS qc_wishlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reader_id INTEGER NOT NULL DEFAULT 0,
          isbn TEXT NOT NULL,
          title TEXT,
          author TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reader_id, isbn)
        );

        CREATE INDEX IF NOT EXISTS idx_wishlist_reader_id ON qc_wishlist(reader_id);
        CREATE INDEX IF NOT EXISTS idx_wishlist_isbn ON qc_wishlist(isbn);
      `
    }
  ];
  
  for (const table of tables) {
    if (!checkTableExists(db, table.name)) {
      log(`创建 ${table.name} 表...`, 'fix');
      try {
        db.exec(table.sql);
        log(`${table.name} 表创建成功`, 'success');
      } catch (error) {
        log(`创建 ${table.name} 表失败: ${error.message}`, 'error');
      }
    } else {
      log(`${table.name} 表已存在`, 'success');
    }
  }
  
  addBookTypeToQcBookdata(db);
  
  ensureQcBookdataFields(db);
}

function ensureQcBookdataFields(db) {
  if (!checkTableExists(db, 'qc_bookdata')) {
    return;
  }
  
  const fieldsToAdd = [
    { name: 'book_type', sql: 'ALTER TABLE qc_bookdata ADD COLUMN book_type INTEGER DEFAULT 1' },
    { name: 'paper1', sql: 'ALTER TABLE qc_bookdata ADD COLUMN paper1 INTEGER DEFAULT 0' },
    { name: 'edge1', sql: 'ALTER TABLE qc_bookdata ADD COLUMN edge1 INTEGER DEFAULT 0' },
    { name: 'edge2', sql: 'ALTER TABLE qc_bookdata ADD COLUMN edge2 INTEGER DEFAULT 0' },
    { name: 'total_reading_time', sql: 'ALTER TABLE qc_bookdata ADD COLUMN total_reading_time INTEGER DEFAULT 0' },
    { name: 'read_pages', sql: 'ALTER TABLE qc_bookdata ADD COLUMN read_pages INTEGER DEFAULT 0' },
    { name: 'reading_count', sql: 'ALTER TABLE qc_bookdata ADD COLUMN reading_count INTEGER DEFAULT 0' },
    { name: 'last_read_date', sql: 'ALTER TABLE qc_bookdata ADD COLUMN last_read_date DATE DEFAULT NULL' },
    { name: 'last_read_duration', sql: 'ALTER TABLE qc_bookdata ADD COLUMN last_read_duration INTEGER DEFAULT 0' }
  ];
  
  for (const field of fieldsToAdd) {
    if (!checkColumnExists(db, 'qc_bookdata', field.name)) {
      log(`添加 qc_bookdata.${field.name} 字段...`, 'fix');
      try {
        db.exec(field.sql);
        log(`qc_bookdata.${field.name} 字段添加成功`, 'success');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          log(`添加 qc_bookdata.${field.name} 字段失败: ${error.message}`, 'error');
        }
      }
    }
  }
}

function repairTalebookDatabase() {
  log('\n=== 修复 Talebook 数据库 ===', 'info');
  
  if (!fs.existsSync(TALEBOOK_DB_PATH)) {
    log(`Talebook 数据库文件不存在: ${TALEBOOK_DB_PATH}`, 'error');
    return false;
  }
  
  const db = new Database(TALEBOOK_DB_PATH);
  
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF');
    
    ensureTalebookTables(db);
    
    log('Talebook 数据库修复完成', 'success');
    return true;
  } catch (error) {
    log(`修复 Talebook 数据库失败: ${error.message}`, 'error');
    return false;
  } finally {
    db.close();
  }
}

function repairQcbooklogDatabase() {
  log('\n=== 修复 QCBookLog 数据库 ===', 'info');
  
  const dbDir = path.dirname(QCBOOKLOG_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`创建数据库目录: ${dbDir}`, 'fix');
  }
  
  const db = new Database(QCBOOKLOG_DB_PATH);
  
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    ensureQcbooklogTables(db);
    
    log('QCBookLog 数据库修复完成', 'success');
    return true;
  } catch (error) {
    log(`修复 QCBookLog 数据库失败: ${error.message}`, 'error');
    return false;
  } finally {
    db.close();
  }
}

async function main() {
  log('开始数据库结构修复...', 'info');
  log(`项目根目录: ${projectRoot}`, 'info');
  
  const talebookResult = repairTalebookDatabase();
  const qcbooklogResult = repairQcbooklogDatabase();
  
  log('\n=== 修复结果 ===', 'info');
  log(`Talebook 数据库: ${talebookResult ? '成功 ✅' : '失败 ❌'}`, talebookResult ? 'success' : 'error');
  log(`QCBookLog 数据库: ${qcbooklogResult ? '成功 ✅' : '失败 ❌'}`, qcbooklogResult ? 'success' : 'error');
  
  return talebookResult && qcbooklogResult;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('执行失败:', error);
      process.exit(1);
    });
}

export { repairTalebookDatabase, repairQcbooklogDatabase, addDevicesTable, addBookTypeToQcBookdata };
export default main;
