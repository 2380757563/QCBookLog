import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const talebookDbPath = path.join(__dirname, '../data/talebook/calibre-webserver.db');

console.log('🔄 开始数据库迁移：添加纸张和刷边字段...\n');

try {
  const db = new Database(talebookDbPath);

  console.log('📊 检查 qc_bookdata 表结构...');
  
  const columns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const columnNames = new Set(columns.map(c => c.name));

  const newFields = [
    { name: 'paper1', sql: 'paper1 INTEGER DEFAULT 0' },
    { name: 'edge1', sql: 'edge1 INTEGER DEFAULT 0' },
    { name: 'edge2', sql: 'edge2 INTEGER DEFAULT 0' }
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const field of newFields) {
    if (!columnNames.has(field.name)) {
      try {
        db.prepare(`ALTER TABLE qc_bookdata ADD COLUMN ${field.sql}`).run();
        console.log(`✅ 添加 ${field.name} 列到 qc_bookdata 表`);
        addedCount++;
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`⚠️  ${field.name} 列已存在，跳过`);
          skippedCount++;
        } else {
          throw error;
        }
      }
    } else {
      console.log(`⚠️  ${field.name} 列已存在，跳过`);
      skippedCount++;
    }
  }

  console.log(`\n📊 迁移完成: 成功添加 ${addedCount} 个字段，跳过 ${skippedCount} 个已存在字段`);

  console.log('\n🔍 验证迁移结果...');
  const updatedColumns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  const updatedColumnNames = new Set(updatedColumns.map(c => c.name));
  
  console.log('\n✅ 新字段验证:');
  newFields.forEach(field => {
    const exists = updatedColumnNames.has(field.name);
    console.log(`   ${field.name}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  });

  console.log('\n🎉 数据库迁移成功完成！');
  
  db.close();
} catch (error) {
  console.error('❌ 数据库迁移失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}