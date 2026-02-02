const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('=== 阶段一：数据迁移 ===\n');

// 1. 备份 qc_reading_records 表数据
console.log('1. 备份 qc_reading_records 表数据...');
const readingRecords = db.prepare('SELECT * FROM qc_reading_records ORDER BY id').all();
console.log(`   备份了 ${readingRecords.length} 条记录`);

// 保存备份到 JSON 文件
const fs = require('fs');
const backupFile = 'data/qc_reading_records_backup.json';
fs.writeFileSync(backupFile, JSON.stringify(readingRecords, null, 2));
console.log(`   备份文件已保存: ${backupFile}`);

// 2. 将数据迁移到 qc_daily_reading_stats 表
console.log('\n2. 将数据迁移到 qc_daily_reading_stats 表...');

// 先清空 qc_daily_reading_stats 表
db.prepare('DELETE FROM qc_daily_reading_stats').run();
console.log('   清空 qc_daily_reading_stats 表');

// 插入数据
const insert = db.prepare(`
  INSERT INTO qc_daily_reading_stats (
    reader_id, book_id, session_start, session_end,
    duration_seconds, start_page, end_page, pages_read, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    // 转换 duration（分钟）为 duration_seconds（秒）
    const durationSeconds = row.duration * 60;
    insert.run(
      row.reader_id,
      row.book_id,
      row.start_time,
      row.end_time,
      durationSeconds,
      row.start_page,
      row.end_page,
      row.pages_read,
      row.created_at
    );
  }
});

insertMany(readingRecords);
console.log(`   迁移了 ${readingRecords.length} 条记录`);

// 3. 验证数据一致性
console.log('\n3. 验证数据一致性...');
const dailyStatsCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log(`   qc_daily_reading_stats 记录数: ${dailyStatsCount.count}`);
console.log(`   数据一致性: ${dailyStatsCount.count === readingRecords.length ? '✅ 一致' : '❌ 不一致'}`);

// 抽样检查
const sampleReadingRecords = readingRecords.slice(0, 3);
const sampleDailyStats = db.prepare('SELECT * FROM qc_daily_reading_stats ORDER BY id LIMIT 3').all();

console.log('\n   抽样检查（前3条）:');
sampleReadingRecords.forEach((rr, index) => {
  const ds = sampleDailyStats[index];
  const isMatch =
    rr.reader_id === ds.reader_id &&
    rr.book_id === ds.book_id &&
    rr.start_time === ds.session_start &&
    rr.end_time === ds.session_end &&
    rr.duration * 60 === ds.duration_seconds &&
    rr.start_page === ds.start_page &&
    rr.end_page === ds.end_page &&
    rr.pages_read === ds.pages_read;

  console.log(`   ${index + 1}. ${isMatch ? '✅' : '❌'}`, {
    reader_id: rr.reader_id,
    book_id: rr.book_id,
    duration: `${rr.duration}分钟 -> ${ds.duration_seconds}秒`,
    pages_read: rr.pages_read
  });
});

db.close();
console.log('\n=== 阶段一完成 ===');
