import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

try {
  console.log('🔄 正在更新 qc_bookdata 表的 book_type 字段默认值...');
  
  // SQLite 不支持直接修改列的默认值，需要重建表
  qcBooklogDb.exec(`
    BEGIN TRANSACTION;
    
    -- 创建新表，使用正确的默认值
    CREATE TABLE qc_bookdata_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id INTEGER,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      book_type INTEGER NOT NULL DEFAULT 1
    );
    
    -- 复制数据
    INSERT INTO qc_bookdata_new 
    SELECT id, mapping_id, book_id, page_count, standard_price, purchase_price, purchase_date,
           binding1, binding2, paper1, edge1, edge2, note, total_reading_time, read_pages,
           reading_count, last_read_date, last_read_duration, created_at, updated_at,
           CASE WHEN book_type IS NULL THEN 1 ELSE book_type END as book_type
    FROM qc_bookdata;
    
    -- 删除旧表
    DROP TABLE qc_bookdata;
    
    -- 重命名新表
    ALTER TABLE qc_bookdata_new RENAME TO qc_bookdata;
    
    COMMIT;
  `);
  
  console.log('✅ qc_bookdata 表的 book_type 字段默认值已更新为 1（实体书）');
  
  // 验证更新
  const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
  const bookTypeColumn = schema.find(col => col.name === 'book_type');
  console.log('✅ 验证 book_type 字段:');
  console.log('  - 默认值:', bookTypeColumn.dflt_value, '(1 = 实体书)');
  
} catch (error) {
  console.error('❌ 更新失败:', error.message);
  qcBooklogDb.exec('ROLLBACK');
} finally {
  qcBooklogDb.close();
}