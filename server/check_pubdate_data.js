import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: false });

console.log('🔍 检查书籍的pubdate字段数据...');

// 查看前10本书的pubdate数据
const books = db.prepare('SELECT id, title, pubdate FROM books LIMIT 10').all();
console.log('\n📚 前10本书的pubdate数据:');
books.forEach(book => {
  console.log(`  ID: ${book.id}, 书名: ${book.title}, pubdate: ${book.pubdate}`);
});

// 检查是否有null的pubdate
const nullPubdateBooks = db.prepare('SELECT id, title FROM books WHERE pubdate IS NULL').all();
console.log(`\n❌ pubdate为null的书籍数量: ${nullPubdateBooks.length}`);
if (nullPubdateBooks.length > 0) {
  console.log('  示例书籍:');
  nullPubdateBooks.slice(0, 5).forEach(book => {
    console.log(`    ID: ${book.id}, 书名: ${book.title}`);
  });
}

// 检查是否有空字符串的pubdate
const emptyPubdateBooks = db.prepare("SELECT id, title FROM books WHERE pubdate = ''").all();
console.log(`\n❌ pubdate为空字符串的书籍数量: ${emptyPubdateBooks.length}`);

// 检查是否有有效日期的pubdate
const validPubdateBooks = db.prepare("SELECT id, title, pubdate FROM books WHERE pubdate IS NOT NULL AND pubdate != ''").all();
console.log(`\n✅ pubdate有效的书籍数量: ${validPubdateBooks.length}`);
if (validPubdateBooks.length > 0) {
  console.log('  示例书籍:');
  validPubdateBooks.slice(0, 5).forEach(book => {
    console.log(`    ID: ${book.id}, 书名: ${book.title}, pubdate: ${book.pubdate}`);
  });
}

db.close();