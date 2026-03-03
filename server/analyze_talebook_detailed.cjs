const Database = require('better-sqlite3');
const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');

console.log('📊 Talebook 数据库表结构分析\n');

// 获取所有表
const tables = talebookDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`📋 Talebook 数据库包含 ${tables.length} 个表：\n`);

// 定义重要表
const importantTables = ['items', 'reading_state', 'readers', 'readerlogs', 'messages', 'reader_paid_books'];

// 分析每个表
tables.forEach(table => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📁 表名: ${table.name}`);
  console.log('='.repeat(60));
  
  try {
    // 获取表结构
    const sql = talebookDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get();
    if (sql && sql.sql) {
      console.log(`\n表结构:\n${sql.sql}`);
    }
    
    // 获取记录数
    const countResult = talebookDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`\n📊 记录数: ${countResult.count}`);
    
    // 如果是重要表，显示示例数据
    if (importantTables.includes(table.name) && countResult.count > 0) {
      const sampleData = talebookDb.prepare(`SELECT * FROM ${table.name} LIMIT 2`).all();
      console.log(`\n📝 示例数据:`);
      sampleData.forEach((row, i) => {
        console.log(`\n  示例 ${i + 1}:`);
        console.log(JSON.stringify(row, null, 2).split('\n').map(line => '    ' + line).join('\n'));
      });
    }
  } catch (error) {
    console.log(`\n❌ 无法分析此表: ${error.message}`);
  }
});

console.log('\n\n' + '='.repeat(60));
console.log('📋 总结：Talebook 数据库记录的主要数据');
console.log('='.repeat(60));

const summary = [];
importantTables.forEach(tableName => {
  const table = tables.find(t => t.name === tableName);
  if (table) {
    const countResult = talebookDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    summary.push({
      表名: tableName,
      记录数: countResult.count,
      用途: getTableDescription(tableName)
    });
  }
});

summary.forEach(item => {
  console.log(`\n${item.表名}:`);
  console.log(`  记录数: ${item.记录数}`);
  console.log(`  用途: ${item.用途}`);
});

console.log('\n' + '='.repeat(60));

talebookDb.close();

function getTableDescription(tableName) {
  const descriptions = {
    'items': '书籍列表，存储每本书的基本信息（book_id, book_type, count_visit等）',
    'reading_state': '阅读状态，记录每本书的阅读状态（read_state, favorite, wants等）',
    'readers': '读者账户，存储用户账户信息（username, password, email等）',
    'readerlogs': '读者日志，记录读者的操作历史',
    'messages': '系统消息，通知读者',
    'reader_paid_books': '付费书籍，记录读者购买的书籍'
  };
  return descriptions[tableName] || '其他表';
}