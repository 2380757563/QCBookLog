/**
 * 测试数据库结构验证逻辑
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/talebook/calibre-webserver.db');

console.log('='.repeat(70));
console.log('测试数据库结构验证逻辑');
console.log('='.repeat(70));
console.log(`数据库路径: ${dbPath}\n`);

try {
  const testDb = new Database(dbPath, { readonly: true });

  // Talebook 数据库必需的表和字段（已更新，移除了已删除的表）
  const talebookRequiredTables = {
    items: ['book_id', 'book_type', 'count_guest', 'count_visit', 'count_download', 'website', 'collector_id', 'sole', 'book_count', 'create_time'],
    comments: ['id', 'item_id', 'content', 'created'],
    users: ['id', 'username', 'name', 'email', 'avatar', 'admin', 'active', 'created_at'],
    qc_groups: ['id', 'name', 'description', 'created_at', 'updated_at'],
    qc_book_groups: ['id', 'book_id', 'group_id'],
    qc_bookmarks: ['id', 'book_id', 'book_title', 'book_author', 'content', 'note', 'page', 'created_at', 'updated_at'],
    qc_bookmark_tags: ['id', 'bookmark_id', 'tag_id', 'tag_name'],
    qc_tags: ['id', 'name', 'created_at', 'updated_at'],
    reading_state: ['book_id', 'reader_id', 'favorite', 'favorite_date', 'wants', 'wants_date', 'read_state', 'read_date', 'online_read', 'download'],
    qc_bookdata: ['book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'binding1', 'binding2', 'note'],
    qc_reading_records: ['id', 'book_id', 'reader_id', 'start_time', 'end_time', 'duration', 'start_page', 'end_page', 'pages_read', 'notes', 'created_at'],
    qc_daily_reading_stats: ['id', 'reader_id', 'date', 'total_books', 'total_pages', 'total_time', 'created_at', 'updated_at'],
    reading_goals: ['id', 'reader_id', 'year', 'target', 'completed', 'created_at', 'updated_at']
  };

  // 检查所有必需的表和字段
  let allValid = true;
  const missingTables = [];
  const missingFields = [];

  console.log('🔍 检查表和字段...\n');

  for (const [tableName, requiredFields] of Object.entries(talebookRequiredTables)) {
    const tableInfo = testDb.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?
    `).get(tableName);

    if (!tableInfo) {
      missingTables.push(tableName);
      allValid = false;
      console.log(`❌ 表缺失: ${tableName}`);
      continue;
    }

    console.log(`✅ 表存在: ${tableName}`);

    // 检查字段
    const columns = testDb.prepare(`PRAGMA table_info(${tableName})`).all();
    const columnNames = columns.map(col => col.name);

    for (const field of requiredFields) {
      if (!columnNames.includes(field)) {
        missingFields.push(`${tableName}.${field}`);
        allValid = false;
        console.log(`   ❌ 字段缺失: ${field}`);
      }
    }

    if (missingFields.length === 0) {
      console.log(`   ✅ 所有必需字段都存在 (${requiredFields.length}个)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  if (allValid) {
    console.log('🎉 数据库结构验证通过！');
    console.log('✅ 所有必需的表和字段都存在');
  } else {
    console.log('⚠️  数据库结构验证失败');
    console.log(`缺少表: ${missingTables.join(', ') || '无'}`);
    console.log(`缺少字段: ${missingFields.join(', ') || '无'}`);
  }
  console.log('='.repeat(70));

  testDb.close();
  process.exit(allValid ? 0 : 1);
} catch (error) {
  console.error('❌ 验证失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
