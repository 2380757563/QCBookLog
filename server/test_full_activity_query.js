import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 测试 getActivities 查询（不带日期过滤）');
const query1 = `
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
  WHERE 1=1
  ORDER BY createdAt DESC
  LIMIT 100
`;
const records1 = db.prepare(query1).all();
console.log(`📊 查询结果: ${records1.length} 条记录`);

console.log('\n🔍 测试 getActivities 查询（带日期过滤 2026-02-01 到 2026-02-28）');
const dateFilter = `AND DATE(created_at) >= DATE('2026-02-01') AND DATE(created_at) <= DATE('2026-02-28')`;
const query2 = `
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
  WHERE 1=1 ${dateFilter}
  ORDER BY createdAt DESC
  LIMIT 100
`;
const records2 = db.prepare(query2).all();
console.log(`📊 查询结果: ${records2.length} 条记录`);

console.log('\n🔍 测试完整的 UNION ALL 查询');
const fullQuery = `
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
  WHERE 1=1

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
  WHERE read_date IS NOT NULL AND DATE(read_date) >= DATE('2026-02-01') AND DATE(read_date) <= DATE('2026-02-28')

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
  WHERE 1=1 AND DATE(created_at) >= DATE('2026-02-01') AND DATE(created_at) <= DATE('2026-02-28')

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
  WHERE 1=1 AND DATE(created_at) >= DATE('2026-02-01') AND DATE(created_at) <= DATE('2026-02-28')

  ORDER BY createdAt DESC
  LIMIT 100
`;
const fullRecords = db.prepare(fullQuery).all();
console.log(`📊 完整查询结果: ${fullRecords.length} 条记录`);
fullRecords.forEach((r, i) => {
  console.log(`\n记录 ${i + 1}:`);
  console.log(`  类型: ${r.type}`);
  console.log(`  书籍ID: ${r.bookId}`);
  console.log(`  创建时间: ${r.createdAt}`);
});

db.close();
console.log('\n✅ 检查完成');
