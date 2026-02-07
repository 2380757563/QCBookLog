import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: false });

console.log('🔍 测试添加书籍时的pubdate字段处理...');

// 模拟前端发送的数据
const bookData = {
  title: '测试书籍',
  author: '测试作者',
  publisher: '测试出版社',
  publishYear: 2024,
  isbn: '9787123456789',
  description: '这是一本测试书籍',
  pages: 300,
  binding1: 1,
  binding2: 0,
  book_type: 1,
  rating: 4.5,
  series: '测试丛书',
  language: 'zh',
  purchasePrice: 59.9,
  standardPrice: 69.9,
  purchaseDate: '2024-01-01',
  note: '测试备注',
  tags: ['测试', '书籍'],
  groups: [],
  path: '测试作者/测试书籍',
  hasCover: false
};

console.log('\n📥 模拟前端发送的数据:');
console.log('  publishYear:', bookData.publishYear, '类型:', typeof bookData.publishYear);

// 模拟后端处理逻辑
const pubdate = bookData.publishYear ? `${bookData.publishYear}-01-01` : new Date().toISOString();
console.log('  转换后的pubdate:', pubdate);

// 插入数据库
const result = db.prepare(`
  INSERT INTO books (title, author_sort, timestamp, pubdate, uuid, has_cover, path, last_modified)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  bookData.title,
  bookData.author || '',
  new Date().toISOString(),
  pubdate,
  '',
  bookData.hasCover ? 1 : 0,
  bookData.path,
  new Date().toISOString()
);

const newBookId = result.lastInsertRowid;
console.log('\n✅ 书籍插入成功，ID:', newBookId);

// 验证插入结果
const insertedBook = db.prepare('SELECT id, title, pubdate FROM books WHERE id = ?').get(newBookId);
console.log('\n📚 插入后的书籍数据:');
console.log(`  ID: ${insertedBook.id}`);
console.log(`  书名: ${insertedBook.title}`);
console.log(`  pubdate: ${insertedBook.pubdate}`);

// 从pubdate提取年份
if (insertedBook.pubdate) {
  const yearMatch = String(insertedBook.pubdate).match(/\d{4}/);
  if (yearMatch) {
    const extractedYear = parseInt(yearMatch[0], 10);
    console.log(`  提取的publishYear: ${extractedYear}`);
  }
}

// 清理测试数据
db.prepare('DELETE FROM books WHERE id = ?').run(newBookId);
console.log('\n🗑️ 测试数据已清理');

db.close();