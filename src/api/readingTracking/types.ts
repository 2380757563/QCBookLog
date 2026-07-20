/**
 * 阅读追踪服务类型定义
 */

// ==================== 阅读记录 ====================

/**
 * 阅读记录
 */
export interface ReadingRecord {
  id: number;
  bookId: number;
  readerId: number;
  startTime: string;        // ISO 8601 格式
  endTime: string;          // ISO 8601 格式
  duration: number;         // 阅读时长(分钟)
  startPage: number;        // 开始页码
  endPage: number;          // 结束页码
  pagesRead: number;        // 本次阅读页数
  createdAt: string;        // ISO 8601 格式
  // 扩展字段(从JOIN查询获得)
  title?: string;           // 书籍名称
  author?: string;          // 作者
  coverUrl?: string;        // 封面URL
  // 蛇形命名兼容字段(后端API返回的格式)
  book_id?: number;
  book_title?: string;
  book_cover?: string;
  book_author?: string;
  start_time?: string;
  end_time?: string;
  start_page?: number;
  end_page?: number;
  pages_read?: number;
}

/**
 * 创建阅读记录请求
 */
export interface CreateReadingRecordRequest {
  bookId: number;
  readerId: number;
  startTime: string;
  endTime: string;
  duration: number;
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
}

// ==================== 阅读统计 ====================

/**
 * 书籍阅读统计
 */
export interface BookReadingStats {
  bookId?: number;
  totalReadingTime: number;      // 总阅读时长(分钟)
  readPages: number;            // 已读页数
  readingCount: number;         // 阅读次数
  lastReadDate: string;         // 最近阅读日期 (YYYY-MM-DD)
  lastReadDuration: number;     // 最近一次阅读时长(分钟)
  totalPages?: number;          // 书籍总页数
  progressPercent?: number;      // 阅读进度百分比(0-100)
}

/**
 * 读者阅读汇总统计
 */
export interface ReaderSummary {
  totalRecords: number;          // 总阅读记录数
  totalTime: number;            // 总阅读时长(分钟)
  totalPages: number;            // 总阅读页数
  totalBooks: number;            // 阅读书籍数(不重复)
  latestReadDate: string;       // 最近阅读日期 (YYYY-MM-DD)
}

/**
 * 每日阅读统计
 */
export interface DailyReadingStats {
  readerId: number;
  date: string;                 // 统计日期 (YYYY-MM-DD)
  totalBooks: number;            // 当天阅读书籍数
  totalPages: number;           // 当天阅读总页数
  totalTime: number;             // 当天阅读总时长(分钟)
  created_at?: string;          // 创建时间
  updated_at?: string;          // 更新时间
}

// ==================== 热力图数据 ====================

/**
 * 单日热力图数据
 */
export interface DayHeatmapData {
  duration: number;             // 阅读时长(分钟)
  books: number;                // 阅读书籍数
  pages: number;                // 阅读页数
}

/**
 * 热力图数据字典
 * 键: 日期 (YYYY-MM-DD)
 * 值: 该日的阅读数据
 */
export interface HeatmapData {
  [date: string]: DayHeatmapData;
}

// ==================== 响应类型 ====================

/**
 * API响应基础结构
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

// ==================== 阅读服务接口 ====================

/**
 * 阅读追踪服务接口
 */
export interface ReadingTrackingService {
  // ==================== 阅读记录 ====================

  /**
   * 创建阅读记录
   */
  createReadingRecord(record: CreateReadingRecordRequest): Promise<ReadingRecord>;

  /**
   * 获取书籍的阅读记录
   */
  getBookReadingRecords(bookId: number, limit?: number): Promise<ReadingRecord[]>;

  /**
   * 获取读者的所有阅读记录
   */
  getReaderReadingRecords(startDate?: string, endDate?: string): Promise<ReadingRecord[]>;

  // ==================== 阅读统计 ====================

  /**
   * 获取书籍的阅读统计
   */
  getBookReadingStats(bookId: number): Promise<BookReadingStats>;

  /**
   * 获取读者的汇总统计
   */
  getReaderSummary(): Promise<ReaderSummary>;

  /**
   * 获取每日阅读统计
   */
  getDailyReadingStats(startDate?: string, endDate?: string): Promise<DailyReadingStats[]>;

  /**
   * 获取某一天的详细阅读记录
   */
  getDailyReadingDetails(date: string): Promise<ReadingRecord[]>;

  // ==================== 热力图 ====================

  /**
   * 获取热力图数据
   */
  getHeatmapData(year: number): Promise<HeatmapData>;
}

// ==================== UI组件类型 ====================

/**
 * 阅读进度配置
 */
export interface ReadingProgressConfig {
  displayMode: 'tag' | 'progress';  // 显示模式：标签或进度条
}

/**
 * 阅读计时器状态
 */
export interface ReadingTimerState {
  isReading: boolean;              // 是否正在阅读
  isPaused: boolean;               // 是否暂停
  startTime: Date | null;          // 开始时间
  pausedTime: Date | null;         // 暂停时间点
  currentBookId: number | null;    // 当前阅读的书籍ID
  currentBookTitle: string;        // 当前书籍名称
  elapsedSeconds: number;          // 已读时长(秒)
  startPage: number;               // 开始页码
  currentPage: number;             // 当前页码
}
