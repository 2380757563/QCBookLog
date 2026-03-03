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

console.log('=== 检查 ISBN 9787530220290 是否存在 ===\n');

const booksWithIsbn = calibreDb.prepare(`
  SELECT b.id, b.title, b.timestamp, b.last_modified, i.val as isbn
  FROM books b
  LEFT JOIN identifiers i ON b.id = i.book AND i.type = 'isbn'
  WHERE i.val = '9787530220290'
`).all();

console.log('ISBN 9787530220290 对应的书籍:');
booksWithIsbn.forEach(b => {
  console.log(`  ID=${b.id}, 标题="${b.title}"`);
});

console.log('\n所有书籍的 ISBN:');
const allIsbns = calibreDb.prepare(`
  SELECT b.id, b.title, i.val as isbn
  FROM books b
  LEFT JOIN identifiers i ON b.id = i.book AND i.type = 'isbn'
  WHERE i.val IS NOT NULL
  ORDER BY b.id DESC
  LIMIT 10
`).all();

allIsbns.forEach(b => {
  console.log(`  ID=${b.id}, 标题="${b.title}", ISBN=${b.isbn}`);
});

calibreDb.close();
