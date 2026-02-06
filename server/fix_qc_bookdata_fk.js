import databaseService from './services/databaseService.js';

async function fixQcBookDataForeignKey() {
  try {
    console.log('=== 修复 qc_bookdata 表外键问题 ===\n');

    // 先禁用外键约束，方便修改
    databaseService.talebookDb.pragma('foreign_keys = OFF');
    console.log('外键约束已禁用');

    // 1. 检查当前表结构
    console.log('\n1. 检查当前表结构...');
    const tableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(qc_bookdata)').all();
    console.log('当前表结构:');
    tableInfo.forEach(col => {
      console.log(`  ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    // 2. 检查items表的主键
    console.log('\n2. 检查 items 表主键...');
    const itemsTableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(items)').all();
    const primaryKeyColumn = itemsTableInfo.find(col => col.pk === 1);
    console.log(`items 表主键: ${primaryKeyColumn ? primaryKeyColumn.name : '未找到'}`);

    // 3. 备份并重建 qc_bookdata 表
    console.log('\n3. 重建 qc_bookdata 表...');

    // 重命名旧表
    databaseService.talebookDb.prepare('ALTER TABLE qc_bookdata RENAME TO qc_bookdata_old').run();
    console.log('已重命名旧表为 qc_bookdata_old');

    // 创建新表，使用正确的外键引用
    databaseService.talebookDb.prepare(`
      CREATE TABLE qc_bookdata (
        book_id INTEGER PRIMARY KEY,
        page_count INTEGER DEFAULT 0,
        standard_price REAL DEFAULT 0,
        purchase_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).run();
    console.log('已创建新表');

    // 迁移数据
    databaseService.talebookDb.prepare(`
      INSERT INTO qc_bookdata (book_id, page_count, standard_price, purchase_date, created_at, updated_at)
      SELECT book_id, page_count, standard_price, purchase_date, COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
      FROM qc_bookdata_old
    `).run();
    console.log('已迁移数据');

    // 删除旧表
    databaseService.talebookDb.prepare('DROP TABLE qc_bookdata_old').run();
    console.log('已删除旧表');

    // 4. 为更新时间添加触发器
    console.log('\n4. 创建更新时间触发器...');
    databaseService.talebookDb.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_qc_bookdata_updated_at
      AFTER UPDATE ON qc_bookdata
      FOR EACH ROW
      BEGIN
        UPDATE qc_bookdata SET updated_at = CURRENT_TIMESTAMP WHERE book_id = NEW.book_id;
      END
    `).run();
    console.log('已创建更新时间触发器');

    // 5. 重新启用外键约束
    databaseService.talebookDb.pragma('foreign_keys = ON');
    console.log('\n外键约束已重新启用');

    // 6. 验证修复结果
    console.log('\n=== 修复结果验证 ===');

    const newTableInfo = databaseService.talebookDb.prepare('PRAGMA table_info(qc_bookdata)').all();
    console.log('\n新表结构:');
    newTableInfo.forEach(col => {
      console.log(`  ${col.name} (${col.type}) ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    const foreignKeys = databaseService.talebookDb.prepare('PRAGMA foreign_key_list(qc_bookdata)').all();
    console.log('\n外键列表:');
    if (foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`  ${fk.from} -> ${fk.table}.${fk.to}`);
      });
    } else {
      console.log('  无外键');
    }

    // 检查记录数
    const count = databaseService.talebookDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata').get().count;
    console.log(`\n表记录数: ${count}`);

    console.log('\n=== 修复完成 ===');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    throw error;
  }
}

fixQcBookDataForeignKey();
