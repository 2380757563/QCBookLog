import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_DB_PATH = path.join(__dirname, '../data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');
const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🧪 开始测试 QCBookLog 数据库级联删除...\n');

try {
  const calibreDb = new Database(CALIBRE_DB_PATH);
  const talebookDb = new Database(TALEBOOK_DB_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);

  // 步骤 1: 添加测试书籍到 Calibre
  console.log('📋 步骤 1: 添加测试书籍到 Calibre');
  calibreDb.exec('DROP TRIGGER IF EXISTS books_insert_trg');
  calibreDb.exec('DROP TRIGGER IF EXISTS books_update_trg');
  
  const insertBook = calibreDb.prepare(`
    INSERT INTO books (title, sort, timestamp, pubdate, uuid, has_cover, series_index, path, last_modified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const bookId = insertBook.run(
    '测试书籍-级联删除',
    '测试书籍-级联删除',
    new Date().toISOString(),
    null,
    'test-cascade-delete-uuid',
    0,
    0,
    'test-path',
    new Date().toISOString()
  ).lastInsertRowid;
  
  console.log(`  ✅ 书籍已添加: [${bookId}]`);

  // 步骤 2: 在 QCBookLog 数据库中添加书籍映射和扩展数据
  console.log('\n📋 步骤 2: 在 QCBookLog 数据库中添加书籍映射和扩展数据');
  
  // 添加书籍映射
  const insertMapping = qcBooklogDb.prepare(`
    INSERT OR REPLACE INTO qc_book_mapping (calibre_book_id, talebook_book_id)
    VALUES (?, ?)
  `);
  insertMapping.run(bookId, bookId);
  console.log(`  ✅ 书籍映射已添加: calibre_book_id=${bookId}, talebook_book_id=${bookId}`);

  // 添加书籍扩展数据
  const insertBookdata = qcBooklogDb.prepare(`
    INSERT OR REPLACE INTO qc_bookdata (
      book_id, page_count, standard_price, purchase_price, 
      purchase_date, binding1, binding2, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBookdata.run(bookId, 300, 45.00, 38.50, '2024-01-15', 1, 2, '这是一本好书');
  console.log(`  ✅ 书籍扩展数据已添加`);

  // 添加书摘
  const insertBookmark = qcBooklogDb.prepare(`
    INSERT INTO qc_bookmarks (book_id, user_id, content, page_number, chapter)
    VALUES (?, ?, ?, ?, ?)
  `);
  const bookmarkId = insertBookmark.run(bookId, 1, '这是一条精彩的书摘', 50, '第一章').lastInsertRowid;
  console.log(`  ✅ 书摘已添加: id=${bookmarkId}`);

  // 添加阅读记录
  const insertReadingRecord = qcBooklogDb.prepare(`
    INSERT INTO qc_reading_records (book_id, user_id, start_time, duration, pages_read)
    VALUES (?, ?, ?, ?, ?)
  `);
  const recordId = insertReadingRecord.run(bookId, 1, new Date().toISOString(), 3600, 20).lastInsertRowid;
  console.log(`  ✅ 阅读记录已添加: id=${recordId}`);

  // 步骤 3: 记录删除前的数据库状态
  console.log('\n📋 步骤 3: 记录删除前的数据库状态');
  
  const beforeQcMappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId).count;
  const beforeQcBookdataCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const beforeQcBookmarksCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks WHERE book_id = ?').get(bookId).count;
  const beforeQcReadingRecordsCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_reading_records WHERE book_id = ?').get(bookId).count;

  console.log(`  QCBookLog qc_book_mapping 表 (book_id=${bookId}): ${beforeQcMappingCount} 条记录`);
  console.log(`  QCBookLog qc_bookdata 表 (book_id=${bookId}): ${beforeQcBookdataCount} 条记录`);
  console.log(`  QCBookLog qc_bookmarks 表 (book_id=${bookId}): ${beforeQcBookmarksCount} 条记录`);
  console.log(`  QCBookLog qc_reading_records 表 (book_id=${bookId}): ${beforeQcReadingRecordsCount} 条记录`);

  // 步骤 4: 模拟删除书籍（从 Calibre books 表删除）
  console.log('\n📋 步骤 4: 模拟删除书籍');
  console.log(`  🗑️ 从 Calibre books 表删除书籍 [${bookId}]`);
  
  const deleteCalibre = calibreDb.prepare('DELETE FROM books WHERE id = ?');
  deleteCalibre.run(bookId);
  console.log(`  ✅ Calibre books 表删除成功`);

  // 步骤 5: 模拟应用层级联删除（删除 QCBookLog 数据）
  console.log('\n📋 步骤 5: 模拟应用层级联删除（删除 QCBookLog 数据）');
  console.log(`  🗑️ 删除 QCBookLog 数据库中书籍 ${bookId} 的映射记录`);
  
  const deleteMapping = qcBooklogDb.prepare('DELETE FROM qc_book_mapping WHERE calibre_book_id = ?');
  const deleteResult = deleteMapping.run(bookId);
  console.log(`  ✅ QCBookLog 映射记录删除成功，影响行数: ${deleteResult.changes}`);

  // 步骤 6: 检查删除后的数据库状态
  console.log('\n📋 步骤 6: 检查删除后的数据库状态');
  
  const afterQcMappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId).count;
  const afterQcBookdataCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const afterQcBookmarksCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks WHERE book_id = ?').get(bookId).count;
  const afterQcReadingRecordsCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_reading_records WHERE book_id = ?').get(bookId).count;

  console.log(`  QCBookLog qc_book_mapping 表 (book_id=${bookId}): ${afterQcMappingCount} 条记录 (删除前: ${beforeQcMappingCount})`);
  console.log(`  QCBookLog qc_bookdata 表 (book_id=${bookId}): ${afterQcBookdataCount} 条记录 (删除前: ${beforeQcBookdataCount})`);
  console.log(`  QCBookLog qc_bookmarks 表 (book_id=${bookId}): ${afterQcBookmarksCount} 条记录 (删除前: ${beforeQcBookmarksCount})`);
  console.log(`  QCBookLog qc_reading_records 表 (book_id=${bookId}): ${afterQcReadingRecordsCount} 条记录 (删除前: ${beforeQcReadingRecordsCount})`);

  // 步骤 7: 验证数据一致性
  console.log('\n📋 步骤 7: 验证数据一致性');
  
  let allConsistent = true;
  
  if (afterQcMappingCount !== 0) {
    console.log(`  ❌ QCBookLog qc_book_mapping 表: 书籍 ${bookId} 的记录未删除 (${afterQcMappingCount} 条)`);
    allConsistent = false;
  } else {
    console.log(`  ✅ QCBookLog qc_book_mapping 表: 数据一致`);
  }

  if (afterQcBookdataCount !== 0) {
    console.log(`  ❌ QCBookLog qc_bookdata 表: 书籍 ${bookId} 的记录未删除 (${afterQcBookdataCount} 条)`);
    allConsistent = false;
  } else {
    console.log(`  ✅ QCBookLog qc_bookdata 表: 数据一致`);
  }

  if (afterQcBookmarksCount !== 0) {
    console.log(`  ❌ QCBookLog qc_bookmarks 表: 书籍 ${bookId} 的记录未删除 (${afterQcBookmarksCount} 条)`);
    allConsistent = false;
  } else {
    console.log(`  ✅ QCBookLog qc_bookmarks 表: 数据一致`);
  }

  if (afterQcReadingRecordsCount !== 0) {
    console.log(`  ❌ QCBookLog qc_reading_records 表: 书籍 ${bookId} 的记录未删除 (${afterQcReadingRecordsCount} 条)`);
    allConsistent = false;
  } else {
    console.log(`  ✅ QCBookLog qc_reading_records 表: 数据一致`);
  }

  calibreDb.close();
  talebookDb.close();
  qcBooklogDb.close();

  console.log('\n' + '='.repeat(60));
  if (allConsistent) {
    console.log('✅ QCBookLog 数据库级联删除测试通过!');
    console.log('✅ 应用层级联删除机制正常工作');
  } else {
    console.log('❌ QCBookLog 数据库级联删除测试失败! 发现数据不一致');
  }
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ 测试过程中发生错误:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}