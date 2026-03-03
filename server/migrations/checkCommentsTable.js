import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';
const qcBooklogDb = new Database(QC_BOOKLOG_PATH);

console.log('=== 检查 qc_comments 表结构 ===\n');

const commentsSchema = qcBooklogDb.prepare(`
  SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_comments'
`).get();

console.log('qc_comments 表结构:');
console.log(commentsSchema?.sql || '未找到');

console.log('\n=== 检查 qc_book_mapping 表结构 ===\n');

const mappingSchema = qcBooklogDb.prepare(`
  SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_book_mapping'
`).get();

console.log('qc_book_mapping 表结构:');
console.log(mappingSchema?.sql || '未找到');

console.log('\n=== 检查所有外键约束 ===\n');

const foreignKeys = qcBooklogDb.pragma('foreign_key_list(qc_comments)');
console.log('qc_comments 外键约束:');
console.log(JSON.stringify(foreignKeys, null, 2));

qcBooklogDb.close();
