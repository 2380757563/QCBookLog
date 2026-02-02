const Database = require('better-sqlite3');

const talebookDb = new Database('../data/calibre-webserver.db');

console.log('=== 检查 reading_goals 表结构 ===');
const schema = talebookDb.prepare("PRAGMA table_info(reading_goals)").all();
console.log('reading_goals 表结构:', JSON.stringify(schema, null, 2));

console.log('\n=== 检查 reading_goals 表数据 ===');
const goals = talebookDb.prepare('SELECT * FROM reading_goals LIMIT 5').all();
console.log('reading_goals 表数据:', JSON.stringify(goals, null, 2));

talebookDb.close();
