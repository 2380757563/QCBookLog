import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查 qc_reading_records 表的 created_at 字段');
const records = db.prepare('SELECT id, book_id, created_at, DATE(created_at) as date_only FROM qc_reading_records ORDER BY created_at DESC LIMIT 10').all();
console.log(`📊 共 ${records.length} 条记录`);
records.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  ID: ${r.id}`);
  console.log(`  书籍ID: ${r.book_id}`);
  console.log(`  created_at: ${r.created_at}`);
  console.log(`  DATE(created_at): ${r.date_only}`);
});

console.log('\n🔍 测试查询 2026-02-07 的记录');
const testQuery = `
  SELECT 
    'reading_record' as type,
    reader_id as readerId,
    book_id as bookId,
    NULL as bookTitle,
    NULL as bookAuthor,
    NULL as bookPublisher,
    NULL as bookCover,
    start_time as startTime,
    end_time as endTime,
    duration,
    start_page as startPage,
    end_page as endPage,
    pages_read as pagesRead,
    NULL as content,
    NULL as metadata,
    created_at as createdAt
  FROM qc_reading_records
  WHERE DATE(created_at) >= DATE('2026-02-07 00:00:00') AND DATE(created_at) <= DATE('2026-02-07 23:59:59')
`;
const testRecords = db.prepare(testQuery).all();
console.log(`📊 查询结果: ${testRecords.length} 条记录`);

db.close();
console.log('\n✅ 检查完成');
