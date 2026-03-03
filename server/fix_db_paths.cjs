const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'calibre', 'metadata.db');

console.log('📚 开始修复数据库中的路径字段...\n');

try {
  const db = new Database(DB_PATH);

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
    console.log(`   原路径: ${book.path}`);

    const pathParts = book.path.split(/[\/\\]/);
    let newPath;

    if (pathParts.length >= 2) {
      const cleanAuthor = pathParts.slice(0, -1).join('').replace(/[\/\\]/g, '');
      const cleanTitle = pathParts[pathParts.length - 1].replace(/[\/\\]/g, '');
      newPath = `${cleanAuthor}/${cleanTitle}`;
    } else {
      newPath = book.path.replace(/[\/\\]/g, '');
    }

    console.log(`   新路径: ${newPath}`);

    try {
      db.prepare('UPDATE books SET path = ? WHERE id = ?').run(newPath, book.id);
      console.log(`   ✅ 更新成功\n`);
    } catch (e) {
      console.log(`   ❌ 更新失败: ${e.message}\n`);
    }
  }

  db.close();
  console.log('✅ 修复完成！');
} catch (error) {
  console.error('❌ 修复失败:', error);
}
