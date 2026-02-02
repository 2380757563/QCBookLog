import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('========================================');
console.log('数据库诊断工具');
console.log('========================================\n');

// 测试 Calibre 数据库
const calibreDbPath = path.join(__dirname, '../data/book/metadata.db');
console.log('📍 Calibre 数据库路径:', calibreDbPath);

try {
  const db = new Database(calibreDbPath);
  console.log('✅ Calibre 数据库连接成功\n');

  // 检查数据库中的所有表
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📋 数据库中的表:');
  tables.forEach(t => console.log(`   - ${t.name}`));

  // 检查 books 表
  const booksTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (booksTable) {
    console.log('\n✅ books 表存在');

    // 检查 books 表结构
    const columns = db.prepare("PRAGMA table_info(books)").all();
    console.log('📝 books 表结构:');
    columns.forEach(col => {
      console.log(`   - ${col.name}: ${col.type} (NOT NULL: ${!!col.notnull}, DEFAULT: ${col.dflt_value})`);
    });

    // 查询 books 表的记录数
    const count = db.prepare("SELECT COUNT(*) as count FROM books").get();
    console.log(`\n📊 books 表中有 ${count.count} 条记录`);

    // 查询前3本书籍
    if (count.count > 0) {
      const books = db.prepare("SELECT id, title, author_sort FROM books LIMIT 3").all();
      console.log('\n📚 前3本书籍:');
      books.forEach(book => {
        console.log(`   - ID: ${book.id}, 标题: ${book.title}`);
      });
    }
  } else {
    console.log('\n❌ books 表不存在');
  }

  db.close();
} catch (error) {
  console.error('\n❌ 数据库操作失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}

// 测试 Talebook 数据库
const talebookDbPath = path.join(__dirname, '../data/calibre-webserver.db');
console.log('\n========================================');
console.log('📍 Talebook 数据库路径:', talebookDbPath);

try {
  const db = new Database(talebookDbPath);
  console.log('✅ Talebook 数据库连接成功\n');

  // 检查数据库中的所有表
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📋 数据库中的表:');
  tables.forEach(t => console.log(`   - ${t.name}`));

  // 检查 qc_reading_records 表
  const readingRecordsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_reading_records'").get();
  if (readingRecordsTable) {
    console.log('\n✅ qc_reading_records 表存在');
    const count = db.prepare("SELECT COUNT(*) as count FROM qc_reading_records").get();
    console.log(`📊 qc_reading_records 表中有 ${count.count} 条记录`);
  } else {
    console.log('\n⚠️  qc_reading_records 表不存在');
  }

  // 检查 qc_bookdata 表
  const bookdataTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_bookdata'").get();
  if (bookdataTable) {
    console.log('✅ qc_bookdata 表存在');
    const count = db.prepare("SELECT COUNT(*) as count FROM qc_bookdata").get();
    console.log(`📊 qc_bookdata 表中有 ${count.count} 条记录`);
  } else {
    console.log('⚠️  qc_bookdata 表不存在');
  }

  db.close();
} catch (error) {
  console.error('\n❌ 数据库操作失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}

console.log('\n========================================');
console.log('诊断完成');
console.log('========================================');
