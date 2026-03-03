import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🔍 检查 QCBookLog 数据库表结构...\n');

try {
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);
  
  const tables = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📊 当前数据库中的表:');
  if (tables.length === 0) {
    console.log('  ⚠️ 数据库中没有表');
  } else {
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
  }

  qcBooklogDb.close();
  console.log('\n✅ 检查完成');

} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}