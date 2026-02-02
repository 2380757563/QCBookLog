import databaseService from './services/databaseService.js';

async function checkDatabaseStructure() {
  try {
    console.log('=== 检查数据库结构 ===\n');
    
    // 检查外键约束状态
    const foreignKeysStatus = databaseService.talebookDb.prepare('PRAGMA foreign_keys').get();
    console.log(`外键约束状态: ${JSON.stringify(foreignKeysStatus)}\n`);
    
    // 检查items表结构
    console.log('=== items表结构 ===');
    const itemsStructure = databaseService.talebookDb.prepare('PRAGMA table_info(items)').all();
    console.log(JSON.stringify(itemsStructure, null, 2));
    
    // 检查items表主键
    const itemsIndexes = databaseService.talebookDb.prepare('PRAGMA index_list(items)').all();
    console.log('\n=== items表索引 ===');
    console.log(JSON.stringify(itemsIndexes, null, 2));
    
    // 检查qc_book.tags表结构
    console.log('\n=== qc_book.tags表结构 ===');
    const tagsStructure = databaseService.talebookDb.prepare('PRAGMA table_info("qc_book.tags")').all();
    console.log(JSON.stringify(tagsStructure, null, 2));
    
    // 检查qc_book.tags表外键定义
    console.log('\n=== qc_book.tags表外键定义 ===');
    const tagsForeignKeys = databaseService.talebookDb.prepare('PRAGMA foreign_key_list("qc_book.tags")').all();
    console.log(JSON.stringify(tagsForeignKeys, null, 2));
    
    // 检查所有表名
    console.log('\n=== 所有表名 ===');
    const allTables = databaseService.talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(JSON.stringify(allTables, null, 2));
    
  } catch (error) {
    console.error('检查数据库结构失败:', error.message);
  }
}

checkDatabaseStructure();
