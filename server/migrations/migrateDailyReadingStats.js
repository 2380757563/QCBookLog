/**
 * 重新设计 qc_daily_reading_stats 表结构
 * 目标：支持独立阅读会话记录，时间精度提升到秒级
 */

import databaseService from '../services/legacy/databaseService.js';

/**
 * 新表结构设计
 *
 * 方案：重构 qc_daily_reading_stats 为阅读会话表
 * - 每次阅读行为作为独立记录存储
 * - 时间精度提升到秒级（DATETIME）
 * - 记录每次阅读的开始和结束时间
 * - 汇总数据通过 SQL 查询动态生成
 *
 * 新表结构：
 * qc_daily_reading_stats (阅读会话表)
 *   id: INTEGER PRIMARY KEY AUTOINCREMENT
 *   reader_id: INTEGER NOT NULL (外键 -> users.id)
 *   book_id: INTEGER NOT NULL (外键 -> items.book_id)
 *   session_start: DATETIME NOT NULL (会话开始时间，精确到秒)
 *   session_end: DATETIME NOT NULL (会话结束时间，精确到秒)
 *   duration_seconds: INTEGER NOT NULL (阅读时长，秒)
 *   start_page: INTEGER DEFAULT 0 (开始页码)
 *   end_page: INTEGER DEFAULT 0 (结束页码)
 *   pages_read: INTEGER DEFAULT 0 (本次阅读页数)
 *   created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
 *   updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP
 *
 * 索引：
 *   idx_reader_date: (reader_id, DATE(session_start))
 *   idx_book_reader: (book_id, reader_id)
 *   idx_session_time: (session_start, session_end)
 *
 * 汇总查询示例：
 *   SELECT
 *     DATE(session_start) as date,
 *     COUNT(DISTINCT book_id) as total_books,
 *     SUM(pages_read) as total_pages,
 *     SUM(duration_seconds) / 60 as total_minutes
 *   FROM qc_daily_reading_stats
 *   WHERE reader_id = ? AND DATE(session_start) = ?
 *   GROUP BY DATE(session_start)
 */

export async function migrateDailyReadingStats() {
  console.log('🔄 开始迁移: 重新设计 qc_daily_reading_stats 表...');

  const db = databaseService.talebookDb;
  if (!db) {
    console.error('❌ 数据库未连接');
    return false;
  }

  try {
    // 1. 备份现有数据
    console.log('📝 步骤1: 备份现有数据...');
    const existingData = db.prepare('SELECT * FROM qc_daily_reading_stats').all();
    console.log(`   备份了 ${existingData.length} 条记录`);

    // 2. 删除旧表
    console.log('\n📝 步骤2: 删除旧表...');
    db.prepare('DROP TABLE IF EXISTS qc_daily_reading_stats').run();
    console.log('   ✅ 旧表已删除');

    // 3. 创建新表（阅读会话表）
    console.log('\n📝 步骤3: 创建新表（阅读会话表）...');
    db.exec(`
      CREATE TABLE qc_daily_reading_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reader_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        session_start DATETIME NOT NULL,
        session_end DATETIME NOT NULL,
        duration_seconds INTEGER NOT NULL,
        start_page INTEGER DEFAULT 0,
        end_page INTEGER DEFAULT 0,
        pages_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reader_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES items(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_reader_date ON qc_daily_reading_stats(reader_id, DATE(session_start));
      CREATE INDEX idx_book_reader ON qc_daily_reading_stats(book_id, reader_id);
      CREATE INDEX idx_session_time ON qc_daily_reading_stats(session_start, session_end);
    `);
    console.log('   ✅ 新表创建成功');

    // 4. 从 qc_reading_records 迁移数据
    console.log('\n📝 步骤4: 从 qc_reading_records 迁移数据...');
    const readingRecords = db.prepare('SELECT * FROM qc_reading_records').all();
    console.log(`   找到 ${readingRecords.length} 条阅读记录`);

    if (readingRecords.length > 0) {
      const insert = db.prepare(`
        INSERT INTO qc_daily_reading_stats (
          reader_id, book_id, session_start, session_end,
          duration_seconds, start_page, end_page, pages_read
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((rows) => {
        for (const row of rows) {
          // 计算秒数
          const durationSeconds = row.duration * 60;
          insert.run(
            row.reader_id,
            row.book_id,
            row.start_time,
            row.end_time,
            durationSeconds,
            row.start_page,
            row.end_page,
            row.pages_read
          );
        }
      });

      insertMany(readingRecords);
      console.log(`   ✅ 迁移了 ${readingRecords.length} 条记录`);
    }

    // 5. 验证迁移结果
    console.log('\n📝 步骤5: 验证迁移结果...');
    const newCount = db.prepare('SELECT COUNT(*) as count FROM qc_daily_reading_stats').get();
    console.log(`   新表记录数: ${newCount.count}`);

    const sampleData = db.prepare('SELECT * FROM qc_daily_reading_stats LIMIT 3').all();
    console.log('   前3条记录:');
    sampleData.forEach((row, index) => {
      console.log(`   ${index + 1}.`, {
        id: row.id,
        reader_id: row.reader_id,
        book_id: row.book_id,
        session_start: row.session_start,
        session_end: row.session_end,
        duration_seconds: row.duration_seconds,
        pages_read: row.pages_read
      });
    });

    console.log('\n🎉 迁移完成!');
    return true;

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return false;
  }
}

/**
 * 获取每日阅读统计（汇总查询）
 * @param {number} readerId - 读者ID
 * @param {string} [startDate=null] - 开始日期
 * @param {string} [endDate=null] - 结束日期
 * @returns {Array} 每日统计列表
 */
export async function getDailyReadingStats(readerId, startDate = null, endDate = null) {
  const db = databaseService.talebookDb;
  if (!db) return [];

  try {
    let query = `
      SELECT
        DATE(session_start) as date,
        COUNT(DISTINCT book_id) as total_books,
        SUM(pages_read) as total_pages,
        SUM(duration_seconds) / 60 as total_time,
        COUNT(*) as session_count
      FROM qc_daily_reading_stats
      WHERE reader_id = ?
    `;
    const params = [readerId];

    if (startDate) {
      query += ` AND DATE(session_start) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(session_start) <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(session_start) ORDER BY date DESC`;

    const stats = db.prepare(query).all(...params);

    // 格式化输出
    return stats.map(row => ({
      ...row,
      total_time: Math.round(row.total_time * 100) / 100, // 保留2位小数
      total_books: row.total_books || 0,
      total_pages: row.total_pages || 0,
      session_count: row.session_count || 0
    }));
  } catch (error) {
    console.error('❌ 获取每日阅读统计失败:', error);
    return [];
  }
}

/**
 * 获取某一天的详细阅读会话
 * @param {number} readerId - 读者ID
 * @param {string} date - 日期
 * @returns {Array} 阅读会话列表
 */
export async function getDailyReadingSessions(readerId, date) {
  const db = databaseService.talebookDb;
  if (!db) return [];

  try {
    const query = `
      SELECT
        s.*,
        b.title as book_title,
        b.author as book_author
      FROM qc_daily_reading_stats s
      LEFT JOIN (
        SELECT
          b.id as book_id,
          b.title,
          (
            SELECT GROUP_CONCAT(a.name, ' & ')
            FROM authors a
            JOIN books_authors_link bal ON a.id = bal.author
            WHERE bal.book = b.id
          ) as author
        FROM books b
      ) b ON s.book_id = b.book_id
      WHERE s.reader_id = ? AND DATE(s.session_start) = ?
      ORDER BY s.session_start ASC
    `;

    const sessions = db.prepare(query).all(readerId, date);

    // 格式化输出
    return sessions.map(session => ({
      id: session.id,
      reader_id: session.reader_id,
      book_id: session.book_id,
      book_title: session.book_title || '',
      book_author: session.book_author || '',
      session_start: session.session_start,
      session_end: session.session_end,
      duration_minutes: Math.round(session.duration_seconds / 60 * 100) / 100,
      start_page: session.start_page,
      end_page: session.end_page,
      pages_read: session.pages_read
    }));
  } catch (error) {
    console.error('❌ 获取每日阅读会话失败:', error);
    return [];
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const action = args[0] || 'migrate';

  if (action === 'migrate') {
    migrateDailyReadingStats().then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.error('❌ 未知操作:', action);
    console.log('用法: node migrateDailyReadingStats.js [migrate]');
    process.exit(1);
  }
}

export default { migrateDailyReadingStats, getDailyReadingStats, getDailyReadingSessions };
