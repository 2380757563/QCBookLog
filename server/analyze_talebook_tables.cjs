const Database = require('better-sqlite3');
const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('📊 Talebook 数据库表结构分析\n');

// 获取所有表
const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`📋 Talebook 数据库包含 ${tables.length} 个表：\n`);

tables.forEach((table, index) => {
  console.log(`${index + 1}. ${table.name}`);
});

console.log('\n' + '='.repeat(60) + '\n');

// 分析每个表的字段和数据
tables.forEach(table => {
  console.log(`\n📁 表名: ${table.name}`);
  
  try {
    // 获取表结构
    const sql = talebookDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get();
    if (sql && sql.sql) {
      console.log(`  表结构:\n${sql.sql}`);
    }
    
    // 获取记录数
    const countResult = talebookDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  记录数: ${countResult.count}`);
    
    // 如果记录数不多，显示一些示例数据
    if (countResult.count > 0 && countResult.count <= 5) {
      const sampleData = talebookDb.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
      console.log(`  示例数据:`);
      sampleData.forEach((row, i) => {
        console.log(`    ${i + 1}.`, row);
      });
    }
  } catch (error) {
    console.log(`  ❌ 无法分析此表: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(60));

talebookDb.close();