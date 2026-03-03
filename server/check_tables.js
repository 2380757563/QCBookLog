import Database from 'better-sqlite3';

console.log('🔍 检查数据库表结构...\n');

// 检查 Talebook 数据库
console.log('📋 Talebook 数据库 (calibre-webserver.db):');
try {
  const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
  const talebookTables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qc_%'").all();
  console.log(`  找到 ${talebookTables.length} 个 qc_ 表:`);
  talebookTables.forEach(t => console.log(`    - ${t.name}`));
  talebookDb.close();
} catch (error) {
  console.error('  ❌ 检查失败:', error.message);
}

// 检查 QCBookLog 数据库
console.log('\n📋 QCBookLog 数据库 (qc_booklog.db):');
try {
  const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
  const qcBooklogTables = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qc_%'").all();
  console.log(`  找到 ${qcBooklogTables.length} 个 qc_ 表:`);
  qcBooklogTables.forEach(t => console.log(`    - ${t.name}`));
  qcBooklogDb.close();
} catch (error) {
  console.error('  ❌ 检查失败:', error.message);
}

console.log('\n✅ 检查完成');