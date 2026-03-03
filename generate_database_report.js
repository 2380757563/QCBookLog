/**
 * 详细分析数据库结构并保存到文件
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const calibrePath = path.join(path.resolve('.'), 'data/calibre/metadata.db');
const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');
const outputPath = path.join(path.resolve('.'), 'docs/DATABASE_STRUCTURE_DETAILED_ANALYSIS.md');

console.log('🔍 开始详细分析数据库结构...\n');

let report = '# 数据库结构详细分析报告\n\n';
report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

try {
  const calibreDb = new Database(calibrePath, { readonly: true });
  const talebookDb = new Database(talebookPath, { readonly: true });

  // ==================== Calibre 数据库 ====================
  report += '## Calibre 数据库 (metadata.db)\n\n';
  
  const calibreTables = calibreDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  report += `### 表统计\n\n`;
  report += `总表数: ${calibreTables.length}\n\n`;
  
  report += '### 表结构详情\n\n';

  calibreTables.forEach(table => {
    report += `#### ${table.name}\n\n`;
    report += `**SQL定义:**\n\`\`\`sql\n${table.sql}\n\`\`\`\n\n`;
    
    const columns = calibreDb.prepare(`PRAGMA table_info(${table.name})`).all();
    report += `**字段列表 (${columns.length}个):**\n\n`;
    report += '| 字段名 | 类型 | 主键 | 非空 | 默认值 |\n';
    report += '|---------|------|------|------|--------|\n';
    
    columns.forEach(col => {
      const pk = col.pk > 0 ? '✅' : '';
      const notnull = col.notnull > 0 ? '✅' : '';
      const dflt = col.dflt_value || '';
      report += `| ${col.name} | ${col.type} | ${pk} | ${notnull} | ${dflt} |\n`;
    });
    report += '\n';
    
    const indexes = calibreDb.prepare(`PRAGMA index_list(${table.name})`).all();
    if (indexes.length > 0) {
      report += `**索引列表 (${indexes.length}个):**\n\n`;
      indexes.forEach(idx => {
        const idxColumns = calibreDb.prepare(`PRAGMA index_info(${idx.name})`).all();
        const colNames = idxColumns.map(c => c.name).join(', ');
        report += `- ${idx.name} (${colNames})\n`;
      });
      report += '\n';
    }
    
    const foreignKeys = calibreDb.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (foreignKeys.length > 0) {
      report += `**外键约束 (${foreignKeys.length}个):**\n\n`;
      foreignKeys.forEach(fk => {
        report += `- ${fk.from} → ${fk.table}.${fk.to} (更新: ${fk.on_update}, 删除: ${fk.on_delete})\n`;
      });
      report += '\n';
    }
  });

  // ==================== Talebook 数据库 ====================
  report += '## Talebook 数据库 (calibre-webserver.db)\n\n';
  
  const talebookTables = talebookDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  report += `### 表统计\n\n`;
  report += `总表数: ${talebookTables.length}\n\n`;
  
  report += '### 表结构详情\n\n';

  talebookTables.forEach(table => {
    report += `#### ${table.name}\n\n`;
    report += `**SQL定义:**\n\`\`\`sql\n${table.sql}\n\`\`\`\n\n`;
    
    const columns = talebookDb.prepare(`PRAGMA table_info(${table.name})`).all();
    report += `**字段列表 (${columns.length}个):**\n\n`;
    report += '| 字段名 | 类型 | 主键 | 非空 | 默认值 |\n';
    report += '|---------|------|------|------|--------|\n';
    
    columns.forEach(col => {
      const pk = col.pk > 0 ? '✅' : '';
      const notnull = col.notnull > 0 ? '✅' : '';
      const dflt = col.dflt_value || '';
      report += `| ${col.name} | ${col.type} | ${pk} | ${notnull} | ${dflt} |\n`;
    });
    report += '\n';
    
    const indexes = talebookDb.prepare(`PRAGMA index_list(${table.name})`).all();
    if (indexes.length > 0) {
      report += `**索引列表 (${indexes.length}个):**\n\n`;
      indexes.forEach(idx => {
        const idxColumns = talebookDb.prepare(`PRAGMA index_info(${idx.name})`).all();
        const colNames = idxColumns.map(c => c.name).join(', ');
        report += `- ${idx.name} (${colNames})\n`;
      });
      report += '\n';
    }
    
    const foreignKeys = talebookDb.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (foreignKeys.length > 0) {
      report += `**外键约束 (${foreignKeys.length}个):**\n\n`;
      foreignKeys.forEach(fk => {
        report += `- ${fk.from} → ${fk.table}.${fk.to} (更新: ${fk.on_update}, 删除: ${fk.on_delete})\n`;
      });
      report += '\n';
    }
  });

  // ==================== 表间关系 ====================
  report += '## 数据库表间关系\n\n';
  
  report += '### Calibre 数据库关系\n\n';
  const calibreRelations = [
    { from: 'books', to: 'authors', link: 'books_authors_link' },
    { from: 'books', to: 'publishers', link: 'books_publishers_link' },
    { from: 'books', to: 'tags', link: 'books_tags_link' },
    { from: 'books', to: 'ratings', link: 'books_ratings_link' },
    { from: 'books', to: 'languages', link: 'books_languages_link' },
    { from: 'books', to: 'series', link: 'books_series_link' },
    { from: 'books', to: 'identifiers', link: 'identifiers (book)' },
    { from: 'books', to: 'comments', link: 'comments (book)' }
  ];

  calibreRelations.forEach(rel => {
    const fromExists = calibreTables.some(t => t.name === rel.from);
    const toExists = calibreTables.some(t => t.name === rel.to);
    const status = (fromExists && toExists) ? '✅' : '❌';
    report += `${status} ${rel.from} ↔ ${rel.to} (通过 ${rel.link})\n`;
  });

  report += '\n### Talebook 数据库关系\n\n';
  const talebookRelations = [
    { from: 'items', to: 'users', link: 'collector_id' },
    { from: 'qc_bookdata', to: 'items', link: 'book_id' },
    { from: 'reading_state', to: 'items', link: 'book_id' },
    { from: 'reading_state', to: 'users', link: 'reader_id' },
    { from: 'qc_bookmarks', to: 'items', link: 'book_id' },
    { from: 'qc_bookmarks', to: 'qc_bookmark_tags', link: 'bookmark_id' },
    { from: 'qc_book_groups', to: 'qc_groups', link: 'group_id' },
    { from: 'qc_book_groups', to: 'items', link: 'book_id' }
  ];

  talebookRelations.forEach(rel => {
    const fromExists = talebookTables.some(t => t.name === rel.from);
    const toExists = talebookTables.some(t => t.name === rel.to);
    const status = (fromExists && toExists) ? '✅' : '❌';
    report += `${status} ${rel.from} ↔ ${rel.to} (通过 ${rel.link})\n`;
  });

  calibreDb.close();
  talebookDb.close();

  // 保存报告
  fs.writeFileSync(outputPath, report, 'utf8');
  console.log(`✅ 分析完成！报告已保存到: ${outputPath}`);

} catch (error) {
  console.error('\n❌ 分析失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}