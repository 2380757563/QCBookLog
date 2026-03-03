import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';
const qcBooklogDb = new Database(QC_BOOKLOG_PATH);

console.log('=== 检查最近添加的映射 ===\n');

const recentMappings = qcBooklogDb.prepare(`
  SELECT * FROM qc_book_mapping ORDER BY id DESC LIMIT 5
`).all();

console.log('最近5条映射:');
recentMappings.forEach(m => {
  console.log(`  ID=${m.id}, book_id=${m.calibre_book_id}, 标题="${m.title}"`);
});

const book36Mapping = qcBooklogDb.prepare(`
  SELECT * FROM qc_book_mapping WHERE calibre_book_id = 36
`).get();

console.log('\nbook_id=36 的映射:', book36Mapping || '未找到');

qcBooklogDb.close();
