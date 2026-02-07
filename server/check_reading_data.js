import Database from 'better-sqlite3';
import path from 'path';

const talebookDbPath = path.join('d:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
console.log('📂 Talebook数据库路径:', talebookDbPath);

const db = new Database(talebookDbPath, { readonly: true });

console.log('\n🔍 检查阅读记录相关表');

// 检查 reading_records 表
try {
  const recordCount = db.prepare('SELECT COUNT(*) as count FROM reading_records').get();
  console.log('📊 reading_records 表记录数:', recordCount.count);
  
  if (recordCount.count > 0) {
    const recentRecords = db.prepare('SELECT * FROM reading_records ORDER BY start_time DESC LIMIT 5').all();
    console.log('📚 最近5条阅读记录:');
    recentRecords.forEach(r => {
      console.log(`  ID: ${r.id}, 书籍ID: ${r.book_id}, 开始时间: ${r.start_time}, 时长: ${r.duration}秒`);
    });
  }
} catch (error) {
  console.log('⚠️ reading_records 表不存在或查询失败:', error.message);
}

// 检查 reading_state 表
try {
  const stateCount = db.prepare('SELECT COUNT(*) as count FROM reading_state').get();
  console.log('📊 reading_state 表记录数:', stateCount.count);
  
  if (stateCount.count > 0) {
    const states = db.prepare('SELECT * FROM reading_state LIMIT 5').all();
    console.log('📚 前5条阅读状态:');
    states.forEach(s => {
      console.log(`  书籍ID: ${s.book_id}, 收藏: ${s.favorite}, 想读: ${s.wants}, 状态: ${s.read_state}`);
    });
  }
} catch (error) {
  console.log('⚠️ reading_state 表不存在或查询失败:', error.message);
}

// 检查 daily_reading_stats 表
try {
  const statsCount = db.prepare('SELECT COUNT(*) as count FROM daily_reading_stats').get();
  console.log('📊 daily_reading_stats 表记录数:', statsCount.count);
  
  if (statsCount.count > 0) {
    const recentStats = db.prepare('SELECT * FROM daily_reading_stats ORDER BY date DESC LIMIT 5').all();
    console.log('📚 最近5天统计:');
    recentStats.forEach(s => {
      console.log(`  日期: ${s.date}, 阅读时长: ${s.total_reading_time}秒, 阅读页数: ${s.total_pages}`);
    });
  }
} catch (error) {
  console.log('⚠️ daily_reading_stats 表不存在或查询失败:', error.message);
}

db.close();
console.log('\n✅ 检查完成');
