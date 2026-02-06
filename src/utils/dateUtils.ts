/**
 * 统一的日期处理工具函数
 */

/**
 * 日期输入类型
 */
type DateInput = string | Date | number;

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期为中文格式：YYYY年MM月DD日
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDateChinese = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
};

/**
 * 格式化日期为短格式：MM月DD日
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDateShort = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
};

/**
 * 格式化日期为 MM/DD 格式
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDateSlash = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/**
 * 格式化时间为 HH:mm 格式
 * @param date 日期时间
 * @returns 格式化后的时间字符串
 */
export const formatTime = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式
 * @param date 日期时间
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm 格式
 * @param date 日期时间
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTimeShort = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * 格式化时间范围
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 格式化后的时间范围字符串
 */
export const formatTimeRange = (startTime: DateInput, endTime: DateInput): string => {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return `${start} - ${end}`;
};

/**
 * 格式化时间段描述
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 格式化后的时间段描述
 */
export const formatTimeRangeDescription = (startTime: DateInput, endTime: DateInput): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const startTimeStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${startTimeStr} - ${endTimeStr}`;
};

/**
 * 格式化持续时间为友好的显示
 * @param minutes 分钟数
 * @returns 格式化后的持续时间字符串
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins > 0) {
    return `${hours}小时${mins}分钟`;
  }

  return `${hours}小时`;
};

/**
 * 格式化持续时间为小时
 * @param minutes 分钟数
 * @returns 格式化后的小时数（保留一位小数）
 */
export const formatDurationHours = (minutes: number): string => {
  const hours = minutes / 60;
  return hours.toFixed(1);
};

/**
 * 格式化日期为相对时间
 * @param date 日期
 * @returns 相对时间字符串（如"今天"、"昨天"、"3天前"等）
 */
export const formatRelativeDate = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return '今天';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }

  const diffTime = Math.abs(today.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}周前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}个月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
};

/**
 * 格式化日期为完整格式
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDateFull = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
};

/**
 * 格式化日期为本地格式
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDateLocale = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString('zh-CN');
};

/**
 * 格式化时间为本地格式
 * @param date 日期时间
 * @returns 格式化后的时间字符串
 */
export const formatTimeLocale = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

/**
 * 格式化月份为 YYYY年MM月
 * @param date 日期
 * @returns 格式化后的月份字符串
 */
export const formatMonthYear = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}年${month}月`;
};

/**
 * 格式化月份为 YYYY-MM
 * @param date 日期
 * @returns 格式化后的月份字符串
 */
export const formatMonth = (date: DateInput): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * 获取当前日期的 YYYY-MM-DD 格式
 * @returns 当前日期字符串
 */
export const getToday = (): string => {
  return formatDate(new Date());
};

/**
 * 获取昨天的日期 YYYY-MM-DD 格式
 * @returns 昨天的日期字符串
 */
export const getYesterday = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

/**
 * 获取当前年份
 * @returns 当前年份
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * 获取当前月份（0-11）
 * @returns 当前月份
 */
export const getCurrentMonth = (): number => {
  return new Date().getMonth();
};

/**
 * 判断是否为今天
 * @param date 日期
 * @returns 是否为今天
 */
export const isToday = (date: DateInput): boolean => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * 判断是否为今年
 * @param date 日期
 * @returns 是否为今年
 */
export const isThisYear = (date: DateInput): boolean => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return false;
  }
  return d.getFullYear() === getCurrentYear();
};

/**
 * 获取月份的天数
 * @param year 年份
 * @param month 月份（0-11）
 * @returns 月份的天数
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * 获取月份的第一天是星期几（0-6，0是周日）
 * @param year 年份
 * @param month 月份（0-11）
 * @returns 星期几
 */
export const getFirstDayOfWeek = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * 解析日期字符串为 Date 对象
 * @param dateString 日期字符串（支持 YYYY-MM-DD、YYYY/MM/DD、YYYY-MM-DD HH:mm:ss 等格式）
 * @returns Date 对象，解析失败返回 null
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) {
    return null;
  }

  // 尝试直接解析
  const d = new Date(dateString);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // 尝试替换分隔符后解析
  const normalized = dateString.replace(/\//g, '-');
  const d2 = new Date(normalized);
  if (!isNaN(d2.getTime())) {
    return d2;
  }

  return null;
};

/**
 * 比较两个日期是否相同
 * @param date1 日期1
 * @param date2 日期2
 * @returns 是否相同
 */
export const isSameDate = (date1: DateInput, date2: DateInput): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * 计算两个日期之间的天数差
 * @param date1 日期1
 * @param date2 日期2
 * @returns 天数差（绝对值）
 */
export const getDaysDiff = (date1: DateInput, date2: DateInput): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }

  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 添加天数到日期
 * @param date 日期
 * @param days 要添加的天数
 * @returns 新的日期
 */
export const addDays = (date: DateInput, days: number): Date => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * 添加月数到日期
 * @param date 日期
 * @param months 要添加的月数
 * @returns 新的日期
 */
export const addMonths = (date: DateInput, months: number): Date => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * 添加年数到日期
 * @param date 日期
 * @param years 要添加的年数
 * @returns 新的日期
 */
export const addYears = (date: DateInput, years: number): Date => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  d.setFullYear(d.getFullYear() + years);
  return d;
};

/**
 * 获取日期所在周的周日
 * @param date 日期
 * @returns 该周的周日
 */
export const getSundayOfDate = (date: DateInput): Date => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  const day = d.getDay();
  const diff = 7 - day; // 计算到周日的天数差
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * 获取日期所在周的周一
 * @param date 日期
 * @returns 该周的周一
 */
export const getMondayOfDate = (date: DateInput): Date => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // 计算到周日的天数差
  d.setDate(d.getDate() - diff);
  return d;
};

/**
 * 格式化日期数组为范围
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 格式化后的日期范围
 */
export const formatDateRange = (startDate: DateInput, endDate: DateInput): string => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} ~ ${end}`;
};

/**
 * 判断日期是否在指定范围内
 * @param date 要判断的日期
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 是否在范围内
 */
export const isDateInRange = (date: DateInput, startDate: DateInput, endDate: DateInput): boolean => {
  const d = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return d >= start && d <= end;
};
