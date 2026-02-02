const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('=== 验证迁移结果和数据准确性 ===\n');

// 1. 检查表结构
console.log('1. 检查新表结构:');
const columns = db.prepare('PRAGMA table_info(qc_daily_reading_stats)').all();
console.log('   字段列表:');
columns.forEach(col => {
  console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
});

// 2. 检查外键约束
console.log('\n2. 检查外键约束:');
const foreignKeys = db.prepare('PRAGMA foreign_key_list(qc_daily_reading_stats)').all();
console.log('   外键列表:');
foreignKeys.forEach(fk => {
  console.log(`   - ${fk.from} -> ${fk.table}.${fk.to} (ON DELETE ${fk.on_delete})`);
});

// 3. 检查索引
console.log('\n3. 检查索引:');
const indexes = db.prepare('PRAGMA index_list(qc_daily_reading_stats)').all();
console.log('   索引列表:');
indexes.forEach(idx => {
  console.log(`   - ${idx.name} ${idx.unique ? '(UNIQUE)' : ''}`);
});

// 4. 检查数据统计
console.log('\n4. 检查数据统计:');
const totalCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log(`   总记录数: ${totalCount.count}`);

const readerStats = db.prepare('SELECT reader_id, COUNT(*) as count FROM qc_daily_reading_stats GROUP BY reader_id').all();
console.log('   按读者统计:');
readerStats.forEach(stat => {
  console.log(`   - 读者ID ${stat.reader_id}: ${stat.count} 条记录`);
});

// 5. 检查时间精度
console.log('\n5. 检查时间精度:');
const sampleData = db.prepare('SELECT * FROM qc_daily_reading_stats LIMIT 3').all();
console.log('   前3条记录:');
sampleData.forEach((row, index) => {
  console.log(`   ${index + 1}.`, {
    id: row.id,
    reader_id: row.reader_id,
    book_id: row.book_id,
    session_start: row.session_start,
    session_end: row.session_end,
    duration_seconds: row.duration_seconds,
    pages_read: row.pages_read
  });
});

// 6. 测试汇总查询
console.log('\n6. 测试每日汇总查询:');
const summaryQuery = `
  SELECT
    DATE(session_start) as date,
    COUNT(DISTINCT book_id) as total_books,
    SUM(pages_read) as total_pages,
    SUM(duration_seconds) / 60 as total_time,
    COUNT(*) as session_count
  FROM qc_daily_reading_stats
  WHERE reader_id = ?
  GROUP BY DATE(session_start)
  ORDER BY date DESC
  LIMIT 5
`;
const summary = db.prepare(summaryQuery).all(0);
console.log('   读者ID=0 的每日汇总:');
summary.forEach((row, index) => {
  console.log(`   ${index + 1}.`, {
    date: row.date,
    total_books: row.total_books,
    total_pages: row.total_pages,
    total_time: Math.round(row.total_time * 100) / 100,
    session_count: row.session_count
  });
});

// 7. 对比 qc_reading_records 和 qc_daily_reading_stats 的数据
console.log('\n7. 对比数据一致性:');
const readingRecordsCount = db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
const dailyStatsCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log(`   qc_reading_records 记录数: ${readingRecordsCount.count}`);
console.log(`   qc_daily_reading_stats 记录数: ${dailyStatsCount.count}`);
console.log(`   数据一致性: ${readingRecordsCount.count === dailyStatsCount.count ? '✅ 一致' : '❌ 不一致'}`);

// 8. 检查时间精度是否提升到秒级
console.log('\n8. 检查时间精度:');
const hasSeconds = sampleData.some(row => {
  const startTime = row.session_start;
  return startTime.includes('.') || startTime.includes('T');
});
console.log(`   时间精度: ${hasSeconds ? '✅ 秒级精度' : '❌ 仅日期级精度'}`);

db.close();
console.log('\n=== 验证完成 ===');
