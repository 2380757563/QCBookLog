import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 测试完整的 UNION ALL 查询');
const date = '2026-02-07';
const readerId = 0;
const readerFilter = readerId !== undefined ? `AND reader_id = ${readerId}` : '';

const query = `
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
    page as endPage,
    NULL as pagesRead,
    content,
    NULL as metadata,
    created_at as createdAt
  FROM qc_bookmarks
  WHERE DATE(created_at) = DATE('${date}')

  UNION ALL

  SELECT 
    'reading_state_changed' as type,
    reader_id as readerId,
    book_id as bookId,
    NULL as bookTitle,
    NULL as bookAuthor,
    NULL as bookPublisher,
    NULL as bookCover,
    NULL as startTime,
    NULL as endTime,
    NULL as duration,
    NULL as startPage,
    NULL as endPage,
    NULL as pagesRead,
    NULL as content,
    json_object('read_state', read_state, 'favorite', favorite, 'wants', wants) as metadata,
    read_date as createdAt
  FROM reading_state
  WHERE DATE(read_date) = DATE('${date}') ${readerFilter}

  UNION ALL

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

  UNION ALL

  SELECT 
    'reading_goal_set' as type,
    reader_id as readerId,
    NULL as bookId,
    NULL as bookTitle,
    NULL as bookAuthor,
    NULL as bookPublisher,
    NULL as bookCover,
    NULL as startTime,
    NULL as endTime,
    target as duration,
    NULL as startPage,
    completed as endPage,
    NULL as pagesRead,
    NULL as content,
    json_object('year', year, 'target', target, 'completed', completed) as metadata,
    created_at as createdAt
  FROM reading_goals
  WHERE DATE(created_at) = DATE('${date}') ${readerFilter}

  ORDER BY createdAt DESC
`;

try {
  const rows = db.prepare(query).all();
  console.log(`📊 查询结果: ${rows.length} 条记录`);
  rows.forEach((r, i) => {
    console.log(`\n记录 ${i + 1}:`);
    console.log(`  类型: ${r.type}`);
    console.log(`  书籍ID: ${r.bookId}`);
    console.log(`  创建时间: ${r.createdAt}`);
  });
} catch (error) {
  console.error('❌ 查询失败:', error.message);
  console.error('错误详情:', error);
}

db.close();
console.log('\n✅ 检查完成');
