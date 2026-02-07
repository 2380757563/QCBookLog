import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查所有表');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('📊 所有表:');
tables.forEach(t => {
  console.log(`  - ${t.name}`);
});

console.log('\n🔍 检查阅读相关表');
const readingTables = ['qc_reading_records', 'qc_daily_reading_stats', 'reading_records', 'daily_reading_stats'];
readingTables.forEach(tableName => {
  const exists = tables.find(t => t.name === tableName);
  if (exists) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    console.log(`✅ ${tableName}: 存在，记录数: ${count.count}`);
  } else {
    console.log(`❌ ${tableName}: 不存在`);
  }
});

db.close();
console.log('\n✅ 检查完成');
