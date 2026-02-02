import databaseService from './services/databaseService.js';

async function checkDatabase() {
  try {
    // 检查items表结构和主键
    const itemsTableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(items)').all();
    console.log('=== items表结构 ===');
    itemsTableInfo.forEach(col => {
      console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 检查所有表名
    const tables = databaseService.talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('\n=== 所有表名 ===');
    tables.forEach(table => {
      console.log(table.name);
    });
    
    // 检查qc_book_tags表结构和外键
    const tagsTableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(qc_book_tags)').all();
    console.log('\n=== qc_book_tags表结构 ===');
    tagsTableInfo.forEach(col => {
      console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    const tagsForeignKeys = databaseService.talebookDb.prepare('PRAGMA foreign_key_list(qc_book_tags)').all();
    console.log('\n=== qc_book_tags表外键 ===');
    if (tagsForeignKeys.length > 0) {
      tagsForeignKeys.forEach(fk => {
        console.log(`外键: ${fk.from} -> ${fk.table}.${fk.to}`);
      });
    } else {
      console.log('无外键定义');
    }
    
    // 检查qc_book_groups表结构和外键
    const groupsTableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(qc_book_groups)').all();
    console.log('\n=== qc_book_groups表结构 ===');
    groupsTableInfo.forEach(col => {
      console.log(`${col.cid}: ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    const groupsForeignKeys = databaseService.talebookDb.prepare('PRAGMA foreign_key_list(qc_book_groups)').all();
    console.log('\n=== qc_book_groups表外键 ===');
    if (groupsForeignKeys.length > 0) {
      groupsForeignKeys.forEach(fk => {
        console.log(`外键: ${fk.from} -> ${fk.table}.${fk.to}`);
      });
    } else {
      console.log('无外键定义');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
