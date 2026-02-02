const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('=== 分析当前 qc_daily_reading_stats 表结构和数据 ===\n');

// 检查表结构
console.log('1. 当前表结构:');
const columns = db.prepare('PRAGMA table_info(qc_daily_reading_stats)').all();
console.log(columns);

// 检查外键约束
console.log('\n2. 外键约束:');
const foreignKeys = db.prepare('PRAGMA foreign_key_list(qc_daily_reading_stats)').all();
console.log(foreignKeys);

// 检查索引
console.log('\n3. 索引:');
const indexes = db.prepare('PRAGMA index_list(qc_daily_reading_stats)').all();
console.log(indexes);

// 检查现有数据
console.log('\n4. 现有数据统计:');
const count = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log('   总记录数:', count.count);

const sampleData = db.prepare('SELECT * FROM qc_daily_reading_stats LIMIT 5').all();
console.log('   前5条记录:');
sampleData.forEach((row, index) => {
  console.log(`   ${index + 1}.`, row);
});

// 检查阅读记录表
console.log('\n5. qc_reading_records 表数据统计:');
const readingCount = db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
console.log('   总记录数:', readingCount.count);

const readingSample = db.prepare('SELECT * FROM qc_reading_records LIMIT 3').all();
console.log('   前3条记录:');
readingSample.forEach((row, index) => {
  console.log(`   ${index + 1}.`, row);
});

db.close();
console.log('\n=== 分析完成 ===');
