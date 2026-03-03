import Database from 'better-sqlite3';

const talebookDb = new Database('/app/data/talebook.db');

try {
  console.log('🔄 正在更新 items 表的 book_type 字段默认值...');
  
  // SQLite 不支持直接修改列的默认值，需要重建表
  talebookDb.exec(`
    BEGIN TRANSACTION;
    
    -- 创建新表，使用正确的默认值
    CREATE TABLE items_new (
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
    );
    
    -- 复制数据
    INSERT INTO items_new 
    SELECT book_id, count_guest, count_visit, count_download, website, collector_id, sole,
           CASE WHEN book_type IS NULL THEN 1 ELSE book_type END as book_type,
           book_count, create_time
    FROM items;
    
    -- 删除旧表
    DROP TABLE items;
    
    -- 重命名新表
    ALTER TABLE items_new RENAME TO items;
    
    COMMIT;
  `);
  
  console.log('✅ items 表的 book_type 字段默认值已更新为 1（实体书）');
  
  // 验证更新
  const schema = talebookDb.prepare("PRAGMA table_info(items)").all();
  const bookTypeColumn = schema.find(col => col.name === 'book_type');
  console.log('✅ 验证 book_type 字段:');
  console.log('  - 默认值:', bookTypeColumn.dflt_value, '(1 = 实体书)');
  
} catch (error) {
  console.error('❌ 更新失败:', error.message);
  talebookDb.exec('ROLLBACK');
} finally {
  talebookDb.close();
}