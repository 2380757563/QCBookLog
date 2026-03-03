import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');

console.log('🔍 检查 Talebook 数据库...\n');

try {
  const talebookDb = new Database(talebookDbPath, { readonly: true });
  
  // 检查 items 表结构
  console.log('📋 items 表结构:');
  const itemsSchema = talebookDb.prepare("PRAGMA table_info(items)").all();
  itemsSchema.forEach(col => {
    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  // 检查 items 表数据
  const itemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get();
  console.log(`\n📊 items 表中有 ${itemsCount.count} 条记录`);
  
  if (itemsCount.count > 0) {
    const items = talebookDb.prepare('SELECT * FROM items LIMIT 5').all();
    console.log('📋 items 表示例数据:');
    items.forEach(item => {
      console.log(`  - book_id: ${item.book_id}, book_type: ${item.book_type}`);
    });
  }
  
  talebookDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✅ 检查完成');