const Database = require('better-sqlite3');

const talebookDb = new Database('../data/calibre-webserver.db');

console.log('=== 测试活动服务查询 ===');

const startDate = '2026-01-01';
const endDate = '2026-01-31';

console.log('查询参数:', { startDate, endDate });

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
  WHERE 1=1 AND created_at >= '${startDate}' AND created_at <= '${endDate}'
  ORDER BY createdAt DESC
  LIMIT 100
`;

console.log('SQL 查询:', query);
const rows = talebookDb.prepare(query).all();
console.log('查询结果:', JSON.stringify(rows, null, 2));

talebookDb.close();
