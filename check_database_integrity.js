/**
 * 检测不完整数据库文件的结构完整性
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const templateTalebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');
const incompleteTalebookPath = path.join(path.resolve('.'), 'data/talebook/模板calibre-webserver (1).db');
const reportPath = path.join(path.resolve('.'), 'docs/DATABASE_INTEGRITY_CHECK_REPORT.md');

console.log('🔍 检测不完整数据库文件的结构完整性...\n');

let report = '# 数据库完整性检测报告\n\n';
report += `检测时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

try {
  console.log('📁 连接标准模板数据库:', templateTalebookPath);
  const templateDb = new Database(templateTalebookPath, { readonly: true });
  
  console.log('📁 连接待检测数据库:', incompleteTalebookPath);
  
  if (!fs.existsSync(incompleteTalebookPath)) {
    console.log('❌ 待检测数据库文件不存在');
    process.exit(1);
  }
  
  const incompleteDb = new Database(incompleteTalebookPath, { readonly: true });

  // ==================== 表完整性检测 ====================
  report += '## 表完整性检测\n\n';
  
  const templateTables = templateDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(t => t.name);

  const incompleteTables = incompleteDb.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(t => t.name);

  console.log(`\n📊 标准模板表数: ${templateTables.length}`);
  console.log(`📊 待检测数据库表数: ${incompleteTables.length}\n`);

  report += `### 表对比\n\n`;
  report += `| 状态 | 表名 |\n`;
  report += `|------|------|\n`;

  const missingTables = templateTables.filter(t => !incompleteTables.includes(t));
  const extraTables = incompleteTables.filter(t => !templateTables.includes(t));

  if (missingTables.length > 0) {
    console.log(`❌ 缺失表 (${missingTables.length}个):`);
    missingTables.forEach(table => {
      console.log(`   • ${table}`);
      report += `| ❌ 缺失 | ${table} |\n`;
    });
  } else {
    console.log('✅ 没有缺失的表');
  }

  if (extraTables.length > 0) {
    console.log(`⚠️  多余表 (${extraTables.length}个):`);
    extraTables.forEach(table => {
      console.log(`   • ${table}`);
      report += `| ⚠️  多余 | ${table} |\n`;
    });
  } else {
    console.log('✅ 没有多余的表');
  }

  // ==================== 字段完整性检测 ====================
  report += `\n## 字段完整性检测\n\n`;
  
  console.log('\n🔍 检测字段完整性...\n');

  let totalMissingFields = 0;
  let totalExtraFields = 0;

  incompleteTables.forEach(tableName => {
    if (!templateTables.includes(tableName)) {
      return;
    }

    const templateColumns = templateDb.prepare(`PRAGMA table_info(${tableName})`).all();
    const incompleteColumns = incompleteDb.prepare(`PRAGMA table_info(${tableName})`).all();

    const templateFields = new Set(templateColumns.map(c => c.name));
    const incompleteFields = new Set(incompleteColumns.map(c => c.name));

    const missingFields = [...templateFields].filter(f => !incompleteFields.has(f));
    const extraFields = [...incompleteFields].filter(f => !templateFields.has(f));

    if (missingFields.length > 0 || extraFields.length > 0) {
      console.log(`📋 表: ${tableName}`);
      report += `### 表: ${tableName}\n\n`;
      
      if (missingFields.length > 0) {
        console.log(`   ❌ 缺失字段 (${missingFields.length}个): ${missingFields.join(', ')}`);
        report += `**缺失字段 (${missingFields.length}个):**\n`;
        missingFields.forEach(field => {
          const templateCol = templateColumns.find(c => c.name === field);
          report += `- ${field} (${templateCol.type})\n`;
        });
        totalMissingFields += missingFields.length;
      }

      if (extraFields.length > 0) {
        console.log(`   ⚠️  多余字段 (${extraFields.length}个): ${extraFields.join(', ')}`);
        report += `**多余字段 (${extraFields.length}个):**\n`;
        extraFields.forEach(field => {
          const incompleteCol = incompleteColumns.find(c => c.name === field);
          report += `- ${field} (${incompleteCol.type})\n`;
        });
        totalExtraFields += extraFields.length;
      }
      
      report += '\n';
    }
  });

  if (totalMissingFields === 0 && totalExtraFields === 0) {
    console.log('✅ 所有表字段完整');
    report += '✅ 所有表字段完整，无缺失或多余字段\n\n';
  }

  // ==================== 约束条件检测 ====================
  report += `## 约束条件检测\n\n`;
  
  console.log('\n🔍 检测约束条件...\n');

  let totalMissingConstraints = 0;

  incompleteTables.forEach(tableName => {
    if (!templateTables.includes(tableName)) {
      return;
    }

    const templateFKs = templateDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
    const incompleteFKs = incompleteDb.prepare(`PRAGMA foreign_key_list(${tableName})`).all();

    const templateFKSet = new Set(templateFKs.map(fk => `${fk.from}->${fk.table}.${fk.to}`));
    const incompleteFKSet = new Set(incompleteFKs.map(fk => `${fk.from}->${fk.table}.${fk.to}`));

    const missingFKs = [...templateFKSet].filter(fk => !incompleteFKSet.has(fk));
    const extraFKs = [...incompleteFKSet].filter(fk => !templateFKSet.has(fk));

    if (missingFKs.length > 0 || extraFKs.length > 0) {
      console.log(`📋 表: ${tableName}`);
      report += `### 表: ${tableName}\n\n`;
      
      if (missingFKs.length > 0) {
        console.log(`   ❌ 缺失外键约束 (${missingFKs.length}个)`);
        missingFKs.forEach(fk => console.log(`      • ${fk}`));
        report += `**缺失外键约束 (${missingFKs.length}个):**\n`;
        missingFKs.forEach(fk => report += `- ${fk}\n`);
        totalMissingConstraints += missingFKs.length;
      }

      if (extraFKs.length > 0) {
        console.log(`   ⚠️  多余外键约束 (${extraFKs.length}个)`);
        extraFKs.forEach(fk => console.log(`      • ${fk}`));
        report += `**多余外键约束 (${extraFKs.length}个):**\n`;
        extraFKs.forEach(fk => report += `- ${fk}\n`);
      }
      
      report += '\n';
    }
  });

  if (totalMissingConstraints === 0) {
    console.log('✅ 所有约束条件完整');
    report += '✅ 所有约束条件完整，无缺失\n\n';
  }

  // ==================== 修补方案 ====================
  report += `## 数据库修补方案\n\n`;
  
  console.log('\n🔧 生成修补方案...\n');

  if (missingTables.length > 0) {
    report += `### 1. 创建缺失的表\n\n`;
    missingTables.forEach(tableName => {
      const tableSQL = templateDb.prepare(`
        SELECT sql FROM sqlite_master WHERE name = ?
      `).get(tableName).sql;
      
      console.log(`   需要创建表: ${tableName}`);
      report += `**表名:** ${tableName}\n\n`;
      report += `**SQL:**\n\`\`\`sql\n${tableSQL}\n\`\`\`\n\n`;
    });
  }

  if (totalMissingFields > 0) {
    report += `### 2. 添加缺失的字段\n\n`;
    report += `总缺失字段数: ${totalMissingFields}\n\n`;
  }

  if (totalMissingConstraints > 0) {
    report += `### 3. 添加缺失的约束\n\n`;
    report += `总缺失约束数: ${totalMissingConstraints}\n\n`;
  }

  if (extraTables.length > 0) {
    report += `### 4. 删除多余的表\n\n`;
    extraTables.forEach(tableName => {
      console.log(`   建议删除表: ${tableName}`);
      report += `**表名:** ${tableName}\n\n`;
      report += `**SQL:** \`DROP TABLE IF EXISTS ${tableName};\`\n\n`;
    });
  }

  if (totalExtraFields > 0) {
    report += `### 5. 删除多余的字段\n\n`;
    report += `总多余字段数: ${totalExtraFields}\n\n`;
  }

  if (missingTables.length === 0 && totalMissingFields === 0 && totalMissingConstraints === 0 && 
      extraTables.length === 0 && totalExtraFields === 0) {
    report += `✅ 数据库结构完整，无需修补\n\n`;
    console.log('✅ 数据库结构完整，无需修补');
  }

  templateDb.close();
  incompleteDb.close();

  // 保存报告
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n✅ 检测完成！报告已保存到: ${reportPath}`);

} catch (error) {
  console.error('\n❌ 检测失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}