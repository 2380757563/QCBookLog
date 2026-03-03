const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

console.log('=== 检查 qc_bookmarks 表结构 ===\n');

const db = new Database(QCBOOKLOG_DB_PATH);

try {
  const columns = db.prepare('PRAGMA table_info(qc_bookmarks)').all();
  
  console.log('当前字段列表:\n');
  columns.forEach(col => {
    console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
  });
  
  const hasContent = columns.some(c => c.name === 'content');
  
  if (!hasContent) {
    console.log('\n⚠️ 缺少 content 字段，正在添加...\n');
    
    db.exec('ALTER TABLE qc_bookmarks ADD COLUMN content TEXT');
    
    console.log('✅ content 字段已添加\n');
    
    const newColumns = db.prepare('PRAGMA table_info(qc_bookmarks)').all();
    console.log('更新后字段列表:\n');
    newColumns.forEach(col => {
      console.log(`  ${col.name}: ${col.type}`);
    });
  } else {
    console.log('\n✅ content 字段已存在\n');
  }
  
} catch (error) {
  console.error('❌ 操作失败:', error.message);
} finally {
  db.close();
}
