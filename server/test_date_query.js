import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 测试 getActivitiesByDate 查询（使用 DATE() 函数）');
const date = '2026-02-07';
const readerId = 0;
const readerFilter = readerId !== undefined ? `AND reader_id = ${readerId}` : '';

const query = `
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
  WHERE DATE(created_at) = DATE('${date}') ${readerFilter}
`;

const rows = db.prepare(query).all();
console.log(`📊 查询结果: ${rows.length} 条记录`);
rows.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  类型: ${r.type}`);
  console.log(`  书籍ID: ${r.bookId}`);
  console.log(`  创建时间: ${r.createdAt}`);
  console.log(`  DATE(created_at): ${r.createdAt ? r.createdAt.split(' ')[0] : 'N/A'}`);
});

console.log('\n🔍 测试直接查询 qc_reading_records 表');
const allRecords = db.prepare('SELECT id, book_id, created_at, DATE(created_at) as date_only FROM qc_reading_records ORDER BY created_at DESC LIMIT 5').all();
console.log(`📊 共 ${allRecords.length} 条记录`);
allRecords.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  ID: ${r.id}`);
  console.log(`  书籍ID: ${r.book_id}`);
  console.log(`  created_at: ${r.created_at}`);
  console.log(`  DATE(created_at): ${r.date_only}`);
  console.log(`  是否匹配 2026-02-07: ${r.date_only === '2026-02-07'}`);
});

db.close();
console.log('\n✅ 检查完成');
