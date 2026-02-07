import Database from 'better-sqlite3';

const dbPath = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre\\metadata.db';
const db = new Database(dbPath, { readonly: true });

// 获取所有表名
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('📊 数据库中的所有表:');
tables.forEach(table => {
  console.log(`  - ${table.name}`);
});

// 检查每个表是否有pubdata字段
console.log('\n🔍 检查每个表是否有pubdata字段:');
tables.forEach(table => {
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  const hasPubdata = columns.some(col => col.name === 'pubdata');
  if (hasPubdata) {
    console.log(`  ✅ ${table.name} 表有 pubdata 字段`);
    columns.forEach(col => {
      console.log(`     ${col.name.padEnd(20)} ${col.type.padEnd(15)}`);
    });
  }
});

// 检查每个表是否有pubdate字段
console.log('\n🔍 检查每个表是否有pubdate字段:');
tables.forEach(table => {
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  const hasPubdate = columns.some(col => col.name === 'pubdate');
  if (hasPubdate) {
    console.log(`  ✅ ${table.name} 表有 pubdate 字段`);
  }
});

db.close();