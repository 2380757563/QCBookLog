import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: true });

console.log('📊 books表结构:');
const columns = db.prepare('PRAGMA table_info(books)').all();
columns.forEach(col => {
  console.log(`  ${col.name.padEnd(20)} ${col.type.padEnd(15)} PK: ${col.pk} NOTNULL: ${col.notnull}`);
});

console.log('\n📊 检查是否有pubdata字段:');
const hasPubdata = columns.some(col => col.name === 'pubdata');
console.log(`  pubdata字段存在: ${hasPubdata}`);

console.log('\n📊 检查是否有pubdate字段:');
const hasPubdate = columns.some(col => col.name === 'pubdate');
console.log(`  pubdate字段存在: ${hasPubdate}`);

console.log('\n📊 查看一条示例数据:');
const sampleBook = db.prepare('SELECT * FROM books LIMIT 1').get();
if (sampleBook) {
  console.log('  示例书籍:', sampleBook);
}

db.close();