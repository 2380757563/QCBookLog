const Database = require('better-sqlite3');

const talebookDb = new Database('../data/calibre-webserver.db');

console.log('=== 检查 reading_state 表结构 ===');
const schema = talebookDb.prepare("PRAGMA table_info(reading_state)").all();
console.log('reading_state 表结构:', JSON.stringify(schema, null, 2));

talebookDb.close();
