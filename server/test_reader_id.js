import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查 qc_reading_records 表中的 reader_id 值');
const records = db.prepare('SELECT id, book_id, reader_id, created_at FROM qc_reading_records ORDER BY created_at DESC').all();
console.log(`📊 共 ${records.length} 条记录`);
records.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  ID: ${r.id}`);
  console.log(`  书籍ID: ${r.book_id}`);
  console.log(`  读者ID: ${r.reader_id}`);
  console.log(`  创建时间: ${r.created_at}`);
});

console.log('\n🔍 测试带 readerId=0 的查询');
const queryWithReaderId = `
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
  WHERE DATE(created_at) = DATE('2026-02-07') AND reader_id = 0
`;
const rowsWithReaderId = db.prepare(queryWithReaderId).all();
console.log(`📊 查询结果: ${rowsWithReaderId.length} 条记录`);

console.log('\n🔍 测试不带 readerId 的查询');
const queryWithoutReaderId = `
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
  WHERE DATE(created_at) = DATE('2026-02-07')
`;
const rowsWithoutReaderId = db.prepare(queryWithoutReaderId).all();
console.log(`📊 查询结果: ${rowsWithoutReaderId.length} 条记录`);

db.close();
console.log('\n✅ 检查完成');
