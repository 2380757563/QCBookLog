/**
 * 阅读追踪功能迁移执行脚本
 * 运行方式: node runReadingMigration.js
 */

import betterSqlite3 from 'better-sqlite3';
import path from 'path';

// 数据库路径
const DB_PATH = path.join(process.cwd(), '../data/calibre-webserver.db');

console.log('🔄 开始运行阅读追踪功能迁移...');
console.log(`📂 数据库路径: ${DB_PATH}`);

try {
  // 连接数据库
  const db = betterSqlite3(DB_PATH);

  // 1. 在 qc_bookdata 表中添加阅读相关字段
  console.log('📝 在 qc_bookdata 表中添加阅读相关字段...');

  // 使用 PRAGMA 检查列是否已存在
  const columns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const existingColumns = new Set(columns.map(col => col.name));

  const fieldsToAdd = [
    'total_reading_time INTEGER DEFAULT 0',
    'read_pages INTEGER DEFAULT 0',
    'reading_count INTEGER DEFAULT 0',
    'last_read_date DATE DEFAULT NULL',
    'last_read_duration INTEGER DEFAULT 0'
  ];

  for (const field of fieldsToAdd) {
    const fieldName = field.split(' ')[0];
    if (!existingColumns.has(fieldName)) {
      try {
        db.exec(`ALTER TABLE qc_bookdata ADD COLUMN ${field}`);
        console.log(`  ✅ 添加字段: ${fieldName}`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`  ⚠️ 字段 ${fieldName} 已存在,跳过`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`  ⚠️ 字段 ${fieldName} 已存在,跳过`);
    }
  }

  // 2. 创建阅读记录表
  console.log('📝 创建阅读记录表 (qc_reading_records)...');
  db.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reading_book_reader ON qc_reading_records(book_id, reader_id);
    CREATE INDEX IF NOT EXISTS idx_reading_date ON qc_reading_records(start_time);
    CREATE INDEX IF NOT EXISTS idx_reading_reader_date ON qc_reading_records(reader_id, start_time);
  `);
  console.log('  ✅ qc_reading_records 表创建成功');

  // 3. 创建每日阅读统计表
  console.log('📝 创建每日阅读统计表 (qc_daily_reading_stats)...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS qc_daily_reading_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reader_id INTEGER NOT NULL,
      date DATE NOT NULL,
      total_books INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      total_time INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reader_id, date),
      FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_reader_date ON qc_daily_reading_stats(reader_id, date);
  `);
  console.log('  ✅ qc_daily_reading_stats 表创建成功');

  // 关闭数据库连接
  db.close();

  console.log('');
  console.log('🎉 阅读追踪功能迁移完成!');
  console.log('');
  console.log('📋 已创建的表:');
  console.log('  - qc_reading_records (阅读记录表)');
  console.log('  - qc_daily_reading_stats (每日统计表)');
  console.log('');
  console.log('📋 已添加的字段到 qc_bookdata 表:');
  console.log('  - total_reading_time (总阅读时长)');
  console.log('  - read_pages (已读页数)');
  console.log('  - reading_count (阅读次数)');
  console.log('  - last_read_date (最近阅读日期)');
  console.log('  - last_read_duration (最近一次阅读时长)');
  console.log('');
  console.log('✅ 现在可以重启服务器以使用新功能!');

} catch (error) {
  console.error('');
  console.error('❌ 迁移失败:', error.message);
  console.error('');
  console.error('请检查:');
  console.error('1. 数据库文件路径是否正确');
  console.error('2. 数据库文件是否可读写');
  console.error('3. 是否有足够的磁盘空间');
  console.error('');
  process.exit(1);
}
