import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');

console.log('📝 检查 Talebook items 表结构...\n');

try {
  const talebookDb = new Database(TALEBOOK_DB_PATH);

  const tableInfo = talebookDb.prepare('PRAGMA table_info(items)').all();
  console.log('📊 items 表结构:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} (notnull=${col.notnull}, dflt_value=${col.dflt_value}, pk=${col.pk})`);
  });

  const itemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get();
  console.log(`\n📊 items 表记录数: ${itemsCount.count}`);

  if (itemsCount.count > 0) {
    const items = talebookDb.prepare('SELECT * FROM items LIMIT 5').all();
    console.log('\n📊 前5条 items 记录:');
    items.forEach(item => {
      console.log(`  - book_id: ${item.book_id}, book_type: ${item.book_type}`);
    });
  }

  talebookDb.close();
  console.log('\n✅ 检查完成');

} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}