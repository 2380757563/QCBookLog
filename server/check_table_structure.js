import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const talebookDbPath = path.join(__dirname, 'data/talebook/calibre-webserver.db');
const qcBooklogDbPath = path.join(__dirname, 'data/qc_booklog.db');

console.log('🔍 检查数据库表结构...\n');

// 1. 检查 Talebook 数据库
console.log('📚 Talebook 数据库表结构:');
try {
  const talebookDb = new Database(talebookDbPath, { readonly: true });
  
  // 获取所有表
  const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`✅ 找到 ${tables.length} 个表:`);
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });
  
  // 检查 qc_bookdata 表
  const hasQcBookdata = tables.some(t => t.name === 'qc_bookdata');
  console.log(`\n📋 qc_bookdata 表是否存在: ${hasQcBookdata ? '是' : '否'}`);
  
  if (hasQcBookdata) {
    const schema = talebookDb.prepare("PRAGMA table_info(qc_bookdata)").all();
    console.log('📋 qc_bookdata 表结构:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 检查数据
    const count = talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
    console.log(`\n📊 qc_bookdata 表中有 ${count.count} 条记录`);
    
    if (count.count > 0) {
      const sample = talebookDb.prepare('SELECT * FROM qc_bookdata LIMIT 3').all();
      console.log('📋 qc_bookdata 表示例数据:');
      sample.forEach(row => {
        console.log(`  - book_id: ${row.book_id}, book_type: ${row.book_type}`);
      });
    }
  }
  
  talebookDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

// 2. 检查 QCBookLog 数据库
console.log('\n📚 QCBookLog 数据库表结构:');
try {
  const qcBooklogDb = new Database(qcBooklogDbPath, { readonly: true });
  
  // 获取所有表
  const tables = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`✅ 找到 ${tables.length} 个表:`);
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });
  
  // 检查 qc_bookdata 表
  const hasQcBookdata = tables.some(t => t.name === 'qc_bookdata');
  console.log(`\n📋 qc_bookdata 表是否存在: ${hasQcBookdata ? '是' : '否'}`);
  
  if (hasQcBookdata) {
    const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
    console.log('📋 qc_bookdata 表结构:');
    schema.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 检查数据
    const count = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
    console.log(`\n📊 qc_bookdata 表中有 ${count.count} 条记录`);
    
    if (count.count > 0) {
      const sample = qcBooklogDb.prepare('SELECT * FROM qc_bookdata LIMIT 3').all();
      console.log('📋 qc_bookdata 表示例数据:');
      sample.forEach(row => {
        console.log(`  - book_id: ${row.book_id}, book_type: ${row.book_type}`);
      });
    }
  }
  
  qcBooklogDb.close();
} catch (error) {
  console.log('❌ 错误:', error.message);
}

console.log('\n✅ 检查完成');