import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = process.env.QCBOOKLOG_DB_PATH || 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';

console.log('=== 添加 book_type 字段到 qc_bookdata 表（容器内版本） ===\n');

try {
  const db = new Database(QC_BOOKLOG_PATH);
  
  console.log('1. 检查 qc_bookdata 表结构...');
  const tableInfo = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  console.log('   当前列:', tableInfo.map(c => c.name).join(', '));
  
  const hasBookType = tableInfo.some(col => col.name === 'book_type');
  
  if (hasBookType) {
    console.log('✅ book_type 字段已存在，无需添加');
    db.close();
    process.exit(0);
  }
  
  console.log('2. 添加 book_type 字段...');
  db.exec(`
    ALTER TABLE qc_bookdata 
    ADD COLUMN book_type INTEGER NOT NULL DEFAULT 1
  `);
  
  console.log('✅ book_type 字段添加成功');
  
  console.log('\n3. 验证字段是否添加成功...');
  const newTableInfo = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const newHasBookType = newTableInfo.some(col => col.name === 'book_type');
  
  if (newHasBookType) {
    console.log('✅ 验证成功：book_type 字段已存在');
  } else {
    console.log('❌ 验证失败：book_type 字段未找到');
  }
  
  console.log('\n=== 迁移完成 ===');
  db.close();
  
} catch (error) {
  console.error('❌ 迁移失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}