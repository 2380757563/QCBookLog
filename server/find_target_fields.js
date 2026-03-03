/**
 * 检查所有 talebook 数据库文件
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(path.resolve('.'), 'data');

console.log('🔍 检查所有 talebook 相关数据库文件...\n');

// 查找所有 talebook 数据库文件
const dbFiles = [];

function findDbFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findDbFiles(fullPath, prefix + file + '/');
    } else if (file.endsWith('.db')) {
      dbFiles.push({ path: fullPath, relative: prefix + file });
    }
  });
}

findDbFiles(dataDir);

console.log(`📊 找到 ${dbFiles.length} 个数据库文件:\n`);

// 用户提到的字段
const targetFields = ['rating', 'series', 'publisher', 'publish_year', 'binding', 'description', 'isbn', 'price', 'author'];

dbFiles.forEach(({ path: dbPath, relative }) => {
  console.log(`📁 ${relative}`);
  
  try {
    const db = new Database(dbPath, { readonly: true });
    
    // 获取所有表
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    // 检查每个表
    let foundInTables = [];
    tables.forEach(table => {
      const tableName = table.name;
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const columnNames = columns.map(col => col.name);
      
      // 检查是否包含目标字段
      const foundFields = targetFields.filter(field => columnNames.includes(field));
      
      if (foundFields.length > 0) {
        foundInTables.push({ table: tableName, fields: foundFields });
      }
    });
    
    if (foundInTables.length > 0) {
      console.log(`   🎯 在以下表中发现目标字段:`);
      foundInTables.forEach(({ table, fields }) => {
        console.log(`     • ${table}: ${fields.join(', ')}`);
      });
    } else {
      console.log(`   ❌ 未发现目标字段`);
    }
    
    db.close();
    
  } catch (error) {
    console.log(`   ❌ 读取失败: ${error.message}`);
  }
  
  console.log();
});

console.log('✅ 检查完成！');