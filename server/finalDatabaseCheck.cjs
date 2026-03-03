const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');

const CALIBRE_DB_PATH = path.join(projectRoot, 'data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              数据库完整性检查报告 (最终版)                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

function checkCalibreDatabase() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 Calibre 数据库 (metadata.db)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (!fs.existsSync(CALIBRE_DB_PATH)) {
    console.log('❌ 数据库文件不存在\n');
    return { status: 'missing', tables: 0 };
  }
  
  const db = new Database(CALIBRE_DB_PATH, { readonly: true });
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    console.log(`📋 表数量: ${tables.length} 个\n`);
    
    if (tables.length === 0) {
      console.log('ℹ️ 数据库为空（这是正常的，Calibre 元数据可能在 Talebook 数据库中）\n');
      return { status: 'empty', tables: 0 };
    }
    
    tables.forEach(t => console.log(`  ✅ ${t.name}`));
    return { status: 'ok', tables: tables.length };
  } finally {
    db.close();
  }
}

function checkTalebookDatabase() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Talebook 数据库 (calibre-webserver.db)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const requiredTables = [
    'items', 'reading_state', 'readers', 'readerlogs', 'messages', 
    'reader_paid_books', 'devices'
  ];
  
  const requiredFields = {
    'items': ['book_id', 'count_visit', 'count_download', 'book_type'],
    'reading_state': ['book_id', 'reader_id', 'favorite', 'read_state'],
    'readers': ['id', 'username', 'email'],
    'devices': ['id', 'reader_id', 'device_name', 'device_type']
  };
  
  if (!fs.existsSync(TALEBOOK_DB_PATH)) {
    console.log('❌ 数据库文件不存在\n');
    return { status: 'missing', tables: 0 };
  }
  
  const db = new Database(TALEBOOK_DB_PATH, { readonly: true });
  let allOk = true;
  let tableCount = 0;
  
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);
    tableCount = tableNames.length;
    
    console.log(`📋 表数量: ${tableCount} 个\n`);
    console.log('--- 必需表检查 ---\n');
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} (缺失)`);
        allOk = false;
      }
    }
    
    console.log('\n--- 关键字段检查 ---\n');
    
    for (const [table, fields] of Object.entries(requiredFields)) {
      if (!tableNames.includes(table)) continue;
      
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      const colNames = columns.map(c => c.name);
      
      console.log(`  📁 ${table}:`);
      for (const field of fields) {
        if (colNames.includes(field)) {
          console.log(`      ✅ ${field}`);
        } else {
          console.log(`      ❌ ${field} (缺失)`);
          allOk = false;
        }
      }
    }
    
    return { status: allOk ? 'complete' : 'incomplete', tables: tableCount };
  } finally {
    db.close();
  }
}

function checkQcbooklogDatabase() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 QCBookLog 数据库 (qc_booklog.db)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const requiredTables = [
    'qc_book_mapping', 'qc_users', 'qc_groups', 'qc_tags',
    'qc_bookdata', 'qc_bookmarks', 'qc_bookmark_tags', 
    'qc_book_groups', 'qc_book_tags', 'qc_reading_records',
    'qc_daily_reading_stats', 'qc_reading_goals', 'qc_comments', 'qc_wishlist'
  ];
  
  const requiredFields = {
    'qc_book_mapping': ['id', 'calibre_book_id', 'talebook_book_id', 'title'],
    'qc_bookdata': ['id', 'book_id', 'page_count', 'book_type'],
    'qc_bookmarks': ['id', 'mapping_id', 'text', 'created_at'],
    'qc_reading_records': ['id', 'book_id', 'duration', 'pages_read'],
    'qc_daily_reading_stats': ['id', 'reader_id', 'date', 'total_time'],
    'qc_reading_goals': ['id', 'user_id', 'year', 'target'],
    'qc_comments': ['id', 'mapping_id', 'user_id', 'content'],
    'qc_wishlist': ['id', 'user_id', 'title', 'status']
  };
  
  if (!fs.existsSync(QCBOOKLOG_DB_PATH)) {
    console.log('❌ 数据库文件不存在\n');
    return { status: 'missing', tables: 0 };
  }
  
  const db = new Database(QCBOOKLOG_DB_PATH, { readonly: true });
  let allOk = true;
  let tableCount = 0;
  
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);
    tableCount = tableNames.length;
    
    console.log(`📋 表数量: ${tableCount} 个\n`);
    console.log('--- 必需表检查 ---\n');
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} (缺失)`);
        allOk = false;
      }
    }
    
    const extraTables = tableNames.filter(t => !requiredTables.includes(t));
    if (extraTables.length > 0) {
      console.log('\n--- 额外表 ---\n');
      extraTables.forEach(t => console.log(`  ℹ️ ${t}`));
    }
    
    console.log('\n--- 关键字段检查 ---\n');
    
    for (const [table, fields] of Object.entries(requiredFields)) {
      if (!tableNames.includes(table)) continue;
      
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      const colNames = columns.map(c => c.name);
      
      console.log(`  📁 ${table}:`);
      for (const field of fields) {
        if (colNames.includes(field)) {
          console.log(`      ✅ ${field}`);
        } else {
          console.log(`      ❌ ${field} (缺失)`);
          allOk = false;
        }
      }
    }
    
    return { status: allOk ? 'complete' : 'incomplete', tables: tableCount };
  } finally {
    db.close();
  }
}

const r1 = checkCalibreDatabase();
const r2 = checkTalebookDatabase();
const r3 = checkQcbooklogDatabase();

console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                      总体检查结果                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Calibre 数据库:   ${r1.status === 'empty' ? '✅ 空数据库（正常）' : r1.status === 'ok' ? '✅ 正常' : '❌ 不存在'}`);
console.log(`Talebook 数据库:  ${r2.status === 'complete' ? '✅ 完整' : '❌ 不完整'} (${r2.tables} 个表)`);
console.log(`QCBookLog 数据库: ${r3.status === 'complete' ? '✅ 完整' : '❌ 不完整'} (${r3.tables} 个表)`);

if (r2.status === 'complete' && r3.status === 'complete') {
  console.log('\n🎉 所有数据库结构完整，无缺失表或字段！\n');
} else {
  console.log('\n⚠️ 存在结构缺失，需要修复\n');
}
