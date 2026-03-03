import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3').default || require('better-sqlite3');

const QC_BOOKLOG_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db';
const db = new Database(QC_BOOKLOG_PATH);

console.log('=== 完整数据库迁移 ===\n');

try {
  db.pragma('foreign_keys = OFF');
  
  console.log('1. 备份现有数据...');
  
  const mappingData = db.prepare('SELECT * FROM qc_book_mapping').all();
  console.log(`   备份了 ${mappingData.length} 条映射数据`);
  
  const bookdataData = db.prepare('SELECT * FROM qc_bookdata').all();
  console.log(`   备份了 ${bookdataData.length} 条扩展数据`);
  
  const bookmarksData = db.prepare('SELECT * FROM qc_bookmarks').all();
  console.log(`   备份了 ${bookmarksData.length} 条书摘数据`);
  
  const readingStateData = db.prepare('SELECT * FROM qc_reading_state').all();
  console.log(`   备份了 ${readingStateData.length} 条阅读状态数据`);
  
  const readingRecordsData = db.prepare('SELECT * FROM qc_reading_records').all();
  console.log(`   备份了 ${readingRecordsData.length} 条阅读记录数据`);
  
  console.log('\n2. 重建所有表...');
  
  console.log('   重建 qc_bookdata...');
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
  
  console.log('   重建 qc_bookmarks...');
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
  
  console.log('   重建 qc_book_groups...');
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
  
  console.log('   重建 qc_book_tags...');
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
  
  console.log('   重建 qc_reading_records...');
  db.exec('DROP TABLE IF EXISTS qc_reading_records');
  db.exec(`
    CREATE TABLE qc_reading_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mapping_id INTEGER NOT NULL,
      user_id INTEGER DEFAULT 0,
      read_date DATE NOT NULL,
      duration INTEGER DEFAULT 0,
      pages_read INTEGER DEFAULT 0,
      start_page INTEGER DEFAULT 0,
      end_page INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mapping_id) REFERENCES qc_book_mapping(id) ON DELETE CASCADE
    )
  `);
  
  console.log('   重建 qc_reading_state...');
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
  
  console.log('   重建 qc_comments...');
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
  
  console.log('   重建 qc_wishlist...');
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
  
  console.log('\n3. 创建索引...');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bookdata_mapping ON qc_bookdata(mapping_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_bookmarks_mapping ON qc_bookmarks(mapping_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reading_state_mapping ON qc_reading_state(mapping_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reading_records_mapping ON qc_reading_records(mapping_id)`);
  
  console.log('\n4. 恢复数据...');
  
  for (const data of bookdataData) {
    try {
      const mapping = mappingData.find(m => m.calibre_book_id === data.book_id);
      if (mapping) {
        db.prepare(`
          INSERT OR REPLACE INTO qc_bookdata (
            mapping_id, book_id, page_count, standard_price, purchase_price,
            purchase_date, binding1, binding2, paper1, edge1, edge2, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          mapping.id, data.book_id, data.page_count || 0, data.standard_price || 0,
          data.purchase_price || 0, data.purchase_date, data.binding1 || 0,
          data.binding2 || 0, data.paper1 || 0, data.edge1 || 0, data.edge2 || 0, data.note || ''
        );
      }
    } catch (e) {
      console.log(`   ⚠️ 恢复 bookdata 失败: ${e.message}`);
    }
  }
  console.log(`   ✅ 恢复了 ${bookdataData.length} 条扩展数据`);
  
  for (const data of bookmarksData) {
    try {
      const mapping = mappingData.find(m => m.calibre_book_id === data.book_id);
      if (mapping) {
        db.prepare(`
          INSERT INTO qc_bookmarks (
            mapping_id, user_id, chapter, pos, pos_type, text, note
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          mapping.id, data.user_id || 0, data.chapter, data.pos || 0,
          data.pos_type || 'chapter', data.text, data.note
        );
      }
    } catch (e) {
      console.log(`   ⚠️ 恢复 bookmarks 失败: ${e.message}`);
    }
  }
  console.log(`   ✅ 恢复了 ${bookmarksData.length} 条书摘数据`);
  
  for (const data of readingStateData) {
    try {
      const mapping = mappingData.find(m => m.calibre_book_id === data.book_id);
      if (mapping) {
        db.prepare(`
          INSERT OR REPLACE INTO qc_reading_state (
            mapping_id, user_id, read_status, current_chapter, current_page,
            total_pages, progress, last_read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          mapping.id, data.user_id || 0, data.read_status || '未读', data.current_chapter,
          data.current_page || 0, data.total_pages || 0, data.progress || 0, data.last_read_at
        );
      }
    } catch (e) {
      console.log(`   ⚠️ 恢复 reading_state 失败: ${e.message}`);
    }
  }
  console.log(`   ✅ 恢复了 ${readingStateData.length} 条阅读状态数据`);
  
  for (const data of readingRecordsData) {
    try {
      const mapping = mappingData.find(m => m.calibre_book_id === data.book_id);
      if (mapping) {
        db.prepare(`
          INSERT INTO qc_reading_records (
            mapping_id, user_id, read_date, duration, pages_read, start_page, end_page, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          mapping.id, data.user_id || 0, data.read_date, data.duration || 0,
          data.pages_read || 0, data.start_page || 0, data.end_page || 0, data.notes
        );
      }
    } catch (e) {
      console.log(`   ⚠️ 恢复 reading_records 失败: ${e.message}`);
    }
  }
  console.log(`   ✅ 恢复了 ${readingRecordsData.length} 条阅读记录数据`);
  
  db.pragma('foreign_keys = ON');
  
  console.log('\n✅ 数据库迁移完成！');
  
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
  console.log(`   最终映射数: ${finalCount.count}`);
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  console.error(error);
}

db.close();
