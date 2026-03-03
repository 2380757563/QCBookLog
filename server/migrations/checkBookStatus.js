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
const QC_BOOKLOG_PATH = path.join(__dirname, '../../data/qc_booklog.db');

console.log('========================================');
console.log('🔍 检查 ISBN 9787020024751 的状态');
console.log('========================================\n');

const calibreDb = new Database(CALIBRE_PATH);
const qcBooklogDb = new Database(QC_BOOKLOG_PATH);

console.log('步骤 1: 检查 Calibre 数据库');
console.log('----------------------------------------');

const book = calibreDb.prepare(`
  SELECT b.id, b.title, b.timestamp, b.last_modified, b.path
  FROM books b
  LEFT JOIN identifiers i ON b.id = i.book AND i.type = 'isbn'
  WHERE i.val = '9787020024751'
`).get();

if (book) {
  console.log('✅ 在 Calibre 数据库中找到书籍:');
  console.log('  ID:', book.id);
  console.log('  标题:', book.title);
  console.log('  路径:', book.path);
  console.log('  last_modified:', book.last_modified);
} else {
  console.log('❌ 在 Calibre 数据库中未找到 ISBN 9787020024751');
}

console.log('\n步骤 2: 检查 QCBookLog 映射');
console.log('----------------------------------------');

const libraryUuid = calibreDb.prepare('SELECT uuid FROM library_id LIMIT 1').get();
console.log('当前 library_uuid:', libraryUuid?.uuid);

if (book) {
  const mapping = qcBooklogDb.prepare(`
    SELECT * FROM qc_book_mapping 
    WHERE library_uuid = ? AND calibre_book_id = ?
  `).get(libraryUuid?.uuid || '', book.id);
  
  if (mapping) {
    console.log('✅ 在 QCBookLog 中找到映射:');
    console.log('  mapping_id:', mapping.id);
    console.log('  calibre_book_id:', mapping.calibre_book_id);
    console.log('  标题:', mapping.title);
  } else {
    console.log('❌ 在 QCBookLog 中未找到映射');
  }
}

console.log('\n步骤 3: 检查所有数据库中的书籍总数');
console.log('----------------------------------------');
const calibreCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
const mappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
console.log('Calibre 书籍总数:', calibreCount.count);
console.log('QCBookLog 映射总数:', mappingCount.count);

calibreDb.close();
qcBooklogDb.close();
