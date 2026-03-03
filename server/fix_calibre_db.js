import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const CALIBRE_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';

console.log('=== 检查并修复 Calibre 数据库 ===\n');

try {
  const db = new Database(CALIBRE_PATH);
  
  console.log('1. 检查数据库完整性...');
  const integrity = db.prepare('PRAGMA integrity_check').get();
  console.log('   完整性检查:', integrity.integrity_check);
  
  console.log('\n2. 检查书籍数量...');
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log(`   书籍数量: ${bookCount.count}`);
  
  if (bookCount.count > 0) {
    console.log('\n3. 示例书籍:');
    const books = db.prepare('SELECT id, title, path FROM books LIMIT 5').all();
    books.forEach(book => {
      console.log(`   ID: ${book.id}, 标题: ${book.title}`);
    });
  }
  
  db.close();
  console.log('\n✅ 数据库检查完成');
} catch (error) {
  console.error('❌ 检查失败:', error.message);
  console.error(error.stack);
}