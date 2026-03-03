/**
 * 检查备份数据库中的 qc_bookdata 表结构
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 查找所有 talebook 数据库文件
const dataDir = path.join(path.resolve('.'), 'data');
const backupDir = path.join(dataDir, 'talebook', 'backup');
const talebookDir = path.join(dataDir, 'talebook');

console.log('🔍 检查所有 talebook 数据库文件中的 qc_bookdata 表结构...\n');

// 要检查的数据库文件列表
const dbFiles = [
  path.join(talebookDir, 'calibre-webserver.db'),
  path.join(talebookDir, 'calibre-webserver (1).db'),
  path.join(backupDir, 'calibre-webserver_before_cleanup_2026-02-03T12-59-32.db'),
  path.join(backupDir, 'calibre-webserver_backup_20260203_210730.db')
];

// 用户提到的字段
const targetFields = ['rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'isbn', 'price', 'author'];

dbFiles.forEach(dbPath => {
  if (fs.existsSync(dbPath)) {
    console.log(`📁 检查文件: ${path.basename(dbPath)}`);
    
    try {
      const db = new Database(dbPath, { readonly: true });
      
      // 检查 qc_bookdata 表是否存在
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name = 'qc_bookdata'
      `).get();
      
      if (tableExists) {
        const columns = db.prepare('PRAGMA table_info(qc_bookdata)').all();
        const columnNames = columns.map(col => col.name);
        
        console.log(`   ✅ qc_bookdata 表存在，共 ${columns.length} 个字段`);
        
        // 检查目标字段
        const foundFields = targetFields.filter(field => columnNames.includes(field));
        
        if (foundFields.length > 0) {
          console.log(`   🎯 发现目标字段: ${foundFields.join(', ')}`);
          
          // 显示所有字段
          console.log(`   所有字段:`);
          columns.forEach(col => {
            const isTarget = foundFields.includes(col.name) ? '🎯' : '  ';
            console.log(`   ${isTarget} ${col.name.padEnd(25)} ${col.type.padEnd(15)} PK:${col.pk}`);
          });
          
          // 检查数据填充情况
          const totalRecords = db.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
          if (totalRecords > 0) {
            console.log(`   📊 总记录数: ${totalRecords}`);
            
            foundFields.forEach(fieldName => {
              const filledCount = db.prepare(`SELECT COUNT(*) as count FROM qc_bookdata WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`).get().count;
              const fillRate = (filledCount / totalRecords * 100).toFixed(2);
              console.log(`      ${fieldName}: 填充率 ${fillRate}% (${filledCount}/${totalRecords})`);
            });
          }
        } else {
          console.log(`   ❌ 未发现目标字段`);
          console.log(`   现有字段: ${columnNames.join(', ')}`);
        }
      } else {
        console.log(`   ❌ qc_bookdata 表不存在`);
      }
      
      db.close();
      console.log();
      
    } catch (error) {
      console.log(`   ❌ 读取失败: ${error.message}`);
      console.log();
    }
  } else {
    console.log(`⚠️  文件不存在: ${path.basename(dbPath)}\n`);
  }
});

console.log('✅ 检查完成！');