/**
 * 基于标准模板创建全新数据库实例
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const templateCalibrePath = path.join(path.resolve('.'), 'data/calibre/metadata.db');
const templateTalebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');
const newCalibrePath = path.join(path.resolve('.'), 'data/calibre/metadata_new.db');
const newTalebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver_new.db');

console.log('🏗️  基于标准模板创建全新数据库实例...\n');

try {
  // ==================== 创建 Calibre 数据库 ====================
  console.log('1️⃣  创建 Calibre 数据库...\n');

  console.log('📁 连接标准模板 Calibre 数据库:', templateCalibrePath);
  const templateCalibreDb = new Database(templateCalibrePath, { readonly: true });
  
  console.log('📁 创建新 Calibre 数据库:', newCalibrePath);
  const newCalibreDb = new Database(newCalibrePath);

  // 获取所有表
  const calibreTables = templateCalibreDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`📊 发现 ${calibreTables.length} 个表\n`);

  // 创建所有表
  calibreTables.forEach(table => {
    try {
      newCalibreDb.exec(table.sql);
      console.log(`   ✅ 创建表: ${table.name}`);
    } catch (error) {
      console.log(`   ❌ 创建表失败: ${table.name} - ${error.message}`);
    }
  });

  // 创建所有索引
  const calibreIndexes = templateCalibreDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\n📊 发现 ${calibreIndexes.length} 个索引\n`);

  calibreIndexes.forEach(index => {
    try {
      if (index.sql) {
        newCalibreDb.exec(index.sql);
        console.log(`   ✅ 创建索引: ${index.name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  创建索引失败: ${index.name} - ${error.message}`);
    }
  });

  // 验证 Calibre 数据库
  const newCalibreTableCount = newCalibreDb.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).get().count;

  console.log(`\n📊 新 Calibre 数据库表数: ${newCalibreTableCount}`);
  console.log(`📊 标准 Calibre 数据库表数: ${calibreTables.length}`);

  if (newCalibreTableCount === calibreTables.length) {
    console.log('✅ Calibre 数据库结构验证通过');
  } else {
    console.log(`⚠️  表数量不一致: 差异 ${Math.abs(newCalibreTableCount - calibreTables.length)} 个`);
  }

  templateCalibreDb.close();
  newCalibreDb.close();

  // ==================== 创建 Talebook 数据库 ====================
  console.log('\n2️⃣  创建 Talebook 数据库...\n');

  console.log('📁 连接标准模板 Talebook 数据库:', templateTalebookPath);
  const templateTalebookDb = new Database(templateTalebookPath, { readonly: true });
  
  console.log('📁 创建新 Talebook 数据库:', newTalebookPath);
  const newTalebookDb = new Database(newTalebookPath);

  // 获取所有表
  const talebookTables = templateTalebookDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`📊 发现 ${talebookTables.length} 个表\n`);

  // 创建所有表
  talebookTables.forEach(table => {
    try {
      newTalebookDb.exec(table.sql);
      console.log(`   ✅ 创建表: ${table.name}`);
    } catch (error) {
      console.log(`   ❌ 创建表失败: ${table.name} - ${error.message}`);
    }
  });

  // 创建所有索引
  const talebookIndexes = templateTalebookDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\n📊 发现 ${talebookIndexes.length} 个索引\n`);

  talebookIndexes.forEach(index => {
    try {
      if (index.sql) {
        newTalebookDb.exec(index.sql);
        console.log(`   ✅ 创建索引: ${index.name}`);
      }
    } catch (error) {
      console.log(`   ⚠️  创建索引失败: ${index.name} - ${error.message}`);
    }
  });

  // 验证 Talebook 数据库
  const newTalebookTableCount = newTalebookDb.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).get().count;

  console.log(`\n📊 新 Talebook 数据库表数: ${newTalebookTableCount}`);
  console.log(`📊 标准 Talebook 数据库表数: ${talebookTables.length}`);

  if (newTalebookTableCount === talebookTables.length) {
    console.log('✅ Talebook 数据库结构验证通过');
  } else {
    console.log(`⚠️  表数量不一致: 差异 ${Math.abs(newTalebookTableCount - talebookTables.length)} 个`);
  }

  // 验证外键约束
  console.log('\n🔍 验证外键约束...\n');

  let totalFKs = 0;
  talebookTables.forEach(table => {
    const foreignKeys = newTalebookDb.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (foreignKeys.length > 0) {
      console.log(`📋 表: ${table.name} (${foreignKeys.length} 个外键)`);
      foreignKeys.forEach(fk => {
        console.log(`   • ${fk.from} → ${fk.table}.${fk.to}`);
      });
      totalFKs += foreignKeys.length;
    }
  });

  console.log(`\n📊 总外键约束数: ${totalFKs}`);

  templateTalebookDb.close();
  newTalebookDb.close();

  console.log('\n🎉 全新数据库实例创建完成！');
  console.log(`\n📋 创建摘要:`);
  console.log(`   • Calibre 数据库: ${newCalibrePath}`);
  console.log(`   • Talebook 数据库: ${newTalebookPath}`);
  console.log(`   • Calibre 表数: ${newCalibreTableCount}`);
  console.log(`   • Talebook 表数: ${newTalebookTableCount}`);
  console.log(`   • Talebook 外键约束: ${totalFKs} 个`);

} catch (error) {
  console.error('\n❌ 创建失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}