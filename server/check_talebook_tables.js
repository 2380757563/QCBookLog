import Database from 'better-sqlite3';

const talebookDb = new Database('/app/data/talebook.db');

const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('✅ Talebook 数据库中的表:');
console.log(JSON.stringify(tables, null, 2));

talebookDb.close();