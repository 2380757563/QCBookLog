import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
let Database = null;

try {
  const module = require('better-sqlite3');
  Database = module.default || module;
} catch (error) {
  console.error('❌ better-sqlite3 未安装');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db';

const calibreDb = new Database(CALIBRE_PATH);

console.log('=== 检查 Calibre 数据库 ===\n');

const totalBooks = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
console.log('书籍总数:', totalBooks.count);

console.log('\n最近添加的5本书籍:');
const recentBooks = calibreDb.prepare(`
  SELECT b.id, b.title, b.timestamp, b.last_modified, i.val as isbn
  FROM books b
  LEFT JOIN identifiers i ON b.id = i.book AND i.type = 'isbn'
  ORDER BY b.id DESC
  LIMIT 5
`).all();

recentBooks.forEach(b => {
  console.log(`  ID=${b.id}, 标题="${b.title}", ISBN=${b.isbn || '无'}, last_modified=${b.last_modified}`);
});

calibreDb.close();
