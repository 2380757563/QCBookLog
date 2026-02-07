import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: true });

console.log('🔍 检查书籍的完整数据...');

// 获取书籍ID为80的完整数据
const bookId = 80;
const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
console.log('\n📚 书籍基本信息:');
console.log(`  ID: ${book.id}`);
console.log(`  书名: ${book.title}`);
console.log(`  pubdate: ${book.pubdate}`);

// 从pubdate提取年份
let publishYear = undefined;
if (book.pubdate) {
  const yearMatch = String(book.pubdate).match(/\d{4}/);
  if (yearMatch) {
    publishYear = parseInt(yearMatch[0], 10);
  }
}
console.log(`  提取的publishYear: ${publishYear}`);

// 获取书籍的作者
const authors = db.prepare(`
  SELECT a.name 
  FROM authors a
  JOIN books_authors_link bal ON a.id = bal.author
  WHERE bal.book = ?
`).all(bookId);
console.log(`  作者: ${authors.map(a => a.name).join(', ')}`);

// 获取书籍的出版社
const publishers = db.prepare(`
  SELECT p.name 
  FROM publishers p
  JOIN books_publishers_link bpl ON p.id = bpl.publisher
  WHERE bpl.book = ?
`).all(bookId);
console.log(`  出版社: ${publishers.map(p => p.name).join(', ')}`);

// 获取书籍的标签
const tags = db.prepare(`
  SELECT t.name 
  FROM tags t
  JOIN books_tags_link btl ON t.id = btl.tag
  WHERE btl.book = ?
`).all(bookId);
console.log(`  标签: ${tags.map(t => t.name).join(', ')}`);

// 获取书籍的描述
const comments = db.prepare('SELECT text FROM comments WHERE book = ?').get(bookId);
console.log(`  描述: ${comments ? comments.text.substring(0, 100) + '...' : '无'}`);

// 获取书籍的ISBN
const identifiers = db.prepare("SELECT val FROM identifiers WHERE book = ? AND type = 'isbn'").get(bookId);
console.log(`  ISBN: ${identifiers ? identifiers.val : '无'}`);

// 获取书籍的评分
const ratings = db.prepare(`
  SELECT r.rating 
  FROM ratings r
  JOIN books_ratings_link brl ON r.id = brl.rating
  WHERE brl.book = ?
`).all(bookId);
if (ratings.length > 0) {
  const ratingValue = ratings[0].rating / 2;
  console.log(`  评分: ${ratingValue}`);
}

db.close();