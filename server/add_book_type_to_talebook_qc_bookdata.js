import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');

console.log('🔍 添加 book_type 字段到 Talebook 数据库的 qc_bookdata 表...\n');

try {
  const talebookDb = new Database(talebookDbPath);
  
  // 检查字段是否已存在
  const schema = talebookDb.prepare("PRAGMA table_info(qc_bookdata)").all();
  const hasBookType = schema.some(col => col.name === 'book_type');
  
  if (hasBookType) {
    console.log('✅ book_type 字段已存在，跳过添加');
  } else {
    // 添加 book_type 字段
    talebookDb.prepare(`ALTER TABLE qc_bookdata ADD COLUMN book_type INTEGER NOT NULL DEFAULT 1`).run();
    console.log('✅ book_type 字段已添加，默认值为 1（实体书）');
  }
  
  // 验证字段
  const newSchema = talebookDb.prepare("PRAGMA table_info(qc_bookdata)").all();
  const bookTypeColumn = newSchema.find(col => col.name === 'book_type');
  console.log('✅ 验证 book_type 字段:');
  console.log('  - 存在:', !!bookTypeColumn);
  console.log('  - 默认值:', bookTypeColumn?.dflt_value, '(1 = 实体书)');
  
  talebookDb.close();
} catch (error) {
  console.error('❌ 添加字段失败:', error.message);
}

console.log('\n✅ 操作完成');