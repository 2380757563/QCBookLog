const Database = require('better-sqlite3');

const db = new Database('/app/data/qc_booklog.db');

try {
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

  console.log('Tables created successfully');
  db.close();
  process.exit(0);
} catch (error) {
  console.error('Error creating tables:', error);
  db.close();
  process.exit(1);
}
