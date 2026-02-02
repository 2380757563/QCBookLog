/**
 * 操作记录类型定义
 * 定义所有应用操作的类型和结构
 */

export type ActivityType =
  | 'book_added' // 添加书籍
  | 'book_deleted' // 删除书籍
  | 'book_updated' // 更新书籍
  | 'reading_status_changed' // 阅读状态变更
  | 'reading_started' // 开始阅读
  | 'reading_ended' // 结束阅读
  | 'bookmark_added' // 添加书摘
  | 'bookmark_updated' // 更新书摘
  | 'bookmark_deleted' // 删除书摘
  | 'goal_set' // 设置阅读目标
  | 'goal_updated' // 更新阅读目标
  | 'goal_completed' // 完成阅读目标
  | 'import_books' // 导入书籍
  | 'export_data'; // 导出数据

export interface ActivityRecord {
  id?: number;
  type: ActivityType;
  readerId: number;
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  bookPublisher?: string;
  bookCover?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
  content?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CreateActivityRequest {
  type: ActivityType;
  readerId: number;
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  bookPublisher?: string;
  bookCover?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
  content?: string;
  metadata?: Record<string, any>;
}

export interface ActivityFilters {
  startDate?: string;
  endDate?: string;
  type?: ActivityType;
  bookId?: number;
  limit?: number;
}

export interface ActivityApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
