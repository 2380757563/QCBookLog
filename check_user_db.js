/**
 * 检查用户指定的数据库文件
 */

import Database from 'better-sqlite3';
import path from 'path';

const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🔍 检查用户指定的数据库文件...\n');
console.log(`📁 数据库路径: ${talebookPath}\n`);

try {
  const db = new Database(talebookPath, { readonly: true });
  
  // 获取 qc_bookdata 表的所有字段
  const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  
  console.log('📚 qc_bookdata 表的所有字段:');
  console.log(`   总共 ${columns.length} 个字段:\n`);
  
  columns.forEach(col => {
    console.log(`   • ${col.name.padEnd(20)} ${col.type.padEnd(15)} PK:${col.pk} NOTNULL:${col.notnull} DEFAULT:${col.dflt_value || 'NULL'}`);
  });
  
  // 用户提到的需要删除的字段
  const fieldsToDelete = ['rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'isbn', 'price', 'author'];
  
  console.log('\n🗑️  需要删除的字段:');
  fieldsToDelete.forEach(fieldName => {
    const exists = columns.some(col => col.name === fieldName);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${fieldName}: ${exists ? '存在，可以删除' : '不存在'}`);
  });
  
  // 检查数据填充情况
  console.log('\n📊 检查字段数据填充情况:');
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
  console.log(`   总记录数: ${totalRecords}\n`);
  
  if (totalRecords > 0) {
    console.log('   各字段填充情况:');
    fieldsToDelete.forEach(fieldName => {
      const exists = columns.some(col => col.name === fieldName);
      if (exists) {
        const filledCount = db.prepare(`SELECT COUNT(*) as count FROM qc_bookdata WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`).get().count;
        const fillRate = (filledCount / totalRecords * 100).toFixed(2);
        const status = filledCount === 0 ? '✅ 可删除' : '⚠️  有数据';
        console.log(`   ${status} ${fieldName.padEnd(20)} 填充率: ${fillRate}% (${filledCount}/${totalRecords})`);
      }
    });
  }
  
  // 查看示例数据
  if (totalRecords > 0) {
    console.log('\n📖 示例数据:');
    const samples = db.prepare('SELECT * FROM qc_bookdata LIMIT 2').all();
    samples.forEach((sample, index) => {
      console.log(`\n   记录 ${index + 1}:`);
      Object.entries(sample).forEach(([key, value]) => {
        const isTarget = fieldsToDelete.includes(key) ? '🗑️ ' : '    ';
        const displayValue = value === null ? 'NULL' : (typeof value === 'string' && value === '' ? '空字符串' : value);
        console.log(`   ${isTarget}${key.padEnd(20)}: ${displayValue}`);
      });
    });
  }
  
  // 检查索引
  console.log('\n📋 检查索引:');
  const indexes = db.prepare(`PRAGMA index_list(qc_bookdata)`).all();
  indexes.forEach(idx => {
    console.log(`   • ${idx.name}`);
    const idxColumns = db.prepare(`PRAGMA index_info(${idx.name})`).all();
    idxColumns.forEach(col => {
      const isTarget = fieldsToDelete.includes(col.name) ? '🗑️ ' : '    ';
      console.log(`     ${isTarget}${col.name}`);
    });
  });
  
  db.close();
  
  console.log('\n✅ 检查完成！');

} catch (error) {
  console.error('\n❌ 检查失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}