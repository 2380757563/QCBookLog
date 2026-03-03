const Database = require('better-sqlite3');
const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reading_state'").get();
console.log('reading_state table structure:');
console.log(sql.sql);

const items = db.prepare('SELECT book_id FROM items WHERE book_id = 99').get();
console.log('\nBook 99 in items table:', items ? 'Found' : 'Not found');

db.close();