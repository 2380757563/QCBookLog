import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');
const calibreDbPath = path.join(__dirname, 'data/calibre/metadata.db');

console.log('🔍 检查数据库中的书籍数据...\n');

// 1. 检查 Calibre 数据库
console.log('📚 Calibre 数据库:');
try {
  const calibreDb = new Database(calibreDbPath, { readonly: true });
  const books = calibreDb.prepare('SELECT id, title FROM books ORDER BY id DESC LIMIT 10').all();
  console.log(`✅ 找到最近的 ${books.length} 本书籍:`);
  books.forEach(book => {
    console.log(`  - ID: ${book.id}, 标题: ${book.title}`);
  });
  calibreDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 2. 检查 Talebook 数据库的 items 表
console.log('\n📚 Talebook 数据库 - items 表:');
try {
  const talebookDb = new Database(talebookDbPath, { readonly: true });
  const items = talebookDb.prepare('SELECT book_id, book_type FROM items ORDER BY book_id DESC LIMIT 10').all();
  console.log(`✅ 找到最近的 ${items.length} 个 items 记录:`);
  items.forEach(item => {
    console.log(`  - Book ID: ${item.book_id}, Book Type: ${item.book_type} (0=电子书, 1=实体书)`);
  });
  talebookDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✅ 检查完成');