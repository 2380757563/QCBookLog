const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');

const CALIBRE_DB_PATH = path.join(projectRoot, 'data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

function showTableStructure(dbPath, dbName) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 ${dbName}`);
  console.log(`   路径: ${dbPath}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 数据库文件不存在！\n');
    return;
  }
  
  const db = new Database(dbPath, { readonly: true });
  
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    
    console.log(`📋 共 ${tables.length} 个表:\n`);
    
    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`┌─ ${table.name} (${columns.length} 个字段)`);
      columns.forEach(col => {
        const type = col.type || 'TEXT';
        const pk = col.pk ? ' [PK]' : '';
        const notnull = col.notnull ? ' NOT NULL' : '';
        const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
        console.log(`│   ${col.name}: ${type}${pk}${notnull}${dflt}`);
      });
      console.log('└─' + '─'.repeat(50));
    }
    
  } catch (error) {
    console.error(`❌ 检查出错: ${error.message}`);
  } finally {
    db.close();
  }
}

showTableStructure(CALIBRE_DB_PATH, 'Calibre 数据库');
showTableStructure(TALEBOOK_DB_PATH, 'Talebook 数据库');
showTableStructure(QCBOOKLOG_DB_PATH, 'QCBookLog 数据库');
