import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查 qc_reading_records 表数据');
const records = db.prepare('SELECT * FROM qc_reading_records ORDER BY start_time DESC LIMIT 10').all();
console.log(`📊 共 ${records.length} 条记录`);
records.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  ID: ${r.id}`);
  console.log(`  书籍ID: ${r.book_id}`);
  console.log(`  读者ID: ${r.reader_id}`);
  console.log(`  开始时间: ${r.start_time}`);
  console.log(`  结束时间: ${r.end_time}`);
  console.log(`  时长: ${r.duration}秒`);
  console.log(`  开始页: ${r.start_page}`);
  console.log(`  结束页: ${r.end_page}`);
  console.log(`  阅读页数: ${r.pages_read}`);
});

console.log('\n🔍 检查 qc_daily_reading_stats 表数据');
const stats = db.prepare('SELECT * FROM qc_daily_reading_stats ORDER BY date DESC LIMIT 10').all();
console.log(`📊 共 ${stats.length} 条统计`);
stats.forEach((s, i) => {
  console.log(`\n统计 ${i + 1}:`);
  console.log(`  日期: ${s.date}`);
  console.log(`  读者ID: ${s.reader_id}`);
  console.log(`  书籍数: ${s.total_books}`);
  console.log(`  总页数: ${s.total_pages}`);
  console.log(`  总时长: ${s.total_time}秒`);
});

console.log('\n🔍 检查 qc_bookdata 表数据');
const bookData = db.prepare('SELECT * FROM qc_bookdata LIMIT 5').all();
console.log(`📊 共 ${bookData.length} 条书籍数据`);
bookData.forEach((b, i) => {
  console.log(`\n书籍 ${i + 1}:`);
  console.log(`  书籍ID: ${b.book_id}`);
  console.log(`  总阅读时长: ${b.total_reading_time}秒`);
  console.log(`  阅读页数: ${b.read_pages}`);
  console.log(`  阅读次数: ${b.reading_count}`);
  console.log(`  最后阅读日期: ${b.last_read_date}`);
  console.log(`  最后阅读时长: ${b.last_read_duration}秒`);
});

db.close();
console.log('\n✅ 检查完成');
