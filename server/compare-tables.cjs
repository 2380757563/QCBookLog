const Database = require('better-sqlite3');
const db = new Database('data/calibre-webserver.db');

console.log('=== 对比 qc_daily_reading_stats 和 qc_reading_records 表 ===\n');

// 1. 检查 qc_reading_records 表结构
console.log('1. qc_reading_records 表结构:');
const readingRecordsColumns = db.prepare('PRAGMA table_info(qc_reading_records)').all();
console.log('   字段列表:');
readingRecordsColumns.forEach(col => {
  console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
});

// 2. 检查 qc_daily_reading_stats 表结构
console.log('\n2. qc_daily_reading_stats 表结构:');
const dailyStatsColumns = db.prepare('PRAGMA table_info(qc_daily_reading_stats)').all();
console.log('   字段列表:');
dailyStatsColumns.forEach(col => {
  console.log(`   - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
});

// 3. 检查 qc_reading_records 数据统计
console.log('\n3. qc_reading_records 数据统计:');
const readingRecordsCount = db.prepare('SELECT COUNT(*) as count FROM qc_reading_records').get();
console.log(`   总记录数: ${readingRecordsCount.count}`);

const readingRecordsSample = db.prepare('SELECT * FROM qc_reading_records LIMIT 3').all();
console.log('   前3条记录:');
readingRecordsSample.forEach((row, index) => {
  console.log(`   ${index + 1}.`, {
    id: row.id,
    reader_id: row.reader_id,
    book_id: row.book_id,
    start_time: row.start_time,
    end_time: row.end_time,
    duration: row.duration,
    start_page: row.start_page,
    end_page: row.end_page,
    pages_read: row.pages_read
  });
});

// 4. 检查 qc_daily_reading_stats 数据统计
console.log('\n4. qc_daily_reading_stats 数据统计:');
const dailyStatsCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
console.log(`   总记录数: ${dailyStatsCount.count}`);

const dailyStatsSample = db.prepare('SELECT * FROM qc_daily_reading_stats LIMIT 3').all();
console.log('   前3条记录:');
dailyStatsSample.forEach((row, index) => {
  console.log(`   ${index + 1}.`, {
    id: row.id,
    reader_id: row.reader_id,
    book_id: row.book_id,
    session_start: row.session_start,
    session_end: row.session_end,
    duration_seconds: row.duration_seconds,
    start_page: row.start_page,
    end_page: row.end_page,
    pages_read: row.pages_read
  });
});

// 5. 对比字段映射
console.log('\n5. 字段映射对比:');
console.log('   qc_reading_records -> qc_daily_reading_stats');
console.log('   - id -> id');
console.log('   - reader_id -> reader_id');
console.log('   - book_id -> book_id');
console.log('   - start_time -> session_start');
console.log('   - end_time -> session_end');
console.log('   - duration (分钟) -> duration_seconds (秒)');
console.log('   - start_page -> start_page');
console.log('   - end_page -> end_page');
console.log('   - pages_read -> pages_read');
console.log('   - created_at -> created_at');
console.log('   - updated_at -> updated_at');

// 6. 检查数据是否完全重复
console.log('\n6. 检查数据是否完全重复:');
const readingRecordsAll = db.prepare('SELECT * FROM qc_reading_records ORDER BY id').all();
const dailyStatsAll = db.prepare('SELECT * FROM qc_daily_reading_stats ORDER BY id').all();

console.log(`   qc_reading_records 记录数: ${readingRecordsAll.length}`);
console.log(`   qc_daily_reading_stats 记录数: ${dailyStatsAll.length}`);

if (readingRecordsAll.length === dailyStatsAll.length) {
  console.log('   记录数相同，检查内容是否一致...');

  let matchCount = 0;
  for (let i = 0; i < readingRecordsAll.length; i++) {
    const rr = readingRecordsAll[i];
    const ds = dailyStatsAll[i];

    // 对比关键字段
    const isMatch =
      rr.reader_id === ds.reader_id &&
      rr.book_id === ds.book_id &&
      rr.start_time === ds.session_start &&
      rr.end_time === ds.session_end &&
      rr.duration * 60 === ds.duration_seconds &&
      rr.start_page === ds.start_page &&
      rr.end_page === ds.end_page &&
      rr.pages_read === ds.pages_read;

    if (isMatch) {
      matchCount++;
    }
  }

  console.log(`   匹配记录数: ${matchCount} / ${readingRecordsAll.length}`);
  console.log(`   数据一致性: ${matchCount === readingRecordsAll.length ? '✅ 完全一致' : '❌ 存在差异'}`);
} else {
  console.log('   记录数不同，数据不完全重复');
}

// 7. 检查哪些表被引用
console.log('\n7. 检查表引用情况:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('   所有表:', tables.map(t => t.name));

// 检查哪些表引用了 qc_reading_records
const readingRecordsRefs = tables.filter(t => {
  const sql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t.name}'`).get();
  if (sql && sql.sql) {
    return sql.sql.includes('qc_reading_records');
  }
  return false;
});
console.log('   引用 qc_reading_records 的表:', readingRecordsRefs.length > 0 ? readingRecordsRefs.map(t => t.name) : '无');

// 检查哪些表引用了 qc_daily_reading_stats
const dailyStatsRefs = tables.filter(t => {
  const sql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t.name}'`).get();
  if (sql && sql.sql) {
    return sql.sql.includes('qc_daily_reading_stats');
  }
  return false;
});
console.log('   引用 qc_daily_reading_stats 的表:', dailyStatsRefs.length > 0 ? dailyStatsRefs.map(t => t.name) : '无');

db.close();
console.log('\n=== 对比完成 ===');
