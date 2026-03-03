const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'calibre', 'metadata.db');

console.log('📚 开始检查数据库中的路径字段...\n');

try {
  const db = new Database(DB_PATH, { readonly: true });

  const books = db.prepare(`
    SELECT id, title, path, (
      SELECT GROUP_CONCAT(a.name, ' & ')
      FROM authors a
      JOIN books_authors_link bal ON a.id = bal.author
      WHERE bal.book = b.id
    ) as author
    FROM books b
    WHERE path IS NOT NULL
  `).all();

  console.log(`📊 找到 ${books.length} 本书有路径信息\n`);

  for (const book of books) {
    console.log(`📖 书籍: ${book.title}`);
    console.log(`   ID: ${book.id}`);
    console.log(`   作者: ${book.author}`);
    console.log(`   路径: ${book.path}`);
    console.log(`   路径层级: ${book.path.split(/[\/\\]/).length}`);
    console.log('');
  }

  db.close();
  console.log('✅ 检查完成！');
} catch (error) {
  console.error('❌ 检查失败:', error);
}
