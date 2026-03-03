import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
console.log('✅ qc_bookdata表结构:');
console.log(JSON.stringify(schema, null, 2));

qcBooklogDb.close();