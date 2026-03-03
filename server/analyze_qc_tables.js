import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== 分析模板数据库 ===');
const templateDb = new Database(path.join(__dirname, '../data/talebook/模板calibre-webserver (1).db'));
const templateTables = templateDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('模板数据库表列表:');
templateTables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n=== 分析当前数据库 ===');
const currentDb = new Database(path.join(__dirname, '../data/talebook/calibre-webserver.db'));
const currentTables = currentDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('当前数据库表列表:');
currentTables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n=== 识别QC自定义表 ===');
const templateTableNames = new Set(templateTables.map(t => t.name));
const qcTables = currentTables.filter(t => !templateTableNames.has(t.name));
console.log('QC自定义表:');
qcTables.forEach(t => console.log(`  - ${t.name}`));

console.log('\n=== 分析QC自定义表结构 ===');
qcTables.forEach(tableObj => {
  const tableName = tableObj.name;
  console.log(`\n表: ${tableName}`);
  const columns = currentDb.prepare(`PRAGMA table_info(${tableName})`).all();
  console.log('字段:');
  columns.forEach(col => {
    const pk = col.pk > 0 ? ' [PK]' : '';
    const nullable = col.notnull === 1 ? ' NOT NULL' : '';
    const dflt = col.dflt_value !== null ? ` DEFAULT ${col.dflt_value}` : '';
    console.log(`  - ${col.name}: ${col.type}${nullable}${dflt}${pk}`);
  });
  
  const foreignKeys = currentDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
  if (foreignKeys.length > 0) {
    console.log('外键:');
    foreignKeys.forEach(fk => {
      console.log(`  - ${fk.from} -> ${fk.table}.${fk.to}`);
    });
  }
});

templateDb.close();
currentDb.close();

console.log('\n=== 分析完成 ===');