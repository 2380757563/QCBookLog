/**
 * 阅读模拟数据种子脚本
 *
 * 用途：向 QCBookLog 写入一批可读性良好的模拟阅读数据，让前端的
 *       年度报告、书籍列表阅读状态、阅读进度、热力图等模块有内容可展示。
 *
 * 写入范围（5 张表）：
 *   1. qc_reading_records      阅读会话明细（时长 / 起止页 / 页数）
 *   2. qc_reading_state        已读 / 在读 / 未读 + 阅读进度
 *   3. qc_bookdata             书级累计（总时长 / 总页数 / 阅读次数）
 *   4. qc_daily_reading_stats  按日汇总（2025 / 2026）
 *   5. qc_reading_goals        年度阅读目标
 *
 * 幂等性：全程单事务；会话记录以 notes = '[seed]' 为标记，可重复执行不叠加，
 *         其余表按主键 UPSERT。
 *
 * 用法（在容器内执行）：
 *   docker exec qc-booklog-backend-dev node /app/scripts/seedReadingData.js
 * 清理（仅删除本脚本写入的会话记录）：
 *   docker exec qc-booklog-backend-dev node /app/scripts/seedReadingData.js --clean
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.QC_DB_PATH || '/app/data/qc_booklog.db';

/** 用户 / 读者标识：当前库中均为 0（qc_users 仅有 user_0） */
const USER_ID = 0;
const READER_ID = 0;

/** 模拟数据覆盖的时间跨度 */
const YEARS = [2025, 2026];

/** 参与模拟的书籍数量（按 book_id 升序取前 N 本有页数的书） */
const BOOK_LIMIT = 40;

/** 会话记录的标记：清理时以此为唯一依据，不会误删真实数据 */
const SEED_TAG = '[seed]';

/**
 * 当前图书馆 UUID。
 * 阅读状态查询会带上该条件（qc_book_mapping.library_uuid），
 * 若写错映射，前端书籍列表读不到状态，因此这里在运行时从库中动态解析，
 * 只有解析失败时才回退到默认值。
 */
const DEFAULT_LIBRARY_UUID = 'c05c0b62-d1fc-45e7-9a33-dc562966d397';
let LIBRARY_UUID = DEFAULT_LIBRARY_UUID;

/** 从映射表中解析出「映射条数最多的那个 library_uuid」作为当前图书馆 */
const resolveLibraryUuid = (db) => {
  const row = db
    .prepare(
      `SELECT library_uuid FROM qc_book_mapping
       GROUP BY library_uuid
       ORDER BY COUNT(*) DESC
       LIMIT 1`
    )
    .get();
  return row?.library_uuid || DEFAULT_LIBRARY_UUID;
};

/**
 * 固定种子的伪随机数生成器（mulberry32）
 * 目的：每次执行生成的数据完全一致，便于复现与对比。
 */
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = createRandom(20260922);

/** [min, max] 闭区间随机整数 */
const randInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;

/** 从数组中随机取一项 */
const pick = (list) => list[randInt(0, list.length - 1)];

/** 补零到两位 */
const pad2 = (n) => String(n).padStart(2, '0');

/** 格式化为 SQLite strftime 可解析的 'YYYY-MM-DD HH:MM:SS' */
const formatDateTime = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

/** 格式化为 'YYYY-MM-DD' */
const formatDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/**
 * 生成某年内的一个随机阅读时刻。
 * 刻意避开凌晨时段，让热力图与「阅读时段」类统计更贴近真实作息。
 */
const randomMomentInYear = (year) => {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year, 11, 31, 23, 59, 59).getTime();
  const date = new Date(start + Math.floor(random() * (end - start)));
  // 阅读时间集中在 7:00 ~ 22:59
  date.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59), 0);
  return date;
};

/**
 * 读取待模拟的书籍清单：取有页数、且在「当前图书馆」下有映射的书。
 * 必须带 mapping_id，否则 qc_reading_state 无法写入（该表以 mapping_id 唯一约束）；
 * 也必须限定当前 library_uuid，否则前端书籍列表按 UUID 过滤后读不到状态。
 */
const loadTargetBooks = (db) => {
  const rows = db
    .prepare(
      `SELECT bd.book_id, bd.page_count, m.id AS mapping_id
       FROM qc_bookdata bd
       JOIN qc_book_mapping m ON m.id = bd.mapping_id
       WHERE bd.book_id > 0 AND bd.page_count > 0
         AND m.library_uuid = ?
       ORDER BY bd.book_id
       LIMIT ?`
    )
    .all(LIBRARY_UUID, BOOK_LIMIT);
  return rows;
};

/**
 * 为单本书生成阅读会话列表。
 *
 * 会话规模按目标状态递减，模拟真实阅读行为：
 *   - 已读：8 ~ 18 次会话，最后一次刚好读到末页
 *   - 在读：3 ~ 8 次会话，页数推进到中途
 *   - 未读：0 次会话
 *
 * 关键约束：单次会话的页数与时长必须匹配（约 0.4 ~ 1.2 页/分钟，
 * 即 60 分钟读 25 ~ 70 页）。早期版本先随意取 10~45 页、事后把「已读」的
 * 末次会话硬补齐到总页数，结果像 1606 页的书会凭空出现「87 分钟读 1433 页」
 * 这种失真记录，热力图与阅读效率类统计都不好看。
 */
const buildSessions = (book, readState, targetPage, totalPages) => {
  const sessions = [];
  if (readState === 0 || totalPages <= 0 || targetPage <= 0) return sessions;

  const count = readState === 2 ? randInt(8, 18) : randInt(3, 8);
  // 把目标页数均分给各次会话，再对每段做轻微抖动，既保证刚好收尾又避免过于机械
  const baseStep = targetPage / count;
  let cursor = 0;

  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    // 抖动幅度 ±30%，但至少 3 页
    const jitter = Math.max(3, Math.round(baseStep * 0.3));
    let step = isLast
      ? targetPage - cursor
      : Math.round(baseStep + (random() * 2 - 1) * jitter);

    // 保证本次不越界，且为后续会话留出至少 1 页
    const remaining = targetPage - cursor;
    if (!isLast) step = Math.min(step, Math.max(1, remaining - (count - i - 1)));
    step = Math.max(1, Math.min(step, remaining));
    if (step <= 0) break;

    const startPage = cursor;
    const endPage = cursor + step;

    // 时长按阅读速度反推：每分钟 0.4 ~ 1.2 页，再夹到 10 ~ 180 分钟
    const pagesPerMinute = 0.4 + random() * 0.8;
    const duration = Math.min(180, Math.max(10, Math.round(step / pagesPerMinute)));

    const moment = randomMomentInYear(pick(YEARS));
    const endMoment = new Date(moment.getTime() + duration * 60 * 1000);

    sessions.push({
      bookId: book.book_id,
      startTime: formatDateTime(moment),
      endTime: formatDateTime(endMoment),
      duration,
      startPage,
      endPage,
      pagesRead: step,
      statDate: formatDate(moment)
    });

    cursor = endPage;
    if (cursor >= targetPage) break;
  }

  return sessions;
};

/** 删除本脚本此前写入的会话记录（幂等前提） */
const cleanSeedSessions = (db) => {
  const info = db.prepare('DELETE FROM qc_reading_records WHERE notes = ?').run(SEED_TAG);
  return info.changes;
};

/**
 * 主流程：单事务写入 5 张表。
 */
const seed = () => {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');

  // 必须在读取书籍前解析：loadTargetBooks 会用它过滤映射
  LIBRARY_UUID = resolveLibraryUuid(db);
  console.log(`📚 当前图书馆 UUID: ${LIBRARY_UUID}`);

  const summary = {
    sessions: 0,
    states: 0,
    bookData: 0,
    dailyStats: 0,
    goals: 0,
    stateDistribution: { unread: 0, reading: 0, read: 0 }
  };

  const books = loadTargetBooks(db);
  if (!books.length) {
    console.error('❌ 未找到可用书籍（需 book_id > 0、page_count > 0 且 mapping_id 非空）');
    db.close();
    process.exit(1);
  }

  // 预生成全部数据，再统一落库：避免在事务里做随机计算，便于排查
  const plan = books.map((book, index) => {
    const totalPages = book.page_count;
    // 间隔取样分配状态：每 10 本中约 6 本已读、2~3 本在读、1~2 本未读
    const bucket = index % 10;
    let readState;
    if (bucket < 6) readState = 2;
    else if (bucket < 9) readState = 1;
    else readState = 0;

    let targetPage = 0;
    if (readState === 2) targetPage = totalPages;
    else if (readState === 1) targetPage = Math.max(1, Math.round(totalPages * (randInt(10, 90) / 100)));

    return {
      book,
      readState,
      totalPages,
      targetPage,
      sessions: buildSessions(book, readState, targetPage, totalPages)
    };
  });

  const insertSession = db.prepare(
    `INSERT INTO qc_reading_records
       (book_id, user_id, reader_id, start_time, end_time, duration, start_page, end_page, pages_read, notes)
     VALUES (@bookId, @userId, @readerId, @startTime, @endTime, @duration, @startPage, @endPage, @pagesRead, @notes)`
  );

  const upsertState = db.prepare(
    `INSERT INTO qc_reading_state
       (mapping_id, book_id, user_id, reader_id, read_state, read_status,
        current_page, total_pages, progress_percent, read_date, last_read_time, updated_at)
     VALUES (@mappingId, @bookId, @userId, @readerId, @readState, @readStatus,
        @currentPage, @totalPages, @progressPercent, @readDate, @lastReadTime, CURRENT_TIMESTAMP)
     ON CONFLICT(mapping_id) DO UPDATE SET
       book_id = excluded.book_id,
       read_state = excluded.read_state,
       read_status = excluded.read_status,
       current_page = excluded.current_page,
       total_pages = excluded.total_pages,
       progress_percent = excluded.progress_percent,
       read_date = excluded.read_date,
       last_read_time = excluded.last_read_time,
       updated_at = CURRENT_TIMESTAMP`
  );

  const upsertBookData = db.prepare(
    `UPDATE qc_bookdata
     SET total_reading_time = @totalReadingTime,
         read_pages = @readPages,
         reading_count = @readingCount,
         last_read_date = @lastReadDate,
         last_read_duration = @lastReadDuration,
         updated_at = CURRENT_TIMESTAMP
     WHERE book_id = @bookId`
  );

  const upsertDaily = db.prepare(
    `INSERT INTO qc_daily_reading_stats
       (user_id, reader_id, stat_date, date, total_reading_time, total_time,
        total_pages_read, total_pages, books_read_count, total_books, updated_at)
     VALUES (@userId, @readerId, @statDate, @statDate, @minutes, @minutes,
        @pages, @pages, @books, @books, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, stat_date) DO UPDATE SET
       total_reading_time = excluded.total_reading_time,
       total_time = excluded.total_time,
       total_pages_read = excluded.total_pages_read,
       total_pages = excluded.total_pages,
       books_read_count = excluded.books_read_count,
       total_books = excluded.total_books,
       updated_at = CURRENT_TIMESTAMP`
  );

  const upsertGoal = db.prepare(
    `INSERT INTO qc_reading_goals
       (user_id, reader_id, year, goal_type, target, target_value, completed, current_value,
        start_date, status, updated_at)
     VALUES (@userId, @readerId, @year, 'yearly', @target, @target, @completed, @currentValue,
        @startDate, 'active', CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, year) DO UPDATE SET
       target_value = excluded.target_value,
       completed = excluded.completed,
       current_value = excluded.current_value,
       updated_at = CURRENT_TIMESTAMP`
  );

  const runSeed = db.transaction(() => {
    const removed = cleanSeedSessions(db);
    if (removed > 0) console.log(`🧹 已清除旧种子会话 ${removed} 条`);

    // 1 + 2 + 3：会话明细、阅读状态、书级累计
    // 顺带回填 qc_reading_state.book_id：历史迁移遗留的行该列为 NULL，
    // 虽然读取走 JOIN qc_book_mapping 不依赖它，但留着会影响「按 book_id 直查」的场景。
    const backfilled = db
      .prepare(
        `UPDATE qc_reading_state
         SET book_id = (SELECT m.calibre_book_id FROM qc_book_mapping m WHERE m.id = qc_reading_state.mapping_id)
         WHERE book_id IS NULL
           AND EXISTS (SELECT 1 FROM qc_book_mapping m WHERE m.id = qc_reading_state.mapping_id)`
      )
      .run();
    if (backfilled.changes > 0) {
      console.log(`🔧 已回填 qc_reading_state.book_id ${backfilled.changes} 行`);
    }

    for (const item of plan) {
      const { book, readState, totalPages, targetPage, sessions } = item;

      for (const s of sessions) {
        insertSession.run({
          bookId: s.bookId,
          userId: USER_ID,
          readerId: READER_ID,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          startPage: s.startPage,
          endPage: s.endPage,
          pagesRead: s.pagesRead,
          notes: SEED_TAG
        });
        summary.sessions += 1;
      }

      // progress_percent 库内无触发器，必须由应用层计算（与 database-service.js 保持一致）
      const progressPercent =
        totalPages > 0 ? Math.round((targetPage / totalPages) * 100) : 0;

      const lastSession = sessions.length ? sessions[sessions.length - 1] : null;

      const readStatusMap = { 0: '未读', 1: '在读', 2: '已读' };
      // read_date：已读取最后一次会话日期，在读取开始日期
      let readDate = null;
      if (readState === 2 && lastSession) readDate = formatDate(new Date(lastSession.endTime.replace(' ', 'T')));
      else if (readState === 1 && sessions[0]) readDate = sessions[0].startTime.slice(0, 10);

      const mappingRow = { id: book.mapping_id };

      if (mappingRow.id) {
        upsertState.run({
          mappingId: mappingRow.id,
          bookId: book.book_id,
          userId: USER_ID,
          readerId: READER_ID,
          readState,
          readStatus: readStatusMap[readState],
          currentPage: targetPage,
          totalPages,
          progressPercent,
          readDate,
          lastReadTime: lastSession ? lastSession.endTime.replace(' ', 'T') + 'Z' : null
        });
        summary.states += 1;
        if (readState === 0) summary.stateDistribution.unread += 1;
        else if (readState === 1) summary.stateDistribution.reading += 1;
        else summary.stateDistribution.read += 1;
      }

      const bookSessions = sessions;
      const totalReadingTime = bookSessions.reduce((sum, s) => sum + s.duration, 0);
      const readPages = bookSessions.reduce((sum, s) => sum + s.pagesRead, 0);
      const readingCount = bookSessions.length;
      const lastReadDate = bookSessions.length
        ? bookSessions[bookSessions.length - 1].startTime.slice(0, 10)
        : null;
      const lastReadDuration = bookSessions.length
        ? bookSessions[bookSessions.length - 1].duration
        : 0;

      upsertBookData.run({
        bookId: book.book_id,
        totalReadingTime,
        readPages,
        readingCount,
        lastReadDate,
        lastReadDuration
      });
      summary.bookData += 1;
    }

    // 4：按日汇总（只统计本脚本写入的种子会话）
    const dailyRows = db
      .prepare(
        `SELECT DATE(start_time) AS statDate,
                SUM(duration) AS minutes,
                SUM(pages_read) AS pages,
                COUNT(DISTINCT book_id) AS books
         FROM qc_reading_records
         WHERE reader_id = ? AND notes = ?
         GROUP BY DATE(start_time)`
      )
      .all(READER_ID, SEED_TAG);

    for (const row of dailyRows) {
      upsertDaily.run({
        userId: USER_ID,
        readerId: READER_ID,
        statDate: row.statDate,
        minutes: row.minutes || 0,
        pages: row.pages || 0,
        books: row.books || 0
      });
      summary.dailyStats += 1;
    }

    // 5：年度目标（目标值按当年实际读完本数上浮，使完成度落在合理区间）
    //
    // 先清掉历史脏行：早期版本给本表补 year 列时，旧记录遗留为 year = NULL，
    // 而 UNIQUE(user_id, year) 对 NULL 不生效，导致同一份「2026 年度目标」存在两行。
    // 年度报告按 start_date = 'YYYY-01-01' 查询且只取 .get() 一行，脏行在前会顶掉正确值。
    const staleGoals = db
      .prepare('DELETE FROM qc_reading_goals WHERE user_id = ? AND year IS NULL')
      .run(USER_ID);
    if (staleGoals.changes > 0) {
      console.log(`🧹 已清除无年份的历史目标行 ${staleGoals.changes} 条`);
    }

    for (const year of YEARS) {
      const completedRow = db
        .prepare(
          `SELECT COUNT(DISTINCT rs.book_id) AS c
           FROM qc_reading_state rs
           WHERE rs.reader_id = ? AND rs.read_state = 2
             AND strftime('%Y', rs.read_date) = ?`
        )
        .get(READER_ID, String(year));

      const completed = completedRow?.c || 0;
      const target = Number(year) === 2025 ? 30 : 36;

      upsertGoal.run({
        userId: USER_ID,
        readerId: READER_ID,
        year: Number(year),
        target,
        completed,
        currentValue: completed,
        startDate: `${year}-01-01`
      });
      summary.goals += 1;
    }
  });

  try {
    runSeed();
    console.log('✅ 种子数据写入完成');
    console.log(`   会话记录 qc_reading_records      : ${summary.sessions} 条`);
    console.log(`   阅读状态 qc_reading_state        : ${summary.states} 本` +
      `（已读 ${summary.stateDistribution.read} / 在读 ${summary.stateDistribution.reading} / 未读 ${summary.stateDistribution.unread}）`);
    console.log(`   书级累计 qc_bookdata             : ${summary.bookData} 本`);
    console.log(`   日汇总   qc_daily_reading_stats  : ${summary.dailyStats} 天`);
    console.log(`   年度目标 qc_reading_goals        : ${summary.goals} 条`);
  } catch (error) {
    console.error('❌ 写入失败，事务已回滚:', error.message);
    db.close();
    process.exit(1);
  }

  db.close();
};

/** 清理模式：仅删除带种子标记的数据 */
const clean = () => {
  const db = new Database(DB_PATH);
  db.pragma('busy_timeout = 10000');
  const removed = cleanSeedSessions(db);
  console.log(`🧹 已删除种子会话记录 ${removed} 条`);
  db.close();
};

if (process.argv.includes('--clean')) {
  clean();
} else {
  seed();
}
