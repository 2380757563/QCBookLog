import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_DB_PATH = path.join(__dirname, '../data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');
const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🧪 开始完整的数据库同步测试（包含 QCBookLog 数据）...\n');

try {
  const calibreDb = new Database(CALIBRE_DB_PATH);
  const talebookDb = new Database(TALEBOOK_DB_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);

  // 步骤 1: 获取测试书籍信息
  console.log('📋 步骤 1: 获取测试书籍信息');
  const testBook = calibreDb.prepare('SELECT id, title FROM books LIMIT 1').get();
  if (!testBook) {
    console.error('❌ 没有找到测试书籍');
    process.exit(1);
  }
  
  const bookId = testBook.id;
  console.log(`  ✅ 测试书籍: [${bookId}] ${testBook.title}`);

  // 步骤 2: 在 QCBookLog 数据库中添加书籍映射和扩展数据
  console.log('\n📋 步骤 2: 在 QCBookLog 数据库中添加书籍映射和扩展数据');
  
  // 添加书籍映射
  const insertMapping = qcBooklogDb.prepare(`
    INSERT OR REPLACE INTO qc_book_mapping (calibre_book_id, talebook_book_id)
    VALUES (?, ?)
  `);
  insertMapping.run(bookId, bookId);
  console.log(`  ✅ 书籍映射已添加: calibre_book_id=${bookId}, talebook_book_id=${bookId}`);

  // 添加测试用户（如果不存在）
  const insertUser = qcBooklogDb.prepare(`
    INSERT OR IGNORE INTO qc_users (id, username, display_name)
    VALUES (?, ?, ?)
  `);
  insertUser.run(1, 'test_user', '测试用户');
  console.log(`  ✅ 测试用户已添加: id=1`);

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
  
  const beforeCalibreCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const beforeTalebookItemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items WHERE book_id = ?').get(bookId).count;
  const beforeTalebookBookdataCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const beforeQcMappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId).count;
  const beforeQcBookdataCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const beforeQcBookmarksCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks WHERE book_id = ?').get(bookId).count;
  const beforeQcReadingRecordsCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_reading_records WHERE book_id = ?').get(bookId).count;

  console.log(`  Calibre books 表: ${beforeCalibreCount} 条记录`);
  console.log(`  Talebook items 表 (book_id=${bookId}): ${beforeTalebookItemsCount} 条记录`);
  console.log(`  Talebook qc_bookdata 表 (book_id=${bookId}): ${beforeTalebookBookdataCount} 条记录`);
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

  // 步骤 5: 检查删除后的数据库状态
  console.log('\n📋 步骤 5: 检查删除后的数据库状态');
  
  const afterCalibreCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const afterTalebookItemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items WHERE book_id = ?').get(bookId).count;
  const afterTalebookBookdataCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const afterQcMappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping WHERE calibre_book_id = ?').get(bookId).count;
  const afterQcBookdataCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(bookId).count;
  const afterQcBookmarksCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks WHERE book_id = ?').get(bookId).count;
  const afterQcReadingRecordsCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_reading_records WHERE book_id = ?').get(bookId).count;

  console.log(`  Calibre books 表: ${afterCalibreCount} 条记录 (删除前: ${beforeCalibreCount})`);
  console.log(`  Talebook items 表 (book_id=${bookId}): ${afterTalebookItemsCount} 条记录 (删除前: ${beforeTalebookItemsCount})`);
  console.log(`  Talebook qc_bookdata 表 (book_id=${bookId}): ${afterTalebookBookdataCount} 条记录 (删除前: ${beforeTalebookBookdataCount})`);
  console.log(`  QCBookLog qc_book_mapping 表 (book_id=${bookId}): ${afterQcMappingCount} 条记录 (删除前: ${beforeQcMappingCount})`);
  console.log(`  QCBookLog qc_bookdata 表 (book_id=${bookId}): ${afterQcBookdataCount} 条记录 (删除前: ${beforeQcBookdataCount})`);
  console.log(`  QCBookLog qc_bookmarks 表 (book_id=${bookId}): ${afterQcBookmarksCount} 条记录 (删除前: ${beforeQcBookmarksCount})`);
  console.log(`  QCBookLog qc_reading_records 表 (book_id=${bookId}): ${afterQcReadingRecordsCount} 条记录 (删除前: ${beforeQcReadingRecordsCount})`);

  // 步骤 6: 验证数据一致性
  console.log('\n📋 步骤 6: 验证数据一致性');
  
  let allConsistent = true;
  
  if (afterCalibreCount !== beforeCalibreCount - 1) {
    console.log(`  ❌ Calibre books 表: 期望 ${beforeCalibreCount - 1} 条，实际 ${afterCalibreCount} 条`);
    allConsistent = false;
  } else {
    console.log(`  ✅ Calibre books 表: 数据一致`);
  }

  if (afterTalebookItemsCount !== beforeTalebookItemsCount) {
    console.log(`  ⚠️ Talebook items 表: 书籍 ${bookId} 的记录未删除 (${afterTalebookItemsCount} 条)`);
    console.log(`  ℹ️ 这是正常的，因为 Talebook items 表不属于 QCBookLog 架构`);
  } else {
    console.log(`  ✅ Talebook items 表: 数据一致`);
  }

  if (afterTalebookBookdataCount !== beforeTalebookBookdataCount) {
    console.log(`  ⚠️ Talebook qc_bookdata 表: 书籍 ${bookId} 的记录未删除 (${afterTalebookBookdataCount} 条)`);
    console.log(`  ℹ️ 这是正常的，因为 Talebook qc_bookdata 表属于旧架构`);
  } else {
    console.log(`  ✅ Talebook qc_bookdata 表: 数据一致`);
  }

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
    console.log('✅ 完整的数据同步测试通过!');
    console.log('✅ QCBookLog 数据库正确处理了书籍删除操作');
    console.log('✅ 级联删除机制正常工作');
  } else {
    console.log('❌ 数据同步测试失败! 发现数据不一致');
  }
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ 测试过程中发生错误:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}