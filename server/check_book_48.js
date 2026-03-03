import Database from 'better-sqlite3';

const talebookDb = new Database('/app/data/talebook.db');
const qcBooklogDb = new Database('/app/data/qc_booklog.db');

const bookId = 48;

console.log('=== Talebook 数据库 ===');
const talebookResult = talebookDb.prepare('SELECT * FROM items WHERE book_id = ?').get(bookId);
console.log('Talebook items 表:', JSON.stringify(talebookResult, null, 2));

console.log('\n=== QCBookLog 数据库 ===');
const qcBooklogResult = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(bookId);
console.log('QCBookLog qc_bookdata 表:', JSON.stringify(qcBooklogResult, null, 2));

talebookDb.close();
qcBooklogDb.close();