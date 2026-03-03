import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = process.env.QCBOOKLOG_DB_PATH || 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';

console.log('=== 重建 qc_bookdata 表（设置正确的默认值） ===\n');

try {
  const db = new Database(QC_BOOKLOG_PATH);
  
  console.log('1. 备份现有数据...');
  const backupData = db.prepare('SELECT * FROM qc_bookdata').all();
  console.log(`   备份了 ${backupData.length} 条记录`);
  
  console.log('\n2. 删除旧表...');
  db.exec('DROP TABLE IF EXISTS qc_bookdata');
  
  console.log('3. 创建新表（book_type 默认值为 0）...');
  db.exec(`
    CREATE TABLE qc_bookdata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id INTEGER NOT NULL UNIQUE,
      book_id INTEGER NOT NULL,
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
      total_reading_time INTEGER DEFAULT 0,
      read_pages INTEGER DEFAULT 0,
      reading_count INTEGER DEFAULT 0,
      last_read_date TEXT,
      last_read_duration INTEGER DEFAULT 0,
      book_type INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
    )
  `);
  
  console.log('4. 恢复数据...');
  const insertStmt = db.prepare(`
    INSERT INTO qc_bookdata (
      id, mapping_id, book_id, page_count, standard_price, purchase_price, purchase_date,
      binding1, binding2, paper1, edge1, edge2, note,
      total_reading_time, read_pages, reading_count, last_read_date, last_read_duration,
      book_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let restoredCount = 0;
  for (const row of backupData) {
    try {
      insertStmt.run(
        row.id, row.mapping_id, row.book_id, row.page_count, row.standard_price, 
        row.purchase_price, row.purchase_date, row.binding1, row.binding2, 
        row.paper1, row.edge1, row.edge2, row.note, row.total_reading_time,
        row.read_pages, row.reading_count, row.last_read_date, row.last_read_duration,
        row.book_type || 0, row.created_at, row.updated_at
      );
      restoredCount++;
    } catch (error) {
      console.warn(`   恢复记录 ID=${row.id} 失败:`, error.message);
    }
  }
  
  console.log(`   恢复了 ${restoredCount} 条记录`);
  
  console.log('\n5. 验证表结构...');
  const tableInfo = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const bookTypeColumn = tableInfo.find(col => col.name === 'book_type');
  
  if (bookTypeColumn && bookTypeColumn.dflt_value === '0') {
    console.log('✅ book_type 默认值已设置为 0');
  } else {
    console.log('❌ book_type 默认值设置失败');
  }
  
  console.log('\n=== 迁移完成 ===');
  db.close();
  
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}