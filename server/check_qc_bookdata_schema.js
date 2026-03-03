import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

console.log('=== QCBookLog qc_bookdata 表结构 ===');
const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
console.log(JSON.stringify(schema, null, 2));

qcBooklogDb.close();