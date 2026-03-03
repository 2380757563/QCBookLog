import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'qc_booklog.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n=== Tables ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qc_%'").all();
  console.log('Tables:', tables.map(t => t.name));
  
  for (const table of tables) {
    console.log(`\n=== ${table.name} ===`);
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log('Columns:', columns.map(c => `${c.name} (${c.type})`));
  }
  
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
