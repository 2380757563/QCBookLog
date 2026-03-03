import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data', 'qc_booklog.db');
console.log('Database path:', dbPath);

async function fixQcBooklogDatabase() {
  console.log('🔧 开始修复 QCBookLog 数据库结构...\n');

  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');

    console.log('📋 检查并修复 qc_reading_records 表...');
    const recordsColumns = db.prepare('PRAGMA table_info(qc_reading_records)').all();
    const recordsColumnNames = recordsColumns.map(c => c.name);
    console.log(`  当前字段: ${recordsColumnNames.join(', ')}`);
    
    const recordsFieldsToAdd = [
      { name: 'user_id', sql: 'ALTER TABLE qc_reading_records ADD COLUMN user_id INTEGER DEFAULT 0' },
      { name: 'reader_id', sql: 'ALTER TABLE qc_reading_records ADD COLUMN reader_id INTEGER DEFAULT 0' },
      { name: 'start_time', sql: 'ALTER TABLE qc_reading_records ADD COLUMN start_time DATETIME' },
      { name: 'end_time', sql: 'ALTER TABLE qc_reading_records ADD COLUMN end_time DATETIME' },
      { name: 'start_page', sql: 'ALTER TABLE qc_reading_records ADD COLUMN start_page INTEGER DEFAULT 0' },
      { name: 'end_page', sql: 'ALTER TABLE qc_reading_records ADD COLUMN end_page INTEGER DEFAULT 0' },
      { name: 'pages_read', sql: 'ALTER TABLE qc_reading_records ADD COLUMN pages_read INTEGER DEFAULT 0' },
      { name: 'notes', sql: 'ALTER TABLE qc_reading_records ADD COLUMN notes TEXT' },
      { name: 'created_at', sql: 'ALTER TABLE qc_reading_records ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    for (const field of recordsFieldsToAdd) {
      if (!recordsColumnNames.includes(field.name)) {
        try {
          db.exec(field.sql);
          console.log(`  ✅ 添加字段: ${field.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            console.warn(`  ⚠️ 添加字段 ${field.name} 失败:`, e.message);
          }
        }
      }
    }

    console.log('\n📋 检查并修复 qc_daily_reading_stats 表...');
    const statsColumns = db.prepare('PRAGMA table_info(qc_daily_reading_stats)').all();
    const statsColumnNames = statsColumns.map(c => c.name);
    console.log(`  当前字段: ${statsColumnNames.join(', ')}`);
    
    const statsFieldsToAdd = [
      { name: 'reader_id', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN reader_id INTEGER DEFAULT 0' },
      { name: 'stat_date', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN stat_date DATE' },
      { name: 'date', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN date DATE' },
      { name: 'total_reading_time', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN total_reading_time INTEGER DEFAULT 0' },
      { name: 'total_time', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN total_time INTEGER DEFAULT 0' },
      { name: 'total_pages_read', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN total_pages_read INTEGER DEFAULT 0' },
      { name: 'total_pages', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN total_pages INTEGER DEFAULT 0' },
      { name: 'books_read_count', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN books_read_count INTEGER DEFAULT 0' },
      { name: 'total_books', sql: 'ALTER TABLE qc_daily_reading_stats ADD COLUMN total_books INTEGER DEFAULT 0' }
    ];
    
    for (const field of statsFieldsToAdd) {
      if (!statsColumnNames.includes(field.name)) {
        try {
          db.exec(field.sql);
          console.log(`  ✅ 添加字段: ${field.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            console.warn(`  ⚠️ 添加字段 ${field.name} 失败:`, e.message);
          }
        }
      }
    }

    console.log('\n📋 检查并修复 qc_reading_goals 表...');
    const goalsColumns = db.prepare('PRAGMA table_info(qc_reading_goals)').all();
    const goalsColumnNames = goalsColumns.map(c => c.name);
    console.log(`  当前字段: ${goalsColumnNames.join(', ')}`);
    
    const goalsFieldsToAdd = [
      { name: 'reader_id', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN reader_id INTEGER DEFAULT 0' },
      { name: 'year', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN year INTEGER' },
      { name: 'goal_type', sql: "ALTER TABLE qc_reading_goals ADD COLUMN goal_type VARCHAR(20) DEFAULT 'yearly'" },
      { name: 'target', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN target INTEGER DEFAULT 0' },
      { name: 'target_value', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN target_value INTEGER DEFAULT 0' },
      { name: 'completed', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN completed INTEGER DEFAULT 0' },
      { name: 'current_value', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN current_value INTEGER DEFAULT 0' },
      { name: 'start_date', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN start_date DATE' },
      { name: 'end_date', sql: 'ALTER TABLE qc_reading_goals ADD COLUMN end_date DATE' },
      { name: 'status', sql: "ALTER TABLE qc_reading_goals ADD COLUMN status VARCHAR(20) DEFAULT 'active'" }
    ];
    
    for (const field of goalsFieldsToAdd) {
      if (!goalsColumnNames.includes(field.name)) {
        try {
          db.exec(field.sql);
          console.log(`  ✅ 添加字段: ${field.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            console.warn(`  ⚠️ 添加字段 ${field.name} 失败:`, e.message);
          }
        }
      }
    }

    console.log('\n📋 检查并修复 qc_users 表...');
    const usersColumns = db.prepare('PRAGMA table_info(qc_users)').all();
    const usersColumnNames = usersColumns.map(c => c.name);
    
    const usersFieldsToAdd = [
      { name: 'display_name', sql: 'ALTER TABLE qc_users ADD COLUMN display_name VARCHAR(100)' },
      { name: 'name', sql: 'ALTER TABLE qc_users ADD COLUMN name VARCHAR(100)' },
      { name: 'avatar_url', sql: 'ALTER TABLE qc_users ADD COLUMN avatar_url VARCHAR(255)' },
      { name: 'avatar', sql: 'ALTER TABLE qc_users ADD COLUMN avatar VARCHAR(255)' },
      { name: 'admin', sql: 'ALTER TABLE qc_users ADD COLUMN admin INTEGER DEFAULT 0' },
      { name: 'active', sql: 'ALTER TABLE qc_users ADD COLUMN active INTEGER DEFAULT 1' },
      { name: 'note', sql: 'ALTER TABLE qc_users ADD COLUMN note TEXT' }
    ];
    
    for (const field of usersFieldsToAdd) {
      if (!usersColumnNames.includes(field.name)) {
        try {
          db.exec(field.sql);
          console.log(`  ✅ 添加字段: ${field.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            console.warn(`  ⚠️ 添加字段 ${field.name} 失败:`, e.message);
          }
        }
      }
    }

    console.log('\n📋 检查并修复 qc_wishlist 表...');
    const wishlistColumns = db.prepare('PRAGMA table_info(qc_wishlist)').all();
    const wishlistColumnNames = wishlistColumns.map(c => c.name);
    
    const wishlistFieldsToAdd = [
      { name: 'reader_id', sql: 'ALTER TABLE qc_wishlist ADD COLUMN reader_id INTEGER DEFAULT 0' }
    ];
    
    for (const field of wishlistFieldsToAdd) {
      if (!wishlistColumnNames.includes(field.name)) {
        try {
          db.exec(field.sql);
          console.log(`  ✅ 添加字段: ${field.name}`);
        } catch (e) {
          if (!e.message.includes('duplicate column')) {
            console.warn(`  ⚠️ 添加字段 ${field.name} 失败:`, e.message);
          }
        }
      }
    }

    console.log('\n📋 检查并创建缺失的索引...');
    const indexesToCreate = [
      { name: 'idx_qc_users_username', sql: 'CREATE INDEX IF NOT EXISTS idx_qc_users_username ON qc_users(username)' },
      { name: 'idx_qc_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_qc_users_email ON qc_users(email)' },
      { name: 'idx_reading_book_user', sql: 'CREATE INDEX IF NOT EXISTS idx_reading_book_user ON qc_reading_records(book_id, user_id)' },
      { name: 'idx_reading_user_date', sql: 'CREATE INDEX IF NOT EXISTS idx_reading_user_date ON qc_reading_records(user_id, start_time)' },
      { name: 'idx_daily_stats_user_date', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON qc_daily_reading_stats(user_id, stat_date)' },
      { name: 'idx_daily_stats_reader_date', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_stats_reader_date ON qc_daily_reading_stats(reader_id, date)' },
      { name: 'idx_reading_goals_user_year', sql: 'CREATE INDEX IF NOT EXISTS idx_reading_goals_user_year ON qc_reading_goals(user_id, year)' },
      { name: 'idx_reading_goals_reader_year', sql: 'CREATE INDEX IF NOT EXISTS idx_reading_goals_reader_year ON qc_reading_goals(reader_id, year)' },
      { name: 'idx_wishlist_reader_id', sql: 'CREATE INDEX IF NOT EXISTS idx_wishlist_reader_id ON qc_wishlist(reader_id)' }
    ];
    
    for (const idx of indexesToCreate) {
      try {
        db.exec(idx.sql);
        console.log(`  ✅ 创建索引: ${idx.name}`);
      } catch (e) {
        console.warn(`  ⚠️ 创建索引 ${idx.name} 失败:`, e.message);
      }
    }

    db.pragma('foreign_keys = ON');

    console.log('\n✅ QCBookLog 数据库结构修复完成!');
    
    console.log('\n📊 数据库表结构验证:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qc_%' ORDER BY name").all();
    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`  ${table.name}: ${columns.length} 个字段`);
    }

    db.close();
    return true;
  } catch (error) {
    console.error('❌ 修复数据库失败:', error);
    return false;
  }
}

fixQcBooklogDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
