const Database = require('better-sqlite3');

const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('测试阅读记录查询:');
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
WHERE DATE(created_at) >= DATE('2026-02-01') AND DATE(created_at) <= DATE('2026-02-02')
`;
const result = db.prepare(query).all();
console.log('查询结果:', result.length, '条');
result.forEach(r => console.log('  ', r.createdAt, r.bookId));
