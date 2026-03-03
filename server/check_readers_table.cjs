const Database = require('better-sqlite3');
const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

const readers = db.prepare('SELECT * FROM readers').all();
console.log('All readers:');
console.log(readers);

const reader0 = db.prepare('SELECT * FROM readers WHERE id = 0').get();
console.log('\nReader 0:', reader0 ? 'Found' : 'Not found');

const users = db.prepare('SELECT * FROM users').all();
console.log('\nAll users:');
console.log(users);

db.close();