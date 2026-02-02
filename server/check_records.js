const Database = require('better-sqlite3');
const db = new Database('../data/qc-booklog.db');

console.log('=== 查询1月17日的阅读记录 ===');
const records = db.prepare("SELECT * FROM qc_reading_records WHERE created_at LIKE '%2025-01-17%' OR start_time LIKE '%2025-01-17%'").all();
console.log(JSON.stringify(records, null, 2));

console.log('\n=== 查询最近10条阅读记录 ===');
const recentRecords = db.prepare('SELECT * FROM qc_reading_records ORDER BY created_at DESC LIMIT 10').all();
console.log(JSON.stringify(recentRecords, null, 2));

console.log('\n=== 查询所有阅读记录 ===');
const allRecords = db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
console.log('总记录数:', allRecords.count);

db.close();
