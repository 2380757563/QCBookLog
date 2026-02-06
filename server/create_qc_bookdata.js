                  啊啊啊咋爱儿童【998711                        import databaseService from './services/databaseService.js';

async function createQcBookDataTable() {
  try {
    console.log('=== 创建qc_bookdata表 ===');
    
    // 1. 在Talebook数据库中创建qc_bookdata表
    databaseService.talebookDb.prepare(`
      CREATE TABLE IF NOT EXISTS qc_bookdata (
        book_id INTEGER PRIMARY KEY,
        page_count INTEGER,
        standard_price REAL DEFAULT 0,
        purchase_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).run();
    console.log('✅ qc_bookdata表创建成功');
    
    // 2. 为更新时间添加触发器
    databaseService.talebookDb.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_qc_bookdata_updated_at
      AFTER UPDATE ON qc_bookdata
      FOR EACH ROW
      BEGIN
        UPDATE qc_bookdata SET updated_at = CURRENT_TIMESTAMP WHERE book_id = NEW.book_id;
      END
    `).run();
    console.log('✅ 更新时间触发器创建成功');
    
    // 3. 检查是否需要初始化数据
    const count = databaseService.talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
    console.log(`\nqc_bookdata表当前记录数: ${count}`);
    
    // 如果表为空，尝试初始化数据
    if (count === 0) {
      console.log('\n=== 初始化qc_bookdata表数据 ===');

      // 获取所有书籍ID
      const items = databaseService.talebookDb.prepare('SELECT book_id as id FROM items').all();
      console.log(`找到 ${items.length} 本书籍需要初始化`);
      
      // 批量插入初始数据
      const insertStmt = databaseService.talebookDb.prepare(`
        INSERT OR IGNORE INTO qc_bookdata (book_id, purchase_date)
        VALUES (?, CURRENT_TIMESTAMP)
      `);
      
      const transaction = databaseService.talebookDb.transaction((books) => {
        for (const book of books) {
          insertStmt.run(book.book_id);
        }
      });
      
      transaction(items);
      console.log(`✅ 初始化完成，添加了 ${items.length} 条记录`);
    }
    
    console.log('\n=== qc_bookdata表创建和初始化完成 ===');
    
  } catch (error) {
    console.error('❌ 创建qc_bookdata表失败:', error.message);
    throw error;
  }
}

createQcBookDataTable();
