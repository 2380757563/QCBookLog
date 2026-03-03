const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'calibre', 'metadata.db');

console.log('📚 开始测试两级目录结构...\n');

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

  let twoLevelCount = 0;
  let threeLevelCount = 0;
  let otherLevelCount = 0;

  for (const book of books) {
    const pathParts = book.path.split(/[\/\\]/);
    const levelCount = pathParts.length;

    console.log(`📖 书籍: ${book.title}`);
    console.log(`   ID: ${book.id}`);
    console.log(`   作者: ${book.author}`);
    console.log(`   路径: ${book.path}`);
    console.log(`   路径层级: ${levelCount}`);

    if (levelCount === 2) {
      console.log(`   ✅ 两级目录结构（正确）`);
      twoLevelCount++;
    } else if (levelCount > 2) {
      console.log(`   ⚠️ 多级目录结构（需要修复）`);
      threeLevelCount++;
    } else {
      console.log(`   ❌ 其他层级结构`);
      otherLevelCount++;
    }
    console.log('');
  }

  console.log(`\n📊 统计结果:`);
  console.log(`   ✅ 两级目录: ${twoLevelCount} 本`);
  console.log(`   ⚠️ 多级目录: ${threeLevelCount} 本`);
  console.log(`   ❌ 其他层级: ${otherLevelCount} 本`);

  if (threeLevelCount > 0 || otherLevelCount > 0) {
    console.log(`\n⚠️ 发现 ${threeLevelCount + otherLevelCount} 本书需要修复路径结构`);
  } else {
    console.log(`\n✅ 所有书籍都使用正确的两级目录结构！`);
  }

  db.close();
} catch (error) {
  console.error('❌ 测试失败:', error);
}
