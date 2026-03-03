const Database = require('better-sqlite3');
const path = require('path');

console.log('🔧 手动创建 qc_reading_state 表...\n');

const dbPath = path.join(__dirname, '../data/qc_booklog.db');
const db = new Database(dbPath);

try {
  // 检查表是否存在
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='qc_reading_state'
  `).get();

  if (tableExists) {
    console.log('⚠️ qc_reading_state 表已存在，先删除...');
    db.prepare('DROP TABLE IF EXISTS qc_reading_state').run();
    console.log('✅ 旧表已删除');
  }

  // 创建 qc_reading_state 表
  console.log('📝 创建 qc_reading_state 表...');
  db.exec(`
    CREATE TABLE qc_reading_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      reader_id INTEGER NOT NULL DEFAULT 0,
      read_state INTEGER NOT NULL DEFAULT 0,
      current_page INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      progress_percent INTEGER DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      favorite_date DATETIME,
      wants INTEGER NOT NULL DEFAULT 0,
      wants_date DATETIME,
      read_date DATETIME,
      start_date DATETIME,
      last_read_time DATETIME,
      total_reading_time INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      online_read INTEGER DEFAULT 0,
      download INTEGER DEFAULT 0,
      current_chapter INTEGER DEFAULT 0,
      notes TEXT,
      rating INTEGER DEFAULT 0,
      sync_status INTEGER DEFAULT 0,
      last_sync_time DATETIME,
      sync_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (book_id, reader_id)
    )
  `);
  console.log('✅ qc_reading_state 表创建成功');

  // 创建索引
  console.log('📝 创建索引...');
  db.exec(`
    CREATE INDEX idx_qc_reading_state_book_id ON qc_reading_state(book_id);
    CREATE INDEX idx_qc_reading_state_reader_id ON qc_reading_state(reader_id);
    CREATE INDEX idx_qc_reading_state_read_state ON qc_reading_state(read_state);
    CREATE INDEX idx_qc_reading_state_favorite ON qc_reading_state(favorite);
    CREATE INDEX idx_qc_reading_state_wants ON qc_reading_state(wants);
    CREATE INDEX idx_qc_reading_state_sync_status ON qc_reading_state(sync_status);
    CREATE INDEX idx_qc_reading_state_last_read ON qc_reading_state(last_read_time DESC);
  `);
  console.log('✅ 索引创建成功');

  // 验证表结构
  console.log('\n📊 验证表结构...');
  const columns = db.prepare('PRAGMA table_info(qc_reading_state)').all();
  console.log(`✅ 表包含 ${columns.length} 个字段:`);
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  console.log('\n✅ qc_reading_state 表创建完成！');
} catch (error) {
  console.error('❌ 创建表失败:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}