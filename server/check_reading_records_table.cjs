const Database = require('better-sqlite3');

const talebookDb = new Database('../data/calibre-webserver.db');

console.log('=== 检查 qc_reading_records 表结构 ===');
const schema = talebookDb.prepare("PRAGMA table_info(qc_reading_records)").all();
console.log('qc_reading_records 表结构:', JSON.stringify(schema, null, 2));

talebookDb.close();
