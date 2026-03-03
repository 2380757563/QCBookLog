import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

console.log('=== QCBookLog qc_book_mapping 表结构 ===');
const mappingSchema = qcBooklogDb.prepare("PRAGMA table_info(qc_book_mapping)").all();
console.log(JSON.stringify(mappingSchema, null, 2));

console.log('\n=== QCBookLog qc_book_mapping 表数据 ===');
const mappingData = qcBooklogDb.prepare('SELECT * FROM qc_book_mapping LIMIT 5').all();
console.log(JSON.stringify(mappingData, null, 2));

qcBooklogDb.close();