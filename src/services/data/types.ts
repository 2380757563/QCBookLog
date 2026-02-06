/**
 * 热力图数据类型
 */
export interface HeatmapData {
  date: string;  // 日期 (YYYY-MM-DD)
  count: number; // 该日期的书摘数量
}

/**
 * 热力图数据集合
 */
export interface HeatmapDataSet {
  year: number;         // 年份
  data: HeatmapData[];  // 热力图数据数组
  updateTime: string;   // 更新时间 (ISO 8601)
}

/**
 * 年度阅读目标
 */
export interface AnnualReadingGoal {
  year: number;         // 年份
  target: number;       // 目标数量
  completed: number;    // 已完成数量
  updateTime: string;   // 更新时间 (ISO 8601)
}

/**
 * 阅读统计数据
 */
export interface ReadingStats {
  totalBooks: number;
  readBooks: number;
  readingBooks: number;
  unreadBooks: number;
  totalBookmarks: number;
  totalSpent: number;
  totalStandardPrice: number;
  readThisYear: number;
}
