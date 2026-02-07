import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: false });

console.log('🔍 测试更新书籍的pubdate字段...');

// 获取书籍ID为80的书籍
const bookId = 80;
const book = db.prepare('SELECT id, title, pubdate FROM books WHERE id = ?').get(bookId);
console.log('\n📚 更新前的书籍数据:');
console.log(`  ID: ${book.id}, 书名: ${book.title}, pubdate: ${book.pubdate}`);

// 模拟前端发送的数据
const publishYear = 2024;
console.log(`\n📝 要设置的出版年份: ${publishYear}`);

// 模拟后端处理逻辑：将年份转换为日期格式
const pubdate = publishYear ? `${publishYear}-01-01` : null;
console.log(`  转换后的pubdate: ${pubdate}`);

// 更新数据库
const result = db.prepare('UPDATE books SET pubdate = ? WHERE id = ?').run(pubdate, bookId);
console.log(`\n✅ 更新结果，影响行数: ${result.changes}`);

// 验证更新结果
const updatedBook = db.prepare('SELECT id, title, pubdate FROM books WHERE id = ?').get(bookId);
console.log('\n📚 更新后的书籍数据:');
console.log(`  ID: ${updatedBook.id}, 书名: ${updatedBook.title}, pubdate: ${updatedBook.pubdate}`);

// 测试从pubdate提取年份
if (updatedBook.pubdate) {
  const yearMatch = String(updatedBook.pubdate).match(/\d{4}/);
  if (yearMatch) {
    const extractedYear = parseInt(yearMatch[0], 10);
    console.log(`\n✅ 从pubdate提取的年份: ${extractedYear}`);
  }
}

db.close();