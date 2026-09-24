/**
 * 年度数据聚合服务
 *
 * 职责：把散落在 Calibre / QCBookLog 多库中的数据，按「年」聚合为一份紧凑的 stats 结构。
 * 该结构同时用于：
 *   1. 注入 Prompt 发给 LLM
 *   2. 前端卷轴报告的数据源（数字与卡片直接渲染，保证与 AI 叙述不脱节）
 *
 * 重要原则：
 * - 未勾选的数据源「不查询、不返回」，而不是查完再丢弃（避免无谓的隐私暴露与性能开销）。
 * - 只做只读聚合，不写库。
 */
import databaseService from '../legacy/database-service.js';
import calibreService from '../legacy/calibreService.js';
import qcDataService from '../legacy/qcDataService.js';
import reviewService from '../legacy/reviewService.js';
import doulistRepository from '../../repositories/qcbooklog/qc-doulist-repository.js';
import readingTrackingService from '../reading/readingTrackingService.js';

/** 取某日期字符串（ISO / 'YYYY-MM-DD...'）的年份，无法解析返回 null */
const yearOf = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d{4})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
};

/** 安全取数字 */
const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** 保留两位小数，避免 Prompt 里出现一长串浮点噪音 */
const round2 = (value) => Math.round(num(value) * 100) / 100;

/** 格式化时长（分钟）为「X 小时 Y 分钟」 */
const formatDuration = (minutes) => {
  const total = Math.round(num(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) return `${m} 分钟`;
  if (m <= 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
};

/** 统计数组中各值出现次数，返回按次数倒序的 [{name, count}]，取前 limit 项 */
const topCounts = (values, limit = 10) => {
  const counter = new Map();
  for (const raw of values) {
    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
      const name = String(item ?? '').trim();
      if (!name) continue;
      counter.set(name, (counter.get(name) || 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
    .slice(0, limit);
};

const BINDING_LABELS = { 0: '电子书', 1: '平装', 2: '精装', 3: '特殊装帧', 4: '套装' };
const PAPER_LABELS = { 0: '未设置', 1: '轻型纸', 2: '胶版纸', 3: '纯质纸', 4: '铜版纸', 5: '书写纸', 6: '特种纸', 7: '其他' };
const EDGE_LABELS = { 0: '无', 1: '书口刷色', 2: '天头刷色', 3: '地脚刷色', 4: '毛边', 5: '其他' };
const SOURCE_LABELS = { douban: '豆瓣', dbr: 'DBR', google: 'Google Books', openlibrary: 'OpenLibrary' };

/**
 * 聚合年度藏书数据
 */
const collectCollection = (books, year) => {
  const purchased = books.filter(b => yearOf(b.purchaseDate) === year);
  const completed = books.filter(b => yearOf(b.readCompleteDate) === year);

  const paidList = purchased.map(b => num(b.purchasePrice)).filter(v => v > 0);
  const standardList = purchased.map(b => num(b.standardPrice)).filter(v => v > 0);

  const totalPaid = paidList.reduce((a, b) => a + b, 0);
  const totalStandard = standardList.reduce((a, b) => a + b, 0);

  // 折扣率：只对「同时有实付与定价」的书计算，避免除零与失真
  const discountPairs = purchased
    .filter(b => num(b.purchasePrice) > 0 && num(b.standardPrice) > 0)
    .map(b => num(b.purchasePrice) / num(b.standardPrice));
  const avgDiscount = discountPairs.length
    ? discountPairs.reduce((a, b) => a + b, 0) / discountPairs.length
    : 0;

  // 最贵的一本（有实付价的书里取最大）
  const pricedBooks = purchased.filter(b => num(b.purchasePrice) > 0);
  const mostExpensive = pricedBooks.length
    ? pricedBooks.reduce((max, b) => (num(b.purchasePrice) > num(max.purchasePrice) ? b : max))
    : null;

  return {
    year,
    libraryTotal: books.length,
    purchasedCount: purchased.length,
    completedCount: completed.length,
    readingCount: books.filter(b => b.readStatus === '在读').length,
    unreadCount: books.filter(b => b.readStatus === '未读').length,
    totalPaid: round2(totalPaid),
    totalStandard: round2(totalStandard),
    savedAmount: round2(Math.max(0, totalStandard - totalPaid)),
    avgDiscount: round2(avgDiscount * 10), // 转为「X 折」
    pricedBookCount: paidList.length,
    avgPrice: paidList.length ? round2(totalPaid / paidList.length) : 0,
    mostExpensive: mostExpensive
      ? { title: mostExpensive.title, author: mostExpensive.author, price: round2(mostExpensive.purchasePrice) }
      : null,
    monthlyPurchases: (() => {
      const buckets = new Array(12).fill(0);
      for (const b of purchased) {
        const m = String(b.purchaseDate || '').match(/\d{4}-(\d{2})/);
        if (m) {
          const idx = parseInt(m[1], 10) - 1;
          if (idx >= 0 && idx < 12) buckets[idx] += 1;
        }
      }
      return buckets;
    })(),
    sourceDist: topCounts(purchased.map(b => SOURCE_LABELS[b.source] || b.source || '未知'), 6)
  };
};

/**
 * 聚合年度装帧属性
 */
const collectBinding = (books, year) => {
  const purchased = books.filter(b => yearOf(b.purchaseDate) === year);
  const completed = books.filter(b => yearOf(b.readCompleteDate) === year);
  const scope = [...purchased, ...completed];

  return {
    bindingDist: topCounts(scope.map(b => BINDING_LABELS[b.binding1] || `未知(${b.binding1 ?? 0})`), 6),
    paperDist: topCounts(
      scope.map(b => PAPER_LABELS[b.paper1] || `未知(${b.paper1 ?? 0})`).filter(n => n !== '未设置'),
      6
    ),
    edgeDist: topCounts(
      scope.map(b => EDGE_LABELS[b.edge1] || `未知(${b.edge1 ?? 0})`).filter(n => n !== '无'),
      6
    ),
    typeDist: topCounts(scope.map(b => (num(b.book_type) === 0 ? '电子书' : '纸质书')), 2)
  };
};

/**
 * 聚合年度阅读数据
 */
const collectReading = (books, year, heatmap) => {
  const completed = books.filter(b => yearOf(b.readCompleteDate) === year);

  const pagesFromBooks = completed.reduce((sum, b) => sum + num(b.read_pages || b.pages), 0);
  const timeFromBooks = completed.reduce((sum, b) => sum + num(b.total_reading_time), 0);

  // 热力图按年统计（更准确，因为它来自阅读记录明细）
  const heatDates = Object.keys(heatmap || {});
  const heatPages = heatDates.reduce((sum, d) => sum + num(heatmap[d]?.pages), 0);
  const heatDuration = heatDates.reduce((sum, d) => sum + num(heatmap[d]?.duration), 0);

  // 优先用热力图（明细聚合），为 0 时退回书籍级累计
  const totalPages = heatPages > 0 ? heatPages : pagesFromBooks;
  const totalDuration = heatDuration > 0 ? heatDuration : timeFromBooks;

  const completedTitles = completed
    .slice()
    .sort((a, b) => String(b.readCompleteDate || '').localeCompare(String(a.readCompleteDate || '')))
    .map(b => ({
      title: b.title,
      author: b.author || '',
      rating: num(b.personal_rating || b.rating) || 0,
      pages: num(b.pages) || 0,
      finishedAt: b.readCompleteDate ? String(b.readCompleteDate).slice(0, 10) : ''
    }));

  const rated = completed.filter(b => num(b.personal_rating || b.rating) > 0);
  const avgRating = rated.length
    ? round2(rated.reduce((sum, b) => sum + num(b.personal_rating || b.rating), 0) / rated.length)
    : 0;

  const mostRead = books
    .filter(b => num(b.total_reading_time) > 0)
    .sort((a, b) => num(b.total_reading_time) - num(a.total_reading_time))
    .slice(0, 5)
    .map(b => ({
      title: b.title,
      author: b.author || '',
      minutes: Math.round(num(b.total_reading_time)),
      humanized: formatDuration(b.total_reading_time)
    }));

  return {
    year,
    completedCount: completed.length,
    totalPages: Math.round(totalPages),
    totalMinutes: Math.round(totalDuration),
    totalDurationText: formatDuration(totalDuration),
    avgPagesPerBook: completed.length ? Math.round(totalPages / completed.length) : 0,
    avgRating,
    ratedCount: rated.length,
    activeDays: heatDates.length,
    recentCompleted: completedTitles.slice(0, 20),
    mostRead,
    allCompletedTitles: completedTitles.map(t => t.title)
  };
};

/**
 * 聚合年度阅读习惯
 */
const collectHabit = (heatmap, year) => {
  const entries = Object.entries(heatmap || {})
    .map(([date, v]) => ({ date, duration: num(v?.duration), pages: num(v?.pages), books: num(v?.books) }))
    .filter(e => e.duration > 0 || e.pages > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!entries.length) {
    return { year, activeDays: 0, longestStreak: 0, bestDay: null, byMonth: new Array(12).fill(0), byWeekday: new Array(7).fill(0) };
  }

  // 最长连续阅读天数
  let longestStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < entries.length; i += 1) {
    const prev = new Date(`${entries[i - 1].date}T00:00:00Z`).getTime();
    const curr = new Date(`${entries[i].date}T00:00:00Z`).getTime();
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  const bestDay = entries.reduce((max, e) => (e.duration > max.duration ? e : max), entries[0]);

  const byMonth = new Array(12).fill(0);
  const byWeekday = new Array(7).fill(0);
  for (const e of entries) {
    const m = parseInt(e.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) byMonth[m] += 1;
    const wd = new Date(`${e.date}T00:00:00Z`).getUTCDay();
    if (wd >= 0 && wd < 7) byWeekday[wd] += 1;
  }

  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const topWeekdayIdx = byWeekday.indexOf(Math.max(...byWeekday));

  return {
    year,
    activeDays: entries.length,
    longestStreak,
    bestDay: { date: bestDay.date, minutes: Math.round(bestDay.duration), humanized: formatDuration(bestDay.duration) },
    busiestMonth: byMonth.indexOf(Math.max(...byMonth)) + 1,
    favoriteWeekday: WEEKDAYS[topWeekdayIdx],
    byMonth,
    byWeekday
  };
};

/**
 * 聚合年度品味画像
 */
const collectTaste = (books, year) => {
  const completed = books.filter(b => yearOf(b.readCompleteDate) === year);
  const purchased = books.filter(b => yearOf(b.purchaseDate) === year);
  const scope = [...completed, ...purchased];

  return {
    topTags: topCounts(scope.map(b => b.tags), 12),
    topGroups: topCounts(scope.map(b => b.groups), 8),
    topPublishers: topCounts(scope.map(b => b.publisher).filter(Boolean), 10),
    topAuthors: topCounts(scope.map(b => b.author).filter(Boolean), 10),
    topSeries: topCounts(scope.map(b => b.series).filter(Boolean), 8)
  };
};

/**
 * 聚合年度书摘：正文截断后返回，控制发送给 AI 的体量
 */
const collectBookmarks = async (year, limit, chars) => {
  const all = qcDataService.getAllBookmarks() || [];
  const inYear = all.filter(b => yearOf(b.created_at || b.createdAt) === year);
  inYear.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const picked = limit > 0 ? inYear.slice(0, limit) : [];

  return {
    year,
    total: inYear.length,
    sentCount: picked.length,
    truncated: inYear.length > picked.length,
    items: picked.map(b => {
      const text = String(b.text || '').replace(/\s+/g, ' ').trim();
      return {
        bookTitle: b.book_title || '',
        bookAuthor: b.book_author || '',
        chapter: b.chapter || '',
        text: text.length > chars ? `${text.slice(0, chars)}…` : text,
        note: String(b.note || '').slice(0, chars)
      };
    })
  };
};

/**
 * 聚合年度书评：正文摘要截断
 */
const collectReviews = async (year, limit, chars) => {
  const all = reviewService.getAllReviews() || [];
  const inYear = all.filter(r => yearOf(r.created_at || r.createdAt || r.updated_at) === year);
  inYear.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const picked = limit > 0 ? inYear.slice(0, limit) : [];
  const rated = inYear.filter(r => num(r.rating) > 0);

  return {
    year,
    total: inYear.length,
    sentCount: picked.length,
    truncated: inYear.length > picked.length,
    avgRating: rated.length ? round2(rated.reduce((s, r) => s + num(r.rating), 0) / rated.length) : 0,
    items: picked.map(r => {
      const content = String(r.content || '').replace(/\s+/g, ' ').trim();
      return {
        bookTitle: r.book_title || '',
        bookAuthor: r.book_author || '',
        title: r.title || '',
        rating: num(r.rating) || 0,
        excerpt: content.length > chars ? `${content.slice(0, chars)}…` : content
      };
    })
  };
};

/**
 * 聚合年度阅读目标
 * 只读，不触发 getOrCreateReadingGoal 的写入行为
 */
const collectGoals = (year, completedCount) => {
  let row = null;
  try {
    const db = databaseService.getQcBooklogDb();
    if (db) {
      row = db.prepare(`
        SELECT target_value, current_value, status, start_date
        FROM qc_reading_goals
        WHERE user_id = 0 AND goal_type = 'yearly' AND start_date = ?
      `).get(`${year}-01-01`);
    }
  } catch (error) {
    console.warn('⚠️ 读取年度目标失败:', error.message);
  }

  if (!row) {
    return { year, hasGoal: false, target: 0, completed: 0, achieved: false, progressPercent: 0 };
  }

  const target = num(row.target_value);
  const completed = num(row.current_value) || completedCount;
  const progressPercent = target > 0 ? Math.min(999, Math.round((completed / target) * 100)) : 0;

  return {
    year,
    hasGoal: true,
    target,
    completed,
    status: row.status || 'active',
    achieved: target > 0 && completed >= target,
    progressPercent
  };
};

/**
 * 聚合书单进度
 */
const collectDoulist = () => {
  try {
    const imports = doulistRepository.listImports() || [];
    return {
      listCount: imports.length,
      lists: imports.slice(0, 20).map(r => ({
        title: r.doulist_title || '未命名书单',
        isBuy: r.is_buy === 1,
        isRead: r.is_read === 1,
        buyDone: num(r.buy_done),
        buyTotal: num(r.buy_total),
        readDone: num(r.read_done),
        readTotal: num(r.read_total)
      }))
    };
  } catch (error) {
    console.warn('⚠️ 读取书单进度失败:', error.message);
    return { listCount: 0, lists: [] };
  }
};

/**
 * 聚合收藏与想读
 */
const collectFavorite = (books, year) => {
  const favorite = books.filter(b => num(b.favorite) === 1);
  const wants = books.filter(b => num(b.wants) === 1);

  return {
    favoriteCount: favorite.length,
    wantsCount: wants.length,
    favoriteInYear: favorite.filter(b => yearOf(b.favorite_date) === year).length,
    wantsInYear: wants.filter(b => yearOf(b.wants_date) === year).length,
    favoriteTitles: favorite.slice(0, 15).map(b => b.title),
    wantsTitles: wants.slice(0, 15).map(b => b.title)
  };
};

/**
 * 主入口：聚合年度数据
 * @param {number} year
 * @param {object} options
 * @param {string[]} options.sources       勾选的数据源 key
 * @param {number}   [options.readerId=0]
 * @param {number}   [options.excerptLimit] 书摘/书评正文条数上限
 * @param {number}   [options.excerptChars] 每条正文截断字数
 * @returns {Promise<{stats: object, available: object}>}
 */
export async function collectAnnualData(year, options = {}) {
  const {
    sources = [],
    readerId = 0,
    excerptLimit = 20,
    excerptChars = 200
  } = options;

  const wanted = (key) => sources.includes(key);

  // 书籍是全量基础数据，多个数据源都依赖它，只取一次
  let books = [];
  try {
    books = await calibreService.getAllBooksFromCalibre(true, readerId) || [];
  } catch (error) {
    console.warn('⚠️ 读取书库失败，将以空书库继续:', error.message);
    books = [];
  }

  // 热力图按需读取：reading 与 habit 都需要
  let heatmap = {};
  if (wanted('reading') || wanted('habit')) {
    try {
      heatmap = await readingTrackingService.getHeatmapData(readerId, year) || {};
    } catch (error) {
      console.warn('⚠️ 读取阅读热力图失败:', error.message);
      heatmap = {};
    }
  }

  const stats = {
    year,
    generatedAt: new Date().toISOString(),
    enabledSources: [...sources]
  };

  if (wanted('collection') || wanted('spending')) {
    const collection = collectCollection(books, year);
    if (wanted('collection')) {
      stats.collection = collection;
    }
    if (wanted('spending')) {
      stats.spending = {
        year,
        totalPaid: collection.totalPaid,
        totalStandard: collection.totalStandard,
        savedAmount: collection.savedAmount,
        avgDiscount: collection.avgDiscount,
        avgPrice: collection.avgPrice,
        pricedBookCount: collection.pricedBookCount,
        mostExpensive: collection.mostExpensive
      };
    }
  }

  if (wanted('binding')) {
    stats.binding = collectBinding(books, year);
  }

  if (wanted('reading')) {
    stats.reading = collectReading(books, year, heatmap);
  }

  if (wanted('habit')) {
    stats.habit = collectHabit(heatmap, year);
  }

  if (wanted('taste')) {
    stats.taste = collectTaste(books, year);
  }

  if (wanted('bookmarks')) {
    stats.bookmarks = await collectBookmarks(year, excerptLimit, excerptChars);
  }

  if (wanted('reviews')) {
    stats.reviews = await collectReviews(year, excerptLimit, excerptChars);
  }

  if (wanted('goals')) {
    const completedCount = books.filter(b => yearOf(b.readCompleteDate) === year).length;
    stats.goals = collectGoals(year, completedCount);
  }

  if (wanted('doulist')) {
    stats.doulist = collectDoulist();
  }

  if (wanted('favorite')) {
    stats.favorite = collectFavorite(books, year);
  }

  // 供设置页展示「这项数据有多少条」，用户据此决定是否勾选
  const available = buildAvailability(books, year, heatmap);

  return { stats, available };
}

/**
 * 构建各数据源的可用条数（供设置页徽标显示）
 * 注意：这里必须全量统计，与 sources 勾选无关
 */
export function buildAvailability(books, year, heatmap) {
  const purchased = books.filter(b => yearOf(b.purchaseDate) === year);
  const completed = books.filter(b => yearOf(b.readCompleteDate) === year);
  const pricedPurchased = purchased.filter(b => num(b.purchasePrice) > 0);
  const tagged = [...completed, ...purchased].filter(b => (b.tags || []).length > 0);
  const activeDays = Object.values(heatmap || {}).filter(v => num(v?.duration) > 0 || num(v?.pages) > 0).length;

  let bookmarkCount = 0;
  let reviewCount = 0;
  let doulistCount = 0;
  try {
    bookmarkCount = (qcDataService.getAllBookmarks() || []).filter(b => yearOf(b.created_at || b.createdAt) === year).length;
  } catch (_) { /* 忽略：无数据时按 0 计 */ }
  try {
    reviewCount = (reviewService.getAllReviews() || []).filter(r => yearOf(r.created_at || r.createdAt || r.updated_at) === year).length;
  } catch (_) { /* 同上 */ }
  try {
    doulistCount = (doulistRepository.listImports() || []).length;
  } catch (_) { /* 同上 */ }

  return {
    collection: purchased.length + completed.length,
    spending: pricedPurchased.length,
    binding: purchased.length + completed.length,
    reading: completed.length,
    habit: activeDays,
    taste: tagged.length,
    bookmarks: bookmarkCount,
    reviews: reviewCount,
    goals: 1,
    doulist: doulistCount,
    favorite: books.filter(b => num(b.favorite) === 1).length + books.filter(b => num(b.wants) === 1).length
  };
}

/** 便捷入口：仅统计可用条数（设置页调用，不勾选任何数据源） */
export async function getAvailability(year, readerId = 0) {
  let books = [];
  let heatmap = {};
  try {
    books = await calibreService.getAllBooksFromCalibre(true, readerId) || [];
  } catch (error) {
    console.warn('⚠️ 读取书库失败:', error.message);
  }
  try {
    heatmap = await readingTrackingService.getHeatmapData(readerId, year) || {};
  } catch (error) {
    console.warn('⚠️ 读取阅读热力图失败:', error.message);
  }
  return buildAvailability(books, year, heatmap);
}

export default { collectAnnualData, buildAvailability, getAvailability };
