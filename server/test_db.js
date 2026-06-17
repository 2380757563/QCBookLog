const Database = require('better-sqlite3');
try {
  const db = new Database('/home/project/QCBookLog/data/calibre/metadata.db');
  console.log('连接成功');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('表数量:', tables.length);
  console.log('books count:', db.prepare('SELECT count(*) as c FROM books').get());
  db.close();
} catch (e) {
  console.log('错误:', e.message);
}
