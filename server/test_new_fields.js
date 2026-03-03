import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const talebookDbPath = path.join(__dirname, '../data/talebook/calibre-webserver.db');

console.log('📊 测试数据库新字段...\n');

try {
  const db = new Database(talebookDbPath, { readonly: true });

  console.log('🔍 检查 qc_bookdata 表结构...\n');
  
  const columns = db.prepare("PRAGMA table_info(qc_bookdata)").all();
  
  console.log('📋 qc_bookdata 表字段列表:');
  console.log('字段名\t\t数据类型\t\t默认值\t\t说明');
  console.log(''.padEnd(80, '-'));
  
  columns.forEach(col => {
    const name = col.name.padEnd(15);
    const type = col.type.padEnd(15);
    const dflt_value = col.dflt_value ? String(col.dflt_value).padEnd(15) : 'NULL'.padEnd(15);
    const notnull = col.notnull ? 'NOT NULL' : 'NULL';
    console.log(`${name}\t${type}\t${dflt_value}\t${notnull}`);
  });

  console.log('\n✅ 检查新字段是否存在:');
  
  const newFields = ['paper1', 'edge1', 'edge2'];
  newFields.forEach(field => {
    const exists = columns.some(col => col.name === field);
    console.log(`   ${field}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  });

  console.log('\n📊 检查现有数据中的新字段值:');
  const sampleData = db.prepare("SELECT book_id, paper1, edge1, edge2 FROM qc_bookdata LIMIT 5").all();
  
  if (sampleData.length > 0) {
    console.log('book_id\tpaper1\tedge1\tedge2');
    console.log(''.padEnd(40, '-'));
    sampleData.forEach(row => {
      console.log(`${row.book_id}\t${row.paper1}\t${row.edge1}\t${row.edge2}`);
    });
  } else {
    console.log('   ⚠️  qc_bookdata 表中暂无数据');
  }

  console.log('\n✅ 数据库测试完成！');
  
  db.close();
} catch (error) {
  console.error('❌ 数据库测试失败:', error.message);
  process.exit(1);
}