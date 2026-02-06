const Database = require('better-sqlite3');

const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('阅读记录日期格式:');
const records = db.prepare("SELECT id, book_id, start_time, end_time, created_at, DATE(created_at) as date_only FROM qc_reading_records LIMIT 5").all();
records.forEach(r => console.log('  id:', r.id, 'created_at:', r.created_at, 'date_only:', r.date_only));
