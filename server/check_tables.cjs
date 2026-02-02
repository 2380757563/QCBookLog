const Database = require('better-sqlite3');
const db = new Database('../data/qc-booklog.db');

console.log('=== 数据库中的所有表 ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(JSON.stringify(tables, null, 2));

console.log('\n=== 检查是否有阅读记录相关的表 ===');
const readingTables = tables.filter(t => t.name.toLowerCase().includes('reading'));
console.log('阅读相关的表:', readingTables);

console.log('\n=== 检查 reading_records 表 ===');
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM reading_records').get();
  console.log('reading_records 表中的记录数:', count.count);
} catch (e) {
  console.log('reading_records 表不存在或查询失败:', e.message);
}

console.log('\n=== 检查 qc_reading_records 表 ===');
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
  console.log('qc_reading_records 表中的记录数:', count.count);
} catch (e) {
  console.log('qc_reading_records 表不存在或查询失败:', e.message);
}

console.log('\n=== 查看 reading_records 表结构（如果存在） ===');
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reading_records'").get();
  if (schema) {
    console.log('reading_records 表结构:', schema.sql);
  }
} catch (e) {
  console.log('查询表结构失败:', e.message);
}

db.close();
