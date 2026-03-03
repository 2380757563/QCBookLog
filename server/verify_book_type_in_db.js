import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');

console.log('🔍 验证数据库中的book_type数据...\n');

try {
  const talebookDb = new Database(talebookDbPath, { readonly: true });
  
  // 检查 items 表中的 book_type
  console.log('📚 items 表中的 book_type:');
  const items = talebookDb.prepare('SELECT book_id, book_type FROM items WHERE book_id = 56').all();
  if (items.length > 0) {
    items.forEach(item => {
      console.log(`  - Book ID: ${item.book_id}, Book Type: ${item.book_type} (0=电子书, 1=实体书)`);
    });
  } else {
    console.log('  ⚠️ 未找到书籍 ID 56');
  }
  
  // 检查 qc_bookdata 表中的 book_type
  console.log('\n📚 qc_bookdata 表中的 book_type:');
  const bookdata = talebookDb.prepare('SELECT book_id, book_type FROM qc_bookdata WHERE book_id = 56').all();
  if (bookdata.length > 0) {
    bookdata.forEach(item => {
      console.log(`  - Book ID: ${item.book_id}, Book Type: ${item.book_type} (0=电子书, 1=实体书)`);
    });
  } else {
    console.log('  ⚠️ 未找到书籍 ID 56');
  }
  
  talebookDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✅ 验证完成');