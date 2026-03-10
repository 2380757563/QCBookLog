const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = '/app/data/qc_booklog.db';

console.log('🔄 开始创建用户设置和图片表...');

const db = new Database(DB_PATH);

try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('📝 创建用户设置表 (qc_user_settings)...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS qc_user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT NOT NULL DEFAULT 'string',
      priority TEXT NOT NULL DEFAULT 'high',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, setting_key)
    )
  `);
  console.log('  ✅ qc_user_settings 表创建成功');

  console.log('📝 创建用户图片表 (qc_user_images)...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS qc_user_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 0,
      image_type TEXT NOT NULL,
      image_data TEXT NOT NULL,
      image_name TEXT,
      image_size INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('  ✅ qc_user_images 表创建成功');

  console.log('🎉 用户设置和图片表创建完成!');

  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ 创建表失败:', error);
  db.close();
  process.exit(1);
}
