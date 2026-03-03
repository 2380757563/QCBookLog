import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');
const bookId = 43;

const result = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(bookId);
console.log('✅ QCBookLog数据库查询结果 (Book ID: 43):');
console.log(JSON.stringify(result, null, 2));
console.log('Book Type:', result.book_type, '(1 = Physical Book, 0 = E-book)');

qcBooklogDb.close();