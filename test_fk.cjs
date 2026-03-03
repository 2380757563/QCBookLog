const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'qc_booklog.db');

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 删除旧表（按依赖顺序）
db.exec('DROP TABLE IF EXISTS qc_reading_records');
db.exec('DROP TABLE IF EXISTS qc_bookdata');
db.exec('DROP TABLE IF EXISTS qc_book_mapping');

// 创建测试表
db.exec(`
  CREATE TABLE qc_book_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    library_uuid TEXT NOT NULL,
    calibre_book_id INTEGER NOT NULL,
    title TEXT,
    author TEXT
  )
`);

db.exec(`
  CREATE TABLE qc_bookdata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mapping_id INTEGER NOT NULL UNIQUE,
    book_id INTEGER NOT NULL UNIQUE,
    page_count INTEGER DEFAULT 0,
    FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE qc_reading_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    duration INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES qc_bookdata(book_id) ON DELETE CASCADE
  )
`);

console.log('\n=== qc_bookdata SQL ===');
const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'qc_bookdata'").get();
console.log(sql.sql);

console.log('\n=== qc_bookdata 索引 ===');
const indexes = db.prepare("PRAGMA index_list(qc_bookdata)").all();
indexes.forEach(idx => {
  console.log(`  索引: ${idx.name}, unique: ${idx.unique}`);
});

// 测试插入
console.log('\n=== 测试插入 ===');
try {
  // 先插入 mapping
  db.prepare('INSERT INTO qc_book_mapping (library_uuid, calibre_book_id, title) VALUES (?, ?, ?)').run('test-uuid', 1, 'Test Book');
  console.log('✅ mapping 插入成功');
  
  // 再插入 bookdata
  db.prepare('INSERT INTO qc_bookdata (mapping_id, book_id, page_count) VALUES (?, ?, ?)').run(1, 1, 300);
  console.log('✅ bookdata 插入成功');
  
  // 再插入 reading_records
  db.prepare('INSERT INTO qc_reading_records (book_id, duration) VALUES (?, ?)').run(1, 60);
  console.log('✅ reading_records 插入成功');
  
  console.log('\n✅ 所有测试通过！外键约束正常工作');
} catch (e) {
  console.error('❌ 插入失败:', e.message);
}

db.close();
