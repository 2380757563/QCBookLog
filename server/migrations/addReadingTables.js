/**
 * 数据迁移脚本
 * 添加阅读目标、阅读热力图、愿望清单数据表
 */

import databaseService from '../services/databaseService.js';

/**
 * 执行迁移
 */
async function migrate() {
  console.log('🚀 开始迁移：添加阅读相关数据表...');

  try {
    if (!databaseService.isTalebookAvailable()) {
      throw new Error('Talebook数据库不可用');
    }

    const db = databaseService.talebookDb;

    // 创建阅读目标表
    console.log('📝 创建阅读目标表 (reading_goals)...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS reading_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL DEFAULT 0,
        year INTEGER NOT NULL,
        target INTEGER NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reader_id, year)
      )
    `);

    // 创建阅读热力图表
    console.log('📝 创建阅读热力图表 (reading_heatmap)...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS reading_heatmap (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        bookmark_count INTEGER DEFAULT 0,
        UNIQUE(reader_id, date)
      )
    `);

    // 创建愿望清单表
    console.log('📝 创建愿望清单表 (wishlist)...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL DEFAULT 0,
        isbn TEXT NOT NULL,
        title TEXT,
        author TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(reader_id, isbn)
      )
    `);

    // 创建索引以提升查询性能
    console.log('📝 创建索引...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reading_goals_reader_year ON reading_goals(reader_id, year);
      CREATE INDEX IF NOT EXISTS idx_reading_heatmap_reader_date ON reading_heatmap(reader_id, date);
      CREATE INDEX IF NOT EXISTS idx_wishlist_reader_isbn ON wishlist(reader_id, isbn);
    `);

    console.log('✅ 数据迁移完成！');
    console.log('📊 已创建的表：');
    console.log('   - reading_goals (阅读目标)');
    console.log('   - reading_heatmap (阅读热力图)');
    console.log('   - wishlist (愿望清单)');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('🎉 迁移成功完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

export default migrate;
