const Database = require('better-sqlite3');
const db = new Database('../data/calibre-webserver.db');

console.log('=== 查询阅读记录并关联书籍信息 ===');
const query = `
  SELECT 
    rr.*,
    b.title as book_title,
    b.author as book_author
  FROM qc_reading_records rr
  LEFT JOIN items i ON rr.book_id = i.book_id
  LEFT JOIN books b ON i.book_id = b.id
  ORDER BY rr.created_at DESC
  LIMIT 5
`;

const records = db.prepare(query).all();
console.log('阅读记录（包含书籍信息）:', JSON.stringify(records, null, 2));

db.close();
