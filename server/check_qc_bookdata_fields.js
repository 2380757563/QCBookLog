/**
 * 检查 qc_bookdata 表的完整字段结构
 */

import Database from 'better-sqlite3';
import path from 'path';

const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🔍 检查 qc_bookdata 表的完整字段结构...\n');

try {
  const db = new Database(talebookPath, { readonly: true });
  
  // 获取 qc_bookdata 表的所有字段
  const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  
  console.log('📚 qc_bookdata 表的所有字段:');
  console.log(`   总共 ${columns.length} 个字段:\n`);
  
  columns.forEach(col => {
    console.log(`   • ${col.name.padEnd(20)} ${col.type.padEnd(15)} PK:${col.pk} NOTNULL:${col.notnull} DEFAULT:${col.dflt_value || 'NULL'}`);
  });
  
  // 检查用户提到的字段是否存在
  const userMentionedFields = ['rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'isbn', 'price', 'author'];
  
  console.log('\n🔍 检查用户提到的字段:');
  userMentionedFields.forEach(fieldName => {
    const exists = columns.some(col => col.name === fieldName);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${fieldName}: ${exists ? '存在' : '不存在'}`);
  });
  
  // 检查这些字段的数据填充情况
  console.log('\n📊 检查字段数据填充情况:');
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
  console.log(`   总记录数: ${totalRecords}\n`);
  
  if (totalRecords > 0) {
    userMentionedFields.forEach(fieldName => {
      const exists = columns.some(col => col.name === fieldName);
      if (exists) {
        const filledCount = db.prepare(`SELECT COUNT(*) as count FROM qc_bookdata WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`).get().count;
        const fillRate = (filledCount / totalRecords * 100).toFixed(2);
        console.log(`   • ${fieldName.padEnd(20)} 填充率: ${fillRate}% (${filledCount}/${totalRecords})`);
      }
    });
  }
  
  // 检查与 books 表的字段对比
  console.log('\n🔗 与 Calibre books 表的字段对比:');
  const calibrePath = path.join(path.resolve('.'), 'data/calibre/metadata.db');
  const calibreDb = new Database(calibrePath, { readonly: true });
  
  const booksColumns = calibreDb.prepare('PRAGMA table_info(books)').all();
  const booksFieldNames = new Set(booksColumns.map(col => col.name));
  
  console.log('\n   qc_bookdata 中可能与 books 表重复的字段:');
  columns.forEach(col => {
    if (booksFieldNames.has(col.name)) {
      console.log(`     • ${col.name} (同时存在于两个表)`);
    }
  });
  
  // 检查语义相关的字段
  console.log('\n   qc_bookdata 中语义可能与 books 表相关的字段:');
  const semanticMap = {
    'author': '作者信息',
    'publisher': '出版社',
    'series': '丛书',
    'description': '描述',
    'isbn': 'ISBN',
    'price': '价格',
    'publish_year': '出版年份',
    'rating': '评分'
  };
  
  Object.entries(semanticMap).forEach(([fieldName, description]) => {
    const exists = columns.some(col => col.name === fieldName);
    if (exists) {
      console.log(`     • ${fieldName}: ${description}`);
    }
  });
  
  calibreDb.close();
  db.close();
  
  console.log('\n✅ 检查完成！');

} catch (error) {
  console.error('\n❌ 检查失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}