import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_DB_PATH = path.join(__dirname, '../data/calibre/metadata.db');

console.log('📝 检查 Calibre books 表结构...\n');

try {
  const calibreDb = new Database(CALIBRE_DB_PATH);

  const tableInfo = calibreDb.prepare('PRAGMA table_info(books)').all();
  console.log('📊 books 表结构:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} (notnull=${col.notnull}, dflt_value=${col.dflt_value})`);
  });

  const triggers = calibreDb.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='books'").all();
  if (triggers.length > 0) {
    console.log('\n📊 books 表触发器:');
    triggers.forEach(trigger => {
      console.log(`  - ${trigger.name}:`);
      console.log(`    ${trigger.sql}`);
    });
  }

  calibreDb.close();
  console.log('\n✅ 检查完成');

} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}