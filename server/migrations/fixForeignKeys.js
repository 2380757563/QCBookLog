import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';
const db = new Database(QC_BOOKLOG_PATH);

console.log('=== 修复外键约束 ===\n');

try {
  db.pragma('foreign_keys = OFF');
  
  console.log('1. 检查需要修复的表...');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qc_%'
  `).all();
  
  console.log('找到的表:', tables.map(t => t.name).join(', '));
  
  console.log('\n2. 备份并重建 qc_comments 表...');
  
  const commentsData = db.prepare('SELECT * FROM qc_comments').all();
  console.log(`   备份了 ${commentsData.length} 条评论数据`);
  
  db.exec('DROP TABLE IF EXISTS qc_comments');
  
  db.exec(`
    CREATE TABLE qc_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES qc_users(id) ON DELETE CASCADE
    )
  `);
  console.log('   ✅ qc_comments 表已重建');
  
  console.log('\n3. 检查其他可能有问题的外键...');
  
  const bookdataSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_bookdata'
  `).get();
  
  if (bookdataSchema && bookdataSchema.sql.includes('book_id')) {
    console.log('   qc_bookdata 表需要检查...');
    
    const bookdataData = db.prepare('SELECT * FROM qc_bookdata').all();
    console.log(`   备份了 ${bookdataData.length} 条扩展数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_bookdata');
    
    db.exec(`
      CREATE TABLE qc_bookdata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL UNIQUE,
        book_id INTEGER NOT NULL,
        page_count INTEGER DEFAULT 0,
        standard_price REAL DEFAULT 0,
        purchase_price REAL DEFAULT 0,
        purchase_date TEXT,
        binding1 INTEGER DEFAULT 0,
        binding2 INTEGER DEFAULT 0,
        paper1 INTEGER DEFAULT 0,
        edge1 INTEGER DEFAULT 0,
        edge2 INTEGER DEFAULT 0,
        note TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ qc_bookdata 表已重建');
  }
  
  console.log('\n4. 检查 qc_bookmarks 表...');
  
  const bookmarksSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_bookmarks'
  `).get();
  
  if (bookmarksSchema && bookmarksSchema.sql.includes('book_id')) {
    console.log('   qc_bookmarks 表需要检查...');
    
    const bookmarksData = db.prepare('SELECT * FROM qc_bookmarks').all();
    console.log(`   备份了 ${bookmarksData.length} 条书摘数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_bookmarks');
    
    db.exec(`
      CREATE TABLE qc_bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL,
        user_id INTEGER DEFAULT 0,
        chapter TEXT,
        pos INTEGER DEFAULT 0,
        pos_type TEXT DEFAULT 'chapter',
        text TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ qc_bookmarks 表已重建');
  }
  
  console.log('\n5. 检查 qc_reading_state 表...');
  
  const readingStateSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_reading_state'
  `).get();
  
  if (readingStateSchema && readingStateSchema.sql.includes('book_id')) {
    console.log('   qc_reading_state 表需要检查...');
    
    const readingStateData = db.prepare('SELECT * FROM qc_reading_state').all();
    console.log(`   备份了 ${readingStateData.length} 条阅读状态数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_reading_state');
    
    db.exec(`
      CREATE TABLE qc_reading_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL UNIQUE,
        user_id INTEGER DEFAULT 0,
        read_status TEXT DEFAULT '未读',
        current_chapter TEXT,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER DEFAULT 0,
        progress REAL DEFAULT 0,
        last_read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ qc_reading_state 表已重建');
  }
  
  console.log('\n6. 检查 qc_book_groups 表...');
  
  const bookGroupsSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_book_groups'
  `).get();
  
  if (bookGroupsSchema && bookGroupsSchema.sql.includes('book_id')) {
    console.log('   qc_book_groups 表需要检查...');
    
    const bookGroupsData = db.prepare('SELECT * FROM qc_book_groups').all();
    console.log(`   备份了 ${bookGroupsData.length} 条分组关联数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_book_groups');
    
    db.exec(`
      CREATE TABLE qc_book_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES qc_groups(id) ON DELETE CASCADE,
        UNIQUE(mapping_id, group_id)
      )
    `);
    console.log('   ✅ qc_book_groups 表已重建');
  }
  
  console.log('\n7. 检查 qc_book_tags 表...');
  
  const bookTagsSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_book_tags'
  `).get();
  
  if (bookTagsSchema && bookTagsSchema.sql.includes('book_id')) {
    console.log('   qc_book_tags 表需要检查...');
    
    const bookTagsData = db.prepare('SELECT * FROM qc_book_tags').all();
    console.log(`   备份了 ${bookTagsData.length} 条标签关联数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_book_tags');
    
    db.exec(`
      CREATE TABLE qc_book_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES qc_tags(id) ON DELETE CASCADE,
        UNIQUE(mapping_id, tag_id)
      )
    `);
    console.log('   ✅ qc_book_tags 表已重建');
  }
  
  console.log('\n8. 检查 qc_reading_records 表...');
  
  const readingRecordsSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_reading_records'
  `).get();
  
  if (readingRecordsSchema && readingRecordsSchema.sql.includes('book_id')) {
    console.log('   qc_reading_records 表需要检查...');
    
    const readingRecordsData = db.prepare('SELECT * FROM qc_reading_records').all();
    console.log(`   备份了 ${readingRecordsData.length} 条阅读记录数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_reading_records');
    
    db.exec(`
      CREATE TABLE qc_reading_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER NOT NULL,
        user_id INTEGER DEFAULT 0,
        read_date DATE NOT NULL,
        duration INTEGER DEFAULT 0,
        pages_read INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ qc_reading_records 表已重建');
  }
  
  console.log('\n9. 检查 qc_wishlist 表...');
  
  const wishlistSchema = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='qc_wishlist'
  `).get();
  
  if (wishlistSchema && wishlistSchema.sql.includes('book_id')) {
    console.log('   qc_wishlist 表需要检查...');
    
    const wishlistData = db.prepare('SELECT * FROM qc_wishlist').all();
    console.log(`   备份了 ${wishlistData.length} 条愿望清单数据`);
    
    db.exec('DROP TABLE IF EXISTS qc_wishlist');
    
    db.exec(`
      CREATE TABLE qc_wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mapping_id INTEGER,
        user_id INTEGER DEFAULT 0,
        title TEXT NOT NULL,
        author TEXT,
        isbn TEXT,
        publisher TEXT,
        price REAL,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE SET NULL
      )
    `);
    console.log('   ✅ qc_wishlist 表已重建');
  }
  
  db.pragma('foreign_keys = ON');
  
  console.log('\n✅ 外键约束修复完成！');
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  console.error(error);
}

db.close();
