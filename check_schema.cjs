const Database = require('better-sqlite3');
const path = require('path');

const qcBooklogPath = path.join(__dirname, 'data', 'qc_booklog.db');
const qcDb = new Database(qcBooklogPath);

console.log('\n=== qc_bookdata 表结构 ===');
const columns = qcDb.prepare("PRAGMA table_info(qc_bookdata)").all();
columns.forEach(c => console.log(`  ${c.name}: ${c.type} ${c.pk ? 'PRIMARY KEY' : ''} ${c.unique ? 'UNIQUE' : ''}`));

console.log('\n=== qc_reading_records 表结构 ===');
const rrColumns = qcDb.prepare("PRAGMA table_info(qc_reading_records)").all();
rrColumns.forEach(c => console.log(`  ${c.name}: ${c.type} ${c.pk ? 'PRIMARY KEY' : ''} ${c.unique ? 'UNIQUE' : ''}`));

console.log('\n=== qc_reading_records 外键 ===');
const fk = qcDb.prepare("PRAGMA foreign_key_list(qc_reading_records)").all();
fk.forEach(f => console.log(`  ${f.from} -> ${f.table}.${f.to}`));

qcDb.close();
