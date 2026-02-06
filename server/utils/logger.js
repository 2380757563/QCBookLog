/**
 * 统一的日志系统
 * 提供分级日志记录、文件输出、格式化等功能
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 日志级别枚举
 */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL'
};

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
};

/**
 * 颜色代码
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * 日志配置
 */
const config = {
  level: process.env.LOG_LEVEL || LogLevel.INFO,
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE !== 'false',
  logDir: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 5,
  dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
};

/**
 * 格式化日期时间
 */
function formatDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * 格式化日志消息
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = formatDateTime();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

  return `[${timestamp}] [${level}] ${message} ${metaStr}`.trim();
}

/**
 * 获取日志级别的颜色
 */
function getLevelColor(level) {
  const colorMap = {
    [LogLevel.DEBUG]: colors.cyan,
    [LogLevel.INFO]: colors.green,
    [LogLevel.WARN]: colors.yellow,
    [LogLevel.ERROR]: colors.red,
    [LogLevel.FATAL]: colors.bright + colors.red
  };
  return colorMap[level] || colors.white;
}

/**
 * 控制台输出
 */
function consoleLog(level, formattedMessage) {
  if (!config.enableConsole) {
    return;
  }

  const color = getLevelColor(level);
  const colorizedMessage = `${color}${formattedMessage}${colors.reset}`;

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(colorizedMessage);
      break;
    case LogLevel.INFO:
      console.info(colorizedMessage);
      break;
    case LogLevel.WARN:
      console.warn(colorizedMessage);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(colorizedMessage);
      break;
    default:
      console.log(colorizedMessage);
  }
}

/**
 * 获取日志文件路径
 */
function getLogFilePath(level) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${level.toLowerCase()}-${date}.log`;
  return path.join(config.logDir, filename);
}

/**
 * 确保日志目录存在
 */
function ensureLogDir() {
  if (!fs.existsSync(config.logDir)) {
    fs.mkdirSync(config.logDir, { recursive: true });
  }
}

/**
 * 检查并轮转日志文件
 */
function rotateLogFileIfNeeded(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);

      if (stats.size > config.maxFileSize) {
        // 轮转文件
        let counter = 1;
        let rotatedPath;

        do {
          rotatedPath = `${filePath}.${counter}`;
          counter++;
        } while (fs.existsSync(rotatedPath));

        fs.renameSync(filePath, rotatedPath);

        // 清理旧文件
        const files = fs.readdirSync(config.logDir)
          .filter(file => file.startsWith(path.basename(filePath)))
          .map(file => ({
            name: file,
            path: path.join(config.logDir, file),
            time: fs.statSync(path.join(config.logDir, file)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time);

        // 删除超过最大数量的旧文件
        if (files.length > config.maxFiles) {
          const filesToDelete = files.slice(config.maxFiles);
          filesToDelete.forEach(file => {
            fs.unlinkSync(file.path);
          });
        }
      }
    }
  } catch (error) {
    console.error('日志文件轮转失败:', error.message);
  }
}

/**
 * 文件输出
 */
function fileLog(level, formattedMessage) {
  if (!config.enableFile) {
    return;
  }

  try {
    ensureLogDir();

    const filePath = getLogFilePath(level);
    rotateLogFileIfNeeded(filePath);

    fs.appendFileSync(filePath, formattedMessage + '\n', 'utf8');
  } catch (error) {
    console.error('写入日志文件失败:', error.message);
  }
}

/**
 * 判断日志级别是否应该输出
 */
function shouldLog(level) {
  const currentPriority = LOG_LEVEL_PRIORITY[config.level];
  const messagePriority = LOG_LEVEL_PRIORITY[level];
  return messagePriority >= currentPriority;
}

/**
 * 日志记录函数
 */
function log(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, meta);

  consoleLog(level, formattedMessage);
  fileLog(level, formattedMessage);
}

/**
 * Logger 类
 */
class Logger {
  /**
   * DEBUG 级别日志
   */
  debug(message, meta = {}) {
    log(LogLevel.DEBUG, message, meta);
  }

  /**
   * INFO 级别日志
   */
  info(message, meta = {}) {
    log(LogLevel.INFO, message, meta);
  }

  /**
   * WARN 级别日志
   */
  warn(message, meta = {}) {
    log(LogLevel.WARN, message, meta);
  }

  /**
   * ERROR 级别日志
   */
  error(message, meta = {}) {
    log(LogLevel.ERROR, message, meta);
  }

  /**
   * FATAL 级别日志
   */
  fatal(message, meta = {}) {
    log(LogLevel.FATAL, message, meta);
  }

  /**
   * 记录 API 请求
   */
  apiRequest(method, url, headers, body) {
    const meta = {
      method,
      url,
      headers: {
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent']
      }
    };

    if (body) {
      meta.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    this.info('📤 API 请求', meta);
  }

  /**
   * 记录 API 响应
   */
  apiResponse(status, statusText, duration) {
    const meta = {
      status,
      statusText,
      duration: `${duration}ms`
    };

    this.info('✅ API 响应', meta);
  }

  /**
   * 记录 API 错误
   */
  apiError(status, error, duration) {
    const meta = {
      status,
      error: error.message,
      duration: `${duration}ms`
    };

    this.error('❌ API 错误', meta);
  }

  /**
   * 记录数据库操作
   */
  dbOperation(operation, table, duration) {
    const meta = {
      operation,
      table,
      duration: `${duration}ms`
    };

    this.debug('💾 数据库操作', meta);
  }

  /**
   * 记录数据库错误
   */
  dbError(operation, table, error) {
    const meta = {
      operation,
      table,
      error: error.message
    };

    this.error('❌ 数据库错误', meta);
  }

  /**
   * 记录同步操作
   */
  syncOperation(operation, source, target) {
    const meta = {
      operation,
      source,
      target
    };

    this.info('🔄 同步操作', meta);
  }

  /**
   * 记录同步错误
   */
  syncError(operation, source, target, error) {
    const meta = {
      operation,
      source,
      target,
      error: error.message
    };

    this.error('❌ 同步错误', meta);
  }

  /**
   * 记录文件操作
   */
  fileOperation(operation, filePath) {
    const meta = {
      operation,
      filePath
    };

    this.debug('📁 文件操作', meta);
  }

  /**
   * 记录文件错误
   */
  fileError(operation, filePath, error) {
    const meta = {
      operation,
      filePath,
      error: error.message
    };

    this.error('❌ 文件操作错误', meta);
  }
}

// 创建 logger 实例
const logger = new Logger();

// 导出
export default logger;
export { LogLevel, Logger };
