import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

const count = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get();
console.log('✅ qc_bookdata 表中的记录数:', count.count);

if (count.count > 0) {
  const books = qcBooklogDb.prepare('SELECT id, book_id, book_type FROM qc_bookdata ORDER BY id DESC LIMIT 10').all();
  console.log('✅ QCBookLog数据库中的书籍载体类型（最新10本）:');
  console.log(JSON.stringify(books, null, 2));
}

qcBooklogDb.close();