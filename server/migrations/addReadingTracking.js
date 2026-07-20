/**
 * 添加阅读追踪功能的数据库迁移
 * 创建阅读记录表和每日统计表，并在qc_bookdata表添加相关字段
 */

import databaseService from '../services/legacy/databaseService.js';

/**
 * 执行迁移
 */
export async function up() {
  console.log('🔄 开始迁移: 添加阅读追踪功能...');

  const db = databaseService.talebookDb;
  if (!db) {
    console.error('❌ 数据库未连接');
    return false;
  }

  try {
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

    console.log('🎉 阅读追踪功能迁移完成!');
    return true;

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

/**
 * 回滚迁移
 */
export async function down() {
  console.log('🔄 回滚迁移: 移除阅读追踪功能...');

  const db = databaseService.talebookDb;
  if (!db) {
    console.error('❌ 数据库未连接');
    return false;
  }

  try {
    // 删除表
    console.log('📝 删除阅读记录表...');
    db.exec('DROP TABLE IF EXISTS qc_reading_records;');
    console.log('  ✅ qc_reading_records 表已删除');

    console.log('📝 删除每日阅读统计表...');
    db.exec('DROP TABLE IF EXISTS qc_daily_reading_stats;');
    console.log('  ✅ qc_daily_reading_stats 表已删除');

    // SQLite 不支持 DROP COLUMN,需要重建表来删除字段
    // 这里只给出提示,不实际执行,因为风险较高
    console.log('⚠️ qc_bookdata 表字段未删除(SQLite限制,需要手动处理)');

    console.log('✅ 回滚完成!');
    return true;

  } catch (error) {
    console.error('❌ 回滚失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const action = args[0] || 'up';

  if (action === 'up') {
    up().then(success => {
      process.exit(success ? 0 : 1);
    });
  } else if (action === 'down') {
    down().then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.error('❌ 未知操作:', action);
    console.log('用法: node addReadingTracking.js [up|down]');
    process.exit(1);
  }
}

export default { up, down };
