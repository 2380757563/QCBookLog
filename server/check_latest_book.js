import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db');
console.log('📂 数据库路径:', dbPath);

const db = new Database(dbPath, { readonly: true });

console.log('\n🔍 查询所有书籍的ID和pubdate');
const allBooks = db.prepare('SELECT id, title, pubdate FROM books ORDER BY id DESC LIMIT 10').all();
console.log('📚 最近10本书的pubdate:');
allBooks.forEach(b => {
  console.log(`  ID: ${b.id}, 标题: ${b.title}, pubdate: ${b.pubdate}`);
});

if (allBooks.length > 0) {
  const latestBook = allBooks[0];
  console.log('\n🔍 查询最新书籍的详细信息（ID:', latestBook.id, ')');
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(latestBook.id);
  console.log('📚 书籍信息:');
  console.log('  id:', book.id);
  console.log('  title:', book.title);
  console.log('  pubdate:', book.pubdate);
  console.log('  pubdate类型:', typeof book.pubdate);
  console.log('  timestamp:', book.timestamp);
  console.log('  last_modified:', book.last_modified);
}

db.close();
console.log('\n✅ 查询完成');
