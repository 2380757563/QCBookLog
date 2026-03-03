/**
 * 修补不完整数据库文件的结构
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const templateTalebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');
const incompleteTalebookPath = path.join(path.resolve('.'), 'data/talebook/模板calibre-webserver (1).db');

console.log('🔧 开始修补不完整数据库文件...\n');

try {
  console.log('📁 连接标准模板数据库:', templateTalebookPath);
  const templateDb = new Database(templateTalebookPath, { readonly: true });
  
  console.log('📁 连接待修补数据库:', incompleteTalebookPath);
  
  // 备份原数据库
  const backupDir = path.join(path.resolve('.'), 'data/talebook/backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `模板calibre-webserver(1)_backup_${timestamp}.db`);
  fs.copyFileSync(incompleteTalebookPath, backupPath);
  console.log(`✅ 原数据库已备份到: ${backupPath}\n`);

  const incompleteDb = new Database(incompleteTalebookPath);

  // ==================== 1. 创建缺失的表 ====================
  console.log('1️⃣  创建缺失的表...\n');

  const missingTables = [
    'comments', 'qc_book_groups', 'qc_book_tags', 'qc_bookdata',
    'qc_bookmark_tags', 'qc_bookmarks', 'qc_daily_reading_stats',
    'qc_groups', 'qc_reading_records', 'qc_tags', 'reading_goals', 'users'
  ];

  missingTables.forEach(tableName => {
    const tableSQL = templateDb.prepare(`
      SELECT sql FROM sqlite_master WHERE name = ?
    `).get(tableName).sql;

    try {
      incompleteDb.exec(tableSQL);
      console.log(`   ✅ 创建表: ${tableName}`);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log(`   ⚠️  表已存在: ${tableName}`);
      } else {
        console.log(`   ❌ 创建表失败: ${tableName} - ${error.message}`);
      }
    }
  });

  // ==================== 2. 修复外键约束 ====================
  console.log('\n2️⃣  修复外键约束...\n');

  const tablesWithWrongFK = [
    'biz_key', 'items', 'messages', 'reader_paid_books', 'readerlogs', 'reading_state', 'social_auth_usersocialauth'
  ];

  tablesWithWrongFK.forEach(tableName => {
    try {
      const foreignKeys = incompleteDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
      const wrongFKs = foreignKeys.filter(fk => fk.table === 'readers');

      if (wrongFKs.length > 0) {
        console.log(`   📋 表: ${tableName}`);
        console.log(`      发现 ${wrongFKs.length} 个错误的外键约束`);

        // SQLite 不支持直接修改外键，需要重建表
        const tableSQL = incompleteDb.prepare(`
          SELECT sql FROM sqlite_master WHERE name = ?
        `).get(tableName).sql;

        const columns = incompleteDb.prepare(`PRAGMA table_info(${tableName})`).all();
        const columnDefs = columns.map(col => {
          const pk = col.pk > 0 ? ' PRIMARY KEY' : '';
          const notnull = col.notnull > 0 ? ' NOT NULL' : '';
          const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
          return `"${col.name}" ${col.type}${notnull}${dflt}${pk}`;
        }).join(', ');

        const newTableSQL = tableSQL.replace(
          /FOREIGN KEY.*?\)/i,
          match => {
            // 将 readers 替换为 users
            return match.replace(/readers/gi, 'users');
          }
        );

        // 重命名旧表
        incompleteDb.exec(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
        console.log(`      ✅ 重命名旧表为 ${tableName}_old`);

        // 创建新表
        incompleteDb.exec(newTableSQL);
        console.log(`      ✅ 创建新表 ${tableName}`);

        // 迁移数据
        const columnNames = columns.map(col => col.name).join(', ');
        incompleteDb.exec(`INSERT INTO ${tableName} (${columnNames}) SELECT ${columnNames} FROM ${tableName}_old`);
        console.log(`      ✅ 迁移数据`);

        // 删除旧表
        incompleteDb.exec(`DROP TABLE ${tableName}_old`);
        console.log(`      ✅ 删除旧表`);
      }
    } catch (error) {
      console.log(`   ❌ 修复外键失败: ${tableName} - ${error.message}`);
    }
  });

  // ==================== 3. 验证修补结果 ====================
  console.log('\n3️⃣  验证修补结果...\n');

  const templateTableCount = templateDb.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).get().count;

  const incompleteTableCount = incompleteDb.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).get().count;

  console.log(`📊 标准模板表数: ${templateTableCount}`);
  console.log(`📊 修补后表数: ${incompleteTableCount}`);

  if (incompleteTableCount === templateTableCount) {
    console.log('✅ 表数量一致');
  } else {
    console.log(`⚠️  表数量不一致: 差异 ${Math.abs(incompleteTableCount - templateTableCount)} 个`);
  }

  // 验证外键约束
  let totalWrongFKs = 0;
  const allTables = incompleteDb.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all().map(t => t.name);

  allTables.forEach(tableName => {
    const foreignKeys = incompleteDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
    const wrongFKs = foreignKeys.filter(fk => fk.table === 'readers');
    totalWrongFKs += wrongFKs.length;
  });

  if (totalWrongFKs === 0) {
    console.log('✅ 外键约束已修复');
  } else {
    console.log(`⚠️  仍有 ${totalWrongFKs} 个错误的外键约束`);
  }

  templateDb.close();
  incompleteDb.close();

  console.log('\n🎉 数据库修补完成！');
  console.log(`\n📋 修补摘要:`);
  console.log(`   • 创建缺失表: ${missingTables.length} 个`);
  console.log(`   • 修复外键约束: ${tablesWithWrongFK.length} 个表`);
  console.log(`   • 备份文件: ${backupPath}`);

} catch (error) {
  console.error('\n❌ 修补失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}