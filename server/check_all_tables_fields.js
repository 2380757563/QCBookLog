/**
 * 检查 talebook 数据库中所有表的结构
 * 查找用户提到的字段
 */

import Database from 'better-sqlite3';
import path from 'path';

const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🔍 检查 talebook 数据库中所有表的结构...\n');

try {
  const db = new Database(talebookPath, { readonly: true });
  
  // 获取所有表
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log(`📊 数据库中共有 ${tables.length} 个表:\n`);
  
  // 用户提到的字段
  const targetFields = ['rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'isbn', 'price', 'author'];
  
  // 检查每个表
  tables.forEach(table => {
    const tableName = table.name;
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columnNames = columns.map(col => col.name);
    
    // 检查是否包含目标字段
    const foundFields = targetFields.filter(field => columnNames.includes(field));
    
    if (foundFields.length > 0) {
      console.log(`📋 表: ${tableName}`);
      console.log(`   总字段数: ${columns.length}`);
      console.log(`   包含目标字段: ${foundFields.join(', ')}\n`);
      
      // 显示该表的所有字段
      console.log(`   所有字段:`);
      columns.forEach(col => {
        const isTarget = foundFields.includes(col.name) ? '🎯' : '  ';
        console.log(`   ${isTarget} ${col.name.padEnd(25)} ${col.type.padEnd(15)} PK:${col.pk}`);
      });
      console.log();
    }
  });
  
  // 检查 qc_bookdata 表的详细结构
  console.log('🔍 重点检查 qc_bookdata 表:');
  const qcBookdataColumns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
  console.log(`   字段数: ${qcBookdataColumns.length}`);
  console.log('   所有字段:');
  qcBookdataColumns.forEach(col => {
    console.log(`     • ${col.name.padEnd(25)} ${col.type.padEnd(15)} PK:${col.pk} NOTNULL:${col.notnull} DEFAULT:${col.dflt_value || 'NULL'}`);
  });
  
  // 检查是否有其他可能包含这些字段的表
  console.log('\n🔍 检查所有表中可能相关的字段:');
  
  // 检查是否有包含 author 相关的表
  const authorRelated = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    AND sql LIKE '%author%'
  `).all();
  
  if (authorRelated.length > 0) {
    console.log('\n   包含 author 相关的表:');
    authorRelated.forEach(t => console.log(`     • ${t.name}`));
  }
  
  // 检查是否有包含 publisher 相关的表
  const publisherRelated = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    AND sql LIKE '%publisher%'
  `).all();
  
  if (publisherRelated.length > 0) {
    console.log('\n   包含 publisher 相关的表:');
    publisherRelated.forEach(t => console.log(`     • ${t.name}`));
  }
  
  // 检查是否有包含 series 相关的表
  const seriesRelated = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    AND sql LIKE '%series%'
  `).all();
  
  if (seriesRelated.length > 0) {
    console.log('\n   包含 series 相关的表:');
    seriesRelated.forEach(t => console.log(`     • ${t.name}`));
  }
  
  db.close();
  
  console.log('\n✅ 检查完成！');

} catch (error) {
  console.error('\n❌ 检查失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
}