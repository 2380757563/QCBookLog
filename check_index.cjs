const Database = require('better-sqlite3');
const path = require('path');

const qcBooklogPath = path.join(__dirname, 'data', 'qc_booklog.db');
const qcDb = new Database(qcBooklogPath);

console.log('\n=== qc_bookdata 索引列表 ===');
const indexes = qcDb.prepare("PRAGMA index_list(qc_bookdata)").all();
indexes.forEach(idx => {
  console.log(`  索引: ${idx.name}, unique: ${idx.unique}`);
  const cols = qcDb.prepare(`PRAGMA index_info(${idx.name})`).all();
  cols.forEach(c => console.log(`    列: ${c.name}`));
});

console.log('\n=== qc_bookdata SQL ===');
const sql = qcDb.prepare("SELECT sql FROM sqlite_master WHERE name = 'qc_bookdata'").get();
console.log(sql.sql);

qcDb.close();
