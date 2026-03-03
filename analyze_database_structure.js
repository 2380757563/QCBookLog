/**
 * 完整分析两个数据库文件的结构
 * 作为数据库初始化的标准模板
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const calibrePath = path.join(path.resolve('.'), 'data/calibre/metadata.db');
const talebookPath = path.join(path.resolve('.'), 'data/talebook/calibre-webserver.db');

console.log('🔍 开始分析两个数据库文件的完整结构...\n');

try {
  // 连接数据库
  console.log('📁 连接 Calibre 数据库:', calibrePath);
  const calibreDb = new Database(calibrePath, { readonly: true });
  
  console.log('📁 连接 Talebook 数据库:', talebookPath);
  const talebookDb = new Database(talebookPath, { readonly: true });

  // ==================== Calibre 数据库分析 ====================
  console.log('\n' + '='.repeat(80));
  console.log('📚 Calibre 数据库 (metadata.db) 结构分析');
  console.log('='.repeat(80) + '\n');

  const calibreTables = calibreDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`📊 总表数: ${calibreTables.length}\n`);

  calibreTables.forEach(table => {
    console.log(`📋 表: ${table.name}`);
    console.log(`   SQL: ${table.sql.substring(0, 100)}...`);
    
    // 获取字段信息
    const columns = calibreDb.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`   字段数: ${columns.length}`);
    
    columns.forEach(col => {
      const pk = col.pk > 0 ? 'PK' : '  ';
      const notnull = col.notnull > 0 ? 'NOT NULL' : 'NULLABLE';
      const dflt = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
      console.log(`   ${pk} ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${notnull.padEnd(10)} ${dflt}`);
    });
    
    // 获取索引信息
    const indexes = calibreDb.prepare(`PRAGMA index_list(${table.name})`).all();
    if (indexes.length > 0) {
      console.log(`   索引数: ${indexes.length}`);
      indexes.forEach(idx => {
        const idxColumns = calibreDb.prepare(`PRAGMA index_info(${idx.name})`).all();
        const colNames = idxColumns.map(c => c.name).join(', ');
        console.log(`     • ${idx.name} (${colNames})`);
      });
    }
    
    // 获取外键信息
    const foreignKeys = calibreDb.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (foreignKeys.length > 0) {
      console.log(`   外键数: ${foreignKeys.length}`);
      foreignKeys.forEach(fk => {
        console.log(`     • ${fk.from} -> ${fk.table}.${fk.to} (${fk.on_update} ${fk.on_delete})`);
      });
    }
    
    console.log();
  });

  // ==================== Talebook 数据库分析 ====================
  console.log('='.repeat(80));
  console.log('📚 Talebook 数据库 (calibre-webserver.db) 结构分析');
  console.log('='.repeat(80) + '\n');

  const talebookTables = talebookDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`📊 总表数: ${talebookTables.length}\n`);

  talebookTables.forEach(table => {
    console.log(`📋 表: ${table.name}`);
    console.log(`   SQL: ${table.sql.substring(0, 100)}...`);
    
    // 获取字段信息
    const columns = talebookDb.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`   字段数: ${columns.length}`);
    
    columns.forEach(col => {
      const pk = col.pk > 0 ? 'PK' : '  ';
      const notnull = col.notnull > 0 ? 'NOT NULL' : 'NULLABLE';
      const dflt = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
      console.log(`   ${pk} ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${notnull.padEnd(10)} ${dflt}`);
    });
    
    // 获取索引信息
    const indexes = talebookDb.prepare(`PRAGMA index_list(${table.name})`).all();
    if (indexes.length > 0) {
      console.log(`   索引数: ${indexes.length}`);
      indexes.forEach(idx => {
        const idxColumns = talebookDb.prepare(`PRAGMA index_info(${idx.name})`).all();
        const colNames = idxColumns.map(c => c.name).join(', ');
        console.log(`     • ${idx.name} (${colNames})`);
      });
    }
    
    // 获取外键信息
    const foreignKeys = talebookDb.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
    if (foreignKeys.length > 0) {
      console.log(`   外键数: ${foreignKeys.length}`);
      foreignKeys.forEach(fk => {
        console.log(`     • ${fk.from} -> ${fk.table}.${fk.to} (${fk.on_update} ${fk.on_delete})`);
      });
    }
    
    console.log();
  });

  // ==================== 表间关系分析 ====================
  console.log('='.repeat(80));
  console.log('🔗 数据库间关系分析');
  console.log('='.repeat(80) + '\n');

  console.log('📚 Calibre 数据库主要表关系:');
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
    const linkExists = calibreTables.some(t => t.name === rel.link);
    
    if (fromExists && toExists && linkExists) {
      console.log(`   ✅ ${rel.from} ↔ ${rel.to} (通过 ${rel.link})`);
    } else {
      console.log(`   ❌ ${rel.from} ↔ ${rel.to} (通过 ${rel.link}) - 缺失`);
    }
  });

  console.log('\n📚 Talebook 数据库主要表关系:');
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
    
    if (fromExists && toExists) {
      console.log(`   ✅ ${rel.from} ↔ ${rel.to} (通过 ${rel.link})`);
    } else {
      console.log(`   ❌ ${rel.from} ↔ ${rel.to} (通过 ${rel.link}) - 缺失`);
    }
  });

  // 关闭数据库连接
  calibreDb.close();
  talebookDb.close();

  console.log('\n' + '='.repeat(80));
  console.log('✅ 数据库结构分析完成！');
  console.log('='.repeat(80));

} catch (error) {
  console.error('\n❌ 分析失败:', error.message);
  console.error('❌ 错误堆栈:', error.stack);
  process.exit(1);
}