const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');

const CALIBRE_DB_PATH = path.join(projectRoot, 'data/calibre/metadata.db');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           数据库完整性全面检查报告                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const expectedTables = {
  calibre: {
    name: 'Calibre 数据库',
    path: CALIBRE_DB_PATH,
    requiredTables: [
      'books', 'authors', 'publishers', 'tags', 'ratings', 'series', 'languages',
      'books_authors_link', 'books_publishers_link', 'books_tags_link', 
      'books_ratings_link', 'books_series_link', 'books_languages_link',
      'identifiers', 'comments', 'data', 'conversion_options',
      'custom_columns', 'library_id', 'metadata_dirtied', 'preferences',
      'annotations', 'annotations_dirtied', 'last_read_positions'
    ],
    tableFields: {
      books: ['id', 'title', 'timestamp', 'pubdate', 'uuid', 'has_cover', 'path', 'series_index', 'author_sort', 'last_modified'],
      authors: ['id', 'name', 'sort', 'link'],
      publishers: ['id', 'name'],
      tags: ['id', 'name'],
      ratings: ['id', 'rating'],
      series: ['id', 'name'],
      languages: ['id', 'lang_code', 'link'],
      identifiers: ['id', 'book', 'type', 'val'],
      comments: ['id', 'book', 'text'],
      data: ['id', 'book', 'format', 'uncompressed_size', 'name']
    }
  },
  talebook: {
    name: 'Talebook 数据库',
    path: TALEBOOK_DB_PATH,
    requiredTables: [
      'items', 'reading_state', 'readers', 'readerlogs', 'messages', 
      'reader_paid_books', 'devices', 'scanfiles',
      'social_auth_association', 'social_auth_code', 'social_auth_nonce', 
      'social_auth_partial', 'social_auth_usersocialauth',
      'qc_bookdata', 'qc_bookmarks', 'qc_groups', 'qc_book_groups', 
      'reading_goals', 'biz_key'
    ],
    tableFields: {
      items: ['book_id', 'count_guest', 'count_visit', 'count_download', 'website', 'collector_id', 'sole', 'book_type', 'book_count', 'create_time'],
      reading_state: ['book_id', 'reader_id', 'favorite', 'favorite_date', 'wants', 'wants_date', 'read_state', 'read_date', 'online_read', 'download'],
      readers: ['id', 'username', 'password', 'salt', 'name', 'email', 'avatar', 'admin', 'active', 'permission', 'create_time', 'update_time', 'access_time', 'extra', 'vipquota', 'vipexpire'],
      devices: ['id', 'reader_id', 'device_name', 'device_type', 'device_id', 'last_access', 'user_agent', 'ip_address', 'created_at', 'updated_at'],
      qc_bookdata: ['book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'paper1', 'edge1', 'edge2', 'note', 'total_reading_time', 'read_pages', 'reading_count', 'last_read_date', 'last_read_duration'],
      qc_bookmarks: ['id', 'book_id', 'book_title', 'book_author', 'content', 'note', 'page', 'created_at', 'updated_at'],
      qc_groups: ['id', 'name', 'description', 'created_at', 'updated_at'],
      reading_goals: ['id', 'reader_id', 'year', 'target', 'completed', 'created_at', 'updated_at']
    }
  },
  qcbooklog: {
    name: 'QCBookLog 数据库',
    path: QCBOOKLOG_DB_PATH,
    requiredTables: [
      'qc_book_mapping', 'qc_users', 'qc_groups', 'qc_tags',
      'qc_bookdata', 'qc_bookmarks', 'qc_bookmark_tags', 
      'qc_book_groups', 'qc_book_tags', 'qc_reading_records',
      'qc_daily_reading_stats', 'qc_reading_goals', 'qc_comments', 'qc_wishlist'
    ],
    tableFields: {
      qc_book_mapping: ['id', 'library_uuid', 'calibre_book_id', 'talebook_book_id', 'title', 'author', 'created_at', 'updated_at'],
      qc_users: ['id', 'username', 'name', 'email', 'avatar', 'admin', 'active', 'created_at', 'updated_at'],
      qc_groups: ['id', 'name', 'description', 'created_at', 'updated_at'],
      qc_tags: ['id', 'name', 'created_at', 'updated_at'],
      qc_bookdata: ['id', 'book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'paper1', 'edge1', 'edge2', 'note', 'total_reading_time', 'read_pages', 'reading_count', 'last_read_date', 'last_read_duration', 'book_type', 'created_at', 'updated_at'],
      qc_bookmarks: ['id', 'book_id', 'book_title', 'book_author', 'content', 'note', 'page_number', 'chapter', 'user_id', 'created_at', 'updated_at'],
      qc_reading_records: ['id', 'book_id', 'reader_id', 'start_time', 'end_time', 'duration', 'start_page', 'end_page', 'pages_read', 'notes', 'created_at'],
      qc_daily_reading_stats: ['id', 'reader_id', 'date', 'total_books', 'total_pages', 'total_time', 'created_at', 'updated_at'],
      qc_reading_goals: ['id', 'reader_id', 'year', 'target', 'completed', 'created_at', 'updated_at'],
      qc_comments: ['id', 'book_id', 'user_id', 'content', 'created_at'],
      qc_wishlist: ['id', 'reader_id', 'isbn', 'title', 'author', 'notes', 'created_at', 'updated_at']
    }
  }
};

let totalIssues = 0;
let totalWarnings = 0;

function checkDatabase(dbConfig) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 ${dbConfig.name}`);
  console.log(`   路径: ${dbConfig.path}`);
  console.log(`${'═'.repeat(60)}\n`);
  
  if (!fs.existsSync(dbConfig.path)) {
    console.log('❌ 数据库文件不存在！\n');
    totalIssues++;
    return { exists: false, tables: [], missingTables: dbConfig.requiredTables };
  }
  
  const db = new Database(dbConfig.path, { readonly: true });
  const result = { exists: true, tables: [], missingTables: [], missingFields: [], extraTables: [] };
  
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);
    result.tables = tableNames;
    
    console.log(`📋 表统计: ${tableNames.length} 个表\n`);
    
    console.log('--- 必需表检查 ---\n');
    for (const requiredTable of dbConfig.requiredTables) {
      if (tableNames.includes(requiredTable)) {
        console.log(`  ✅ ${requiredTable}`);
      } else {
        console.log(`  ❌ ${requiredTable} (缺失)`);
        result.missingTables.push(requiredTable);
        totalIssues++;
      }
    }
    
    const extraTables = tableNames.filter(t => !dbConfig.requiredTables.includes(t));
    if (extraTables.length > 0) {
      console.log('\n--- 额外表 (不影响功能) ---\n');
      extraTables.forEach(t => {
        console.log(`  ℹ️ ${t}`);
        result.extraTables.push(t);
      });
    }
    
    console.log('\n--- 关键表字段检查 ---\n');
    
    for (const [tableName, expectedFields] of Object.entries(dbConfig.tableFields)) {
      if (!tableNames.includes(tableName)) {
        continue;
      }
      
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const columnNames = columns.map(c => c.name);
      
      console.log(`  📁 ${tableName}:`);
      
      for (const field of expectedFields) {
        if (columnNames.includes(field)) {
          console.log(`      ✅ ${field}`);
        } else {
          console.log(`      ❌ ${field} (缺失)`);
          result.missingFields.push(`${tableName}.${field}`);
          totalWarnings++;
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ 检查出错: ${error.message}`);
    totalIssues++;
  } finally {
    db.close();
  }
  
  return result;
}

console.log('检查时间:', new Date().toLocaleString(), '\n');

const results = {};
for (const [key, config] of Object.entries(expectedTables)) {
  results[key] = checkDatabase(config);
}

console.log('\n\n' + '╔══════════════════════════════════════════════════════════════╗');
console.log('║                      总体检查结果                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

for (const [key, result] of Object.entries(results)) {
  const config = expectedTables[key];
  const status = result.exists && result.missingTables.length === 0 ? '✅ 完整' : 
                 result.exists ? '⚠️ 不完整' : '❌ 不存在';
  console.log(`${config.name}: ${status}`);
  if (result.missingTables.length > 0) {
    console.log(`  缺失表: ${result.missingTables.join(', ')}`);
  }
  if (result.missingFields.length > 0) {
    console.log(`  缺失字段: ${result.missingFields.join(', ')}`);
  }
  console.log('');
}

console.log('─'.repeat(60));
console.log(`总问题数: ${totalIssues} 个错误, ${totalWarnings} 个警告`);
console.log('─'.repeat(60));

if (totalIssues === 0 && totalWarnings === 0) {
  console.log('\n🎉 所有数据库结构完整，无缺失表或字段！\n');
} else if (totalIssues === 0) {
  console.log('\n⚠️ 数据库基本完整，但存在一些字段缺失（可能不影响核心功能）\n');
} else {
  console.log('\n❌ 数据库存在缺失，需要修复！\n');
}
