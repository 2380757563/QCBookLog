const Database = require('better-sqlite3');

console.log('=== 检查 calibre-webserver.db 数据库 ===');
const talebookDb = new Database('../data/calibre-webserver.db');

console.log('\n=== 数据库中的所有表 ===');
const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(JSON.stringify(tables, null, 2));

console.log('\n=== 检查 qc_reading_records 表 ===');
try {
  const count = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
  console.log('qc_reading_records 表中的记录数:', count.count);

  console.log('\n=== 查询1月17日的阅读记录 ===');
  const records = talebookDb.prepare("SELECT * FROM qc_reading_records WHERE created_at LIKE '%2025-01-17%' OR start_time LIKE '%2025-01-17%'").all();
  console.log('1月17日阅读记录:', JSON.stringify(records, null, 2));

  console.log('\n=== 查询最近10条阅读记录 ===');
  const recentRecords = talebookDb.prepare('SELECT * FROM qc_reading_records ORDER BY created_at DESC LIMIT 10').all();
  console.log('最近10条阅读记录:', JSON.stringify(recentRecords, null, 2));
} catch (e) {
  console.log('qc_reading_records 表不存在或查询失败:', e.message);
}

console.log('\n=== 检查 qc_bookmarks 表 ===');
try {
  const count = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks').get();
  console.log('qc_bookmarks 表中的记录数:', count.count);

  console.log('\n=== 查询1月17日的书摘 ===');
  const bookmarks = talebookDb.prepare("SELECT * FROM qc_bookmarks WHERE created_at LIKE '%2025-01-17%'").all();
  console.log('1月17日书摘:', JSON.stringify(bookmarks, null, 2));
} catch (e) {
  console.log('qc_bookmarks 表不存在或查询失败:', e.message);
}

talebookDb.close();
