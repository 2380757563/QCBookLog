import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: true });

console.log('🔍 检查书籍ID 81的详细信息...');

const bookId = 81;
const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
console.log('\n📚 书籍基本信息:');
console.log(`  ID: ${book.id}`);
console.log(`  书名: ${book.title}`);
console.log(`  pubdate: ${book.pubdate}`);
console.log(`  timestamp: ${book.timestamp}`);
console.log(`  last_modified: ${book.last_modified}`);

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

// 获取书籍的ISBN
const identifiers = db.prepare("SELECT val FROM identifiers WHERE book = ? AND type = 'isbn'").get(bookId);
console.log(`  ISBN: ${identifiers ? identifiers.val : '无'}`);

// 获取书籍的描述
const comments = db.prepare('SELECT text FROM comments WHERE book = ?').get(bookId);
console.log(`  描述长度: ${comments ? comments.text.length : 0}`);

db.close();