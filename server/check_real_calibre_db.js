import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const CALIBRE_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db';

console.log('=== 检查 Calibre 数据库 ===\n');

try {
  const db = new Database(CALIBRE_PATH, { readonly: true });
  
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log(`Calibre 书籍数量: ${bookCount.count}`);
  
  if (bookCount.count > 0) {
    const books = db.prepare('SELECT id, title, path FROM books LIMIT 5').all();
    console.log('\n示例书籍:');
    books.forEach(book => {
      console.log(`  ID: ${book.id}, 标题: ${book.title}, 路径: ${book.path}`);
    });
  }
  
  db.close();
} catch (error) {
  console.error('❌ 检查失败:', error.message);
  console.error(error.stack);
}