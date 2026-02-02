import Database from 'better-sqlite3';
const db = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\calibre-webserver.db');

console.log('🔄 开始简化标签系统...');

// 1. 备份现有书摘数据
console.log('📦 备份现有书摘数据...');
const existingBookmarks = db.prepare('SELECT * FROM qc_bookmarks').all();
console.log(`📦 备份了 ${existingBookmarks.length} 条书摘数据`);

// 2. 删除旧的qc_bookmarks表
console.log('🗑️ 删除旧的qc_bookmarks表...');
db.prepare('DROP TABLE IF EXISTS qc_bookmarks').run();

// 3. 删除旧的qc_bookmark_tags表（如果存在）
console.log('🗑️ 删除旧的qc_bookmark_tags表...');
db.prepare('DROP TABLE IF EXISTS qc_bookmark_tags').run();

// 4. 删除qc_tags表（如果存在）
console.log('🗑️ 删除qc_tags表...');
db.prepare('DROP TABLE IF EXISTS qc_tags').run();

// 5. 创建新的qc_bookmarks表（移除tags字段）
console.log('✨ 创建新的qc_bookmarks表...');
db.prepare(`
  CREATE TABLE qc_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    page INTEGER,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES items(book_id) ON DELETE CASCADE
  )
`).run();

// 6. 创建新的qc_bookmark_tags表（包含完整的标签信息）
console.log('✨ 创建新的qc_bookmark_tags表...');
db.prepare(`
  CREATE TABLE qc_bookmark_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookmark_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    tag_type TEXT NOT NULL DEFAULT 'bookmark',
    tag_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bookmark_id) REFERENCES qc_bookmarks(id) ON DELETE CASCADE,
    UNIQUE(bookmark_id, tag_name)
  )
`).run();

// 7. 恢复书摘数据（解析tags字段）
console.log('♻️ 恢复书摘数据...');
const insertBookmark = db.prepare(`
  INSERT INTO qc_bookmarks (id, book_id, content, page, note, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertBookmarkTag = db.prepare(`
  INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name, tag_type, tag_count, created_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

let restoredCount = 0;
for (const bookmark of existingBookmarks) {
  insertBookmark.run(
    bookmark.id,
    bookmark.book_id,
    bookmark.content,
    bookmark.page,
    bookmark.note,
    bookmark.created_at,
    bookmark.updated_at
  );
  
  if (bookmark.tags && bookmark.tags.trim() !== '') {
    const tagNames = bookmark.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    for (const tagName of tagNames) {
      if (tagName) {
        insertBookmarkTag.run(bookmark.id, tagName, 'bookmark', 1);
        console.log(`  ✅ 为书摘 ${bookmark.id} 添加标签: ${tagName}`);
      }
    }
  }
  
  restoredCount++;
}

console.log(`♻️ 恢复了 ${restoredCount} 条书摘数据`);

// 8. 验证表结构
const bookmarkColumns = db.prepare("PRAGMA table_info(qc_bookmarks)").all();
const bookmarkTagColumns = db.prepare("PRAGMA table_info(qc_bookmark_tags)").all();
console.log('✅ qc_bookmarks表结构:', bookmarkColumns.map(c => c.name));
console.log('✅ qc_bookmark_tags表结构:', bookmarkTagColumns.map(c => c.name));

// 9. 验证数据
const newBookmarks = db.prepare('SELECT * FROM qc_bookmarks').all();
console.log(`✅ 验证：共 ${newBookmarks.length} 条书摘`);

const bookmarkTags = db.prepare('SELECT * FROM qc_bookmark_tags').all();
console.log(`✅ 验证：共 ${bookmarkTags.length} 条书摘-标签关联`);

// 10. 统计标签使用情况
const tagStats = {};
for (const tag of bookmarkTags) {
  tagStats[tag.tag_name] = (tagStats[tag.tag_name] || 0) + 1;
}
console.log('✅ 标签统计:', JSON.stringify(tagStats, null, 2));

db.close();
console.log('✅ 标签系统简化完成！');
console.log('✅ 新系统只使用两个表：');
console.log('  - qc_bookmarks: 存储书摘数据');
console.log('  - qc_bookmark_tags: 存储书摘-标签关联（包含完整的标签信息）');
console.log('✅ qc_tags表已删除，不再需要');
