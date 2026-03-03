import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_DB_PATH = path.join(__dirname, '../data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');
const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🔍 检查数据库状态...\n');

try {
  const calibreDb = new Database(CALIBRE_DB_PATH);
  const talebookDb = new Database(TALEBOOK_DB_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);

  console.log('📊 Calibre 数据库状态:');
  const calibreBooksCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get().count;
  console.log(`  - 书籍数量: ${calibreBooksCount}`);
  
  const calibreBooks = calibreDb.prepare('SELECT id, title FROM books LIMIT 5').all();
  console.log('  - 前5本书籍:');
  calibreBooks.forEach(book => {
    console.log(`    [${book.id}] ${book.title}`);
  });

  console.log('\n📊 Talebook 数据库状态:');
  const talebookItemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get().count;
  console.log(`  - items 表数量: ${talebookItemsCount}`);
  
  const talebookBookdataCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
  console.log(`  - qc_bookdata 表数量: ${talebookBookdataCount}`);
  
  const talebookBookmarksCount = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks').get().count;
  console.log(`  - qc_bookmarks 表数量: ${talebookBookmarksCount}`);

  console.log('\n📊 QCBookLog 数据库状态:');
  const qcBooklogExists = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='qc_bookdata'").get();
  if (qcBooklogExists) {
    const qcBookdataCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
    console.log(`  - qc_bookdata 表数量: ${qcBookdataCount}`);
    
    const qcBookmarksCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookmarks').get().count;
    console.log(`  - qc_bookmarks 表数量: ${qcBookmarksCount}`);
    
    const qcMappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get().count;
    console.log(`  - qc_book_mapping 表数量: ${qcMappingCount}`);
  } else {
    console.log('  ⚠️ QCBookLog 数据库未初始化');
  }

  calibreDb.close();
  talebookDb.close();
  qcBooklogDb.close();

  console.log('\n✅ 数据库状态检查完成');

} catch (error) {
  console.error('❌ 检查数据库状态失败:', error.message);
  process.exit(1);
}