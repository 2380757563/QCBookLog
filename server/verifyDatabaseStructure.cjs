const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

console.log('=== 数据库结构验证脚本 ===\n');
console.log('项目根目录:', projectRoot);
console.log('Talebook 数据库路径:', TALEBOOK_DB_PATH);
console.log('QCBookLog 数据库路径:', QCBOOKLOG_DB_PATH);
console.log('');

function checkDatabase(dbPath, dbName) {
  console.log(`\n=== 检查 ${dbName} 数据库 ===\n`);
  
  if (!fs.existsSync(dbPath)) {
    console.log(`❌ 数据库文件不存在: ${dbPath}`);
    return false;
  }
  
  const db = new Database(dbPath);
  
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`📊 数据库共有 ${tables.length} 个表:\n`);
    
    tables.forEach(table => {
      console.log(`  📁 ${table.name}`);
    });
    
    console.log('\n--- 检查关键表结构 ---\n');
    
    if (dbName === 'Talebook') {
      const devicesTable = tables.find(t => t.name === 'devices');
      if (devicesTable) {
        console.log('✅ devices 表存在');
        const columns = db.prepare('PRAGMA table_info(devices)').all();
        console.log('  字段列表:', columns.map(c => c.name).join(', '));
      } else {
        console.log('⚠️ devices 表不存在（将在初始化时创建）');
      }
      
      const itemsTable = tables.find(t => t.name === 'items');
      if (itemsTable) {
        console.log('✅ items 表存在');
        const columns = db.prepare('PRAGMA table_info(items)').all();
        const hasBookType = columns.some(c => c.name === 'book_type');
        console.log('  字段列表:', columns.map(c => c.name).join(', '));
        console.log(`  book_type 字段: ${hasBookType ? '✅ 存在' : '❌ 不存在'}`);
      }
      
      const qcBookdataTable = tables.find(t => t.name === 'qc_bookdata');
      if (qcBookdataTable) {
        console.log('✅ qc_bookdata 表存在');
        const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
        const hasBookType = columns.some(c => c.name === 'book_type');
        console.log('  字段列表:', columns.map(c => c.name).join(', '));
        console.log(`  book_type 字段: ${hasBookType ? '✅ 存在' : '❌ 不存在'}`);
      }
    }
    
    if (dbName === 'QCBookLog') {
      const qcBookdataTable = tables.find(t => t.name === 'qc_bookdata');
      if (qcBookdataTable) {
        console.log('✅ qc_bookdata 表存在');
        const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
        const hasBookType = columns.some(c => c.name === 'book_type');
        console.log('  字段列表:', columns.map(c => c.name).join(', '));
        console.log(`  book_type 字段: ${hasBookType ? '✅ 存在' : '❌ 不存在'}`);
      } else {
        console.log('⚠️ qc_bookdata 表不存在');
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ 检查数据库时出错: ${error.message}`);
    return false;
  } finally {
    db.close();
  }
}

checkDatabase(TALEBOOK_DB_PATH, 'Talebook');
checkDatabase(QCBOOKLOG_DB_PATH, 'QCBookLog');

console.log('\n=== 验证完成 ===\n');
