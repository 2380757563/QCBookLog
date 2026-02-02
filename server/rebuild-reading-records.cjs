const Database = require('better-sqlite3');
const db = new Database('../data/calibre-webserver.db');

console.log('🔄 开始重建 qc_reading_records 表...');

try {
  // 备份数据
  const backup = db.prepare('SELECT * FROM qc_reading_records').all();
  console.log(`📦 备份了 ${backup.length} 条记录`);

  // 删除旧表
  db.prepare('DROP TABLE IF EXISTS qc_reading_records').run();
  console.log('✅ 旧表已删除');

  // 创建新表（不带外键约束）
  db.prepare(`
    CREATE TABLE qc_reading_records (
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
  console.log('✅ 新表已创建');

  // 创建索引
  db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_book_reader ON qc_reading_records(book_id, reader_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_date ON qc_reading_records(start_time)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_reading_reader_date ON qc_reading_records(reader_id, start_time)').run();
  console.log('✅ 索引已创建');

  // 恢复数据
  if (backup.length > 0) {
    const insert = db.prepare(`
      INSERT INTO qc_reading_records (
        id, book_id, reader_id, start_time, end_time,
        duration, start_page, end_page, pages_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    backup.forEach(record => {
      insert.run(
        record.id, record.book_id, record.reader_id,
        record.start_time, record.end_time,
        record.duration, record.start_page, record.end_page,
        record.pages_read, record.created_at
      );
    });
    console.log(`✅ 恢复了 ${backup.length} 条记录`);
  }

  console.log('✅ qc_reading_records 表重建完成');
} catch (error) {
  console.error('❌ 重建表失败:', error);
  throw error;
} finally {
  db.close();
}