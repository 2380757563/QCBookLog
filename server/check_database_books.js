import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const calibreDbPath = path.join(__dirname, 'data/calibre/metadata.db');
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');
const qcBooklogDbPath = path.join(__dirname, 'data/qc_booklog.db');

console.log('🔍 检查数据库中的书籍数据...\n');

// 1. 检查 Calibre 数据库
console.log('📚 Calibre 数据库:');
try {
  const calibreDb = new Database(calibreDbPath, { readonly: true });
  const books = calibreDb.prepare('SELECT id, title, author_sort FROM books LIMIT 5').all();
  console.log(`✅ 找到 ${books.length} 本书籍:`);
  books.forEach(book => {
    console.log(`  - ID: ${book.id}, 标题: ${book.title}, 作者: ${book.author_sort}`);
  });
  calibreDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 2. 检查 Talebook 数据库
console.log('\n📚 Talebook 数据库:');
try {
  const talebookDb = new Database(talebookDbPath, { readonly: true });
  
  // 检查 items 表是否存在
  const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items'").all();
  if (tables.length > 0) {
    const items = talebookDb.prepare('SELECT book_id, book_type FROM items LIMIT 5').all();
    console.log(`✅ 找到 ${items.length} 个 items 记录:`);
    items.forEach(item => {
      console.log(`  - Book ID: ${item.book_id}, Book Type: ${item.book_type} (0=电子书, 1=实体书)`);
    });
  } else {
    console.log('⚠️ items 表不存在');
  }
  talebookDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 3. 检查 QCBookLog 数据库
console.log('\n📚 QCBookLog 数据库:');
try {
  const qcBooklogDb = new Database(qcBooklogDbPath, { readonly: true });
  
  // 检查 qc_bookdata 表是否存在
  const tables = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_bookdata'").all();
  if (tables.length > 0) {
    // 检查 book_type 字段是否存在
    const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
    const hasBookType = schema.some(col => col.name === 'book_type');
    
    if (hasBookType) {
      const bookdata = qcBooklogDb.prepare(`
        SELECT bd.book_id, bd.book_type, b.title, b.author_sort
        FROM qc_bookdata bd
        JOIN books b ON bd.book_id = b.id
        LIMIT 5
      `).all();
      console.log(`✅ 找到 ${bookdata.length} 个 qc_bookdata 记录:`);
      bookdata.forEach(item => {
        console.log(`  - Book ID: ${item.book_id}, Book Type: ${item.book_type}, 标题: ${item.title}`);
      });
    } else {
      console.log('⚠️ qc_bookdata 表中没有 book_type 字段');
    }
  } else {
    console.log('⚠️ qc_bookdata 表不存在');
  }
  qcBooklogDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✅ 检查完成');