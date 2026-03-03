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

console.log('=== 检查书籍的 last_modified 字段 ===\n');

const books = calibreDb.prepare(`
  SELECT id, title, timestamp, last_modified 
  FROM books 
  ORDER BY id DESC 
  LIMIT 10
`).all();

console.log('最近的书籍:');
books.forEach(b => {
  console.log(`ID=${b.id}, 标题="${b.title}", timestamp=${b.timestamp}, last_modified=${b.last_modified}`);
});

calibreDb.close();
