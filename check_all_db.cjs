const Database = require('better-sqlite3');

console.log('=== 检查所有数据库最新状态 ===');

console.log('\n--- moni/book/metadata.db ---');
try {
  const db = new Database('d:/下载/docs-xmnote-master/QC-booklog/moni/book/metadata.db');
  const books = db.prepare('SELECT id, title, timestamp FROM books ORDER BY id DESC LIMIT 3').all();
  console.log('最近书籍:', books);
  db.close();
} catch (e) {
  console.error('错误:', e.message);
}

console.log('\n--- data/calibre/metadata.db ---');
try {
  const db = new Database('d:/下载/docs-xmnote-master/QC-booklog/data/calibre/metadata.db');
  const books = db.prepare('SELECT id, title, timestamp FROM books ORDER BY id DESC LIMIT 3').all();
  console.log('最近书籍:', books);
  db.close();
} catch (e) {
  console.error('错误:', e.message);
}

console.log('\n--- data/qc_booklog.db (qc_bookdata) ---');
try {
  const db = new Database('d:/下载/docs-xmnote-master/QC-booklog/data/qc_booklog.db');
  const data = db.prepare('SELECT book_id, created_at FROM qc_bookdata ORDER BY id DESC LIMIT 5').all();
  console.log('最近 qc_bookdata:', data);
  db.close();
} catch (e) {
  console.error('错误:', e.message);
}

console.log('\n--- moni/calibre-webserver.db (items) ---');
try {
  const db = new Database('d:/下载/docs-xmnote-master/QC-booklog/moni/calibre-webserver.db');
  const items = db.prepare('SELECT book_id, create_time FROM items ORDER BY book_id DESC LIMIT 3').all();
  console.log('最近 items:', items);
  db.close();
} catch (e) {
  console.error('错误:', e.message);
}
