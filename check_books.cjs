const Database = require('better-sqlite3');
const path = require('path');

const qcBooklogPath = path.join(__dirname, 'data', 'qc_booklog.db');
const calibrePath = path.join(__dirname, 'moni', 'book', 'metadata.db');

const qcDb = new Database(qcBooklogPath);
const calibreDb = new Database(calibrePath);

console.log('\n=== Calibre 书籍 ===');
const calibreBooks = calibreDb.prepare('SELECT id, title FROM books LIMIT 10').all();
calibreBooks.forEach(b => console.log(`  ID: ${b.id}, Title: ${b.title}`));

console.log('\n=== QCBookLog 书籍映射 (qc_book_mapping) ===');
const mappings = qcDb.prepare('SELECT * FROM qc_book_mapping').all();
mappings.forEach(m => console.log(`  ID: ${m.id}, calibre_book_id: ${m.calibre_book_id}, title: ${m.title}`));

console.log('\n=== QCBookLog 书籍数据 (qc_bookdata) ===');
const bookdata = qcDb.prepare('SELECT * FROM qc_bookdata').all();
bookdata.forEach(b => console.log(`  ID: ${b.id}, book_id: ${b.book_id}, mapping_id: ${b.mapping_id}`));

qcDb.close();
calibreDb.close();
