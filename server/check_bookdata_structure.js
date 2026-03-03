import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';

console.log('=== 检查 qc_bookdata 表结构 ===\n');

try {
  const db = new Database(QC_BOOKLOG_PATH);
  
  const tableInfo = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  console.log('qc_bookdata 表的列:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} (notnull: ${col.notnull}, dflt_value: ${col.dflt_value})`);
  });
  
  const hasBookType = tableInfo.some(col => col.name === 'book_type');
  console.log(`\nbook_type 字段是否存在: ${hasBookType ? '✅ 是' : '❌ 否'}`);
  
  if (hasBookType) {
    const bookDataCount = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
    console.log(`\nqc_bookdata 表中的记录数: ${bookDataCount.count}`);
    
    const sampleData = db.prepare('SELECT * FROM qc_bookdata LIMIT 3').all();
    console.log('\n示例数据:');
    sampleData.forEach(row => {
      console.log(`  ID: ${row.id}, mapping_id: ${row.mapping_id}, book_type: ${row.book_type}`);
    });
  }
  
  db.close();
} catch (error) {
  console.error('❌ 检查失败:', error.message);
  console.error(error.stack);
}