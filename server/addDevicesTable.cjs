const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');

console.log('=== 添加 devices 表到 Talebook 数据库 ===\n');

if (!fs.existsSync(TALEBOOK_DB_PATH)) {
  console.log('❌ Talebook 数据库文件不存在:', TALEBOOK_DB_PATH);
  process.exit(1);
}

const db = new Database(TALEBOOK_DB_PATH);

try {
  db.pragma('journal_mode = WAL');
  
  const existingTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='devices'").get();
  
  if (existingTable) {
    console.log('✅ devices 表已存在');
    
    const columns = db.prepare('PRAGMA table_info(devices)').all();
    console.log('  字段列表:', columns.map(c => c.name).join(', '));
  } else {
    console.log('📝 创建 devices 表...');
    
    db.exec(`
      CREATE TABLE devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL DEFAULT 0,
        device_name VARCHAR(200) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'unknown',
        device_id VARCHAR(255),
        last_access DATETIME,
        user_agent TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE CASCADE
      )
    `);
    
    db.exec('CREATE INDEX IF NOT EXISTS idx_devices_reader_id ON devices(reader_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_devices_last_access ON devices(last_access)');
    
    console.log('✅ devices 表创建成功');
    
    const columns = db.prepare('PRAGMA table_info(devices)').all();
    console.log('  字段列表:', columns.map(c => c.name).join(', '));
  }
  
  console.log('\n=== 验证结果 ===\n');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`Talebook 数据库共有 ${tables.length} 个表:`);
  tables.forEach(t => console.log(`  - ${t.name}`));
  
} catch (error) {
  console.error('❌ 操作失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}

console.log('\n✅ 完成');
