import Database from 'better-sqlite3';

console.log('🔍 检查 QCBookLog 数据库表结构...\n');

const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');

// 检查 qc_bookmarks 表结构
console.log('📋 qc_bookmarks 表结构:');
try {
  const bookmarkColumns = qcBooklogDb.prepare('PRAGMA table_info(qc_bookmarks)').all();
  console.log(`  找到 ${bookmarkColumns.length} 个字段:`);
  bookmarkColumns.forEach(col => {
    console.log(`    - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
} catch (error) {
  console.error('  ❌ 检查失败:', error.message);
}

// 检查 qc_bookmark_tags 表结构
console.log('\n📋 qc_bookmark_tags 表结构:');
try {
  const tagColumns = qcBooklogDb.prepare('PRAGMA table_info(qc_bookmark_tags)').all();
  console.log(`  找到 ${tagColumns.length} 个字段:`);
  tagColumns.forEach(col => {
    console.log(`    - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
} catch (error) {
  console.error('  ❌ 检查失败:', error.message);
}

qcBooklogDb.close();

console.log('\n✅ 检查完成');