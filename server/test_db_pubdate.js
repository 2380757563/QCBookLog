import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db');
console.log('📂 数据库路径:', dbPath);

const db = new Database(dbPath, { readonly: true });

console.log('\n🔍 查询最新添加的书籍（ID: 90）');
const book = db.prepare('SELECT * FROM books WHERE id = 90').get();
console.log('📚 书籍信息:');
console.log('  id:', book.id);
console.log('  title:', book.title);
console.log('  pubdate:', book.pubdate);
console.log('  pubdate类型:', typeof book.pubdate);
console.log('  timestamp:', book.timestamp);
console.log('  last_modified:', book.last_modified);

console.log('\n🔍 查询所有书籍的pubdate字段');
const allBooks = db.prepare('SELECT id, title, pubdate FROM books ORDER BY id DESC LIMIT 5').all();
console.log('📚 最近5本书的pubdate:');
allBooks.forEach(b => {
  console.log(`  ID: ${b.id}, 标题: ${b.title}, pubdate: ${b.pubdate}`);
});

console.log('\n🔍 检查books表结构');
const schema = db.prepare('PRAGMA table_info(books)').all();
console.log('📋 books表字段:');
schema.forEach(field => {
  console.log(`  ${field.name}: ${field.type} (notnull: ${field.notnull}, dflt_value: ${field.dflt_value})`);
});

db.close();
console.log('\n✅ 查询完成');
