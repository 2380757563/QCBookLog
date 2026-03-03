import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_DB_PATH = path.join(__dirname, '../data/calibre/metadata.db');

console.log('📝 添加测试书籍到 Calibre 数据库...\n');

try {
  const calibreDb = new Database(CALIBRE_DB_PATH);

  // 使用事务并临时禁用触发器
  const addBook = calibreDb.transaction((title, uuid) => {
    // 临时删除插入触发器
    calibreDb.exec('DROP TRIGGER IF EXISTS books_insert_trg');
    
    // 添加书籍
    const insertBook = calibreDb.prepare(`
      INSERT INTO books (title, sort, timestamp, pubdate, uuid, has_cover, series_index, path, last_modified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertBook.run(
      title,
      title,
      new Date().toISOString(),
      null,
      uuid,
      0,
      0,
      'test-path',
      new Date().toISOString()
    );
    
    // 重新创建触发器
    calibreDb.exec(`
      CREATE TRIGGER books_insert_trg AFTER INSERT ON books
      BEGIN
          UPDATE books SET sort=title_sort(NEW.title),uuid=uuid4() WHERE id=NEW.id;
      END
    `);
    
    return result.lastInsertRowid;
  });

  const books = [
    { title: '测试书籍1', uuid: 'test-uuid-1' },
    { title: '测试书籍2', uuid: 'test-uuid-2' },
    { title: '测试书籍3', uuid: 'test-uuid-3' }
  ];

  books.forEach(book => {
    const bookId = addBook(book.title, book.uuid);
    console.log(`✅ 书籍已添加: [${bookId}] ${book.title}`);
  });

  calibreDb.close();
  console.log('\n✅ 测试书籍添加完成');

} catch (error) {
  console.error('❌ 添加测试书籍失败:', error.message);
  process.exit(1);
}