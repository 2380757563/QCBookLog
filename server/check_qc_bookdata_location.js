import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');
const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('📝 检查数据库表结构...\n');

try {
  const talebookDb = new Database(TALEBOOK_DB_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);

  // 检查 Talebook 数据库中的表
  console.log('📊 Talebook 数据库中的表:');
  const talebookTables = talebookDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  talebookTables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  // 检查 QCBookLog 数据库中的表
  console.log('\n📊 QCBookLog 数据库中的表:');
  const qcBooklogTables = qcBooklogDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  qcBooklogTables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  // 检查 Talebook 数据库中是否有 qc_bookdata 表
  console.log('\n📊 检查 Talebook qc_bookdata 表:');
  const talebookQcBookdataExists = talebookDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name = 'qc_bookdata'
  `).get();
  if (talebookQcBookdataExists) {
    console.log('  ✅ Talebook 数据库中有 qc_bookdata 表');
    const tableInfo = talebookDb.prepare('PRAGMA table_info(qc_bookdata)').all();
    console.log('  表结构:');
    tableInfo.forEach(col => {
      console.log(`    - ${col.name}: ${col.type}`);
    });
  } else {
    console.log('  ❌ Talebook 数据库中没有 qc_bookdata 表');
  }

  // 检查 QCBookLog 数据库中是否有 qc_bookdata 表
  console.log('\n📊 检查 QCBookLog qc_bookdata 表:');
  const qcBooklogQcBookdataExists = qcBooklogDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name = 'qc_bookdata'
  `).get();
  if (qcBooklogQcBookdataExists) {
    console.log('  ✅ QCBookLog 数据库中有 qc_bookdata 表');
    const tableInfo = qcBooklogDb.prepare('PRAGMA table_info(qc_bookdata)').all();
    console.log('  表结构:');
    tableInfo.forEach(col => {
      console.log(`    - ${col.name}: ${col.type}`);
    });
    
    // 检查是否有数据
    const count = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
    console.log(`  记录数: ${count.count}`);
  } else {
    console.log('  ❌ QCBookLog 数据库中没有 qc_bookdata 表');
  }

  talebookDb.close();
  qcBooklogDb.close();
  console.log('\n✅ 检查完成');

} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}