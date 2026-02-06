const Database = require('better-sqlite3');

const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('=== 测试书摘查询 ===');
const bookmarksQuery = `
SELECT 
  'bookmark_added' as type,
  0 as readerId,
  book_id as bookId,
  book_title as bookTitle,
  book_author as bookAuthor,
  NULL as bookPublisher,
  NULL as bookCover,
  NULL as startTime,
  NULL as endTime,
  NULL as duration,
  NULL as startPage,
  page_num as endPage,
  NULL as pagesRead,
  content,
  NULL as metadata,
  created_at as createdAt
FROM qc_bookmarks
WHERE DATE(created_at) >= DATE('2026-02-02') AND DATE(created_at) <= DATE('2026-02-02')
`;
const bookmarks = db.prepare(bookmarksQuery).all();
console.log('书摘查询结果:', bookmarks.length, '条');
bookmarks.forEach(b => console.log('  ', b.createdAt, b.bookTitle));

console.log('\n=== 测试阅读记录查询 ===');
const recordsQuery = `
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
WHERE DATE(created_at) >= DATE('2026-02-02') AND DATE(created_at) <= DATE('2026-02-02')
`;
const records = db.prepare(recordsQuery).all();
console.log('阅读记录查询结果:', records.length, '条');
records.forEach(r => console.log('  ', r.createdAt, r.bookId));

console.log('\n=== 测试日期格式 ===');
const dateTest = db.prepare("SELECT created_at, DATE(created_at) as date_only FROM qc_bookmarks LIMIT 2").all();
dateTest.forEach(r => console.log('  created_at:', r.created_at, '-> date_only:', r.date_only));
