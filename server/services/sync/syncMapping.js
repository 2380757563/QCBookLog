/**
 * 数据库同步映射规则
 * 明确定义源数据库与目标数据库之间的字段对应关系及数据类型转换规则
 */

/**
 * 数据映射规则配置
 */
export const MAPPING_RULES = {
  // Calibre metadata.db -> Talebook calibre-webserver.db 映射规则
  calibreToTalebook: {
    // books表 -> items表映射
    booksToItems: {
      sourceTable: 'books',
      targetTable: 'items',
      primaryKey: 'id',
      fields: {
        'id': { targetField: 'id', type: 'INTEGER', required: true },
        'title': { targetField: 'title', type: 'TEXT', required: true },
        'timestamp': { targetField: 'create_time', type: 'DATETIME', required: true },
        'last_modified': { targetField: 'update_time', type: 'DATETIME', required: true },
        // 通过关联查询获取作者
        'author': { targetField: 'author', type: 'TEXT', required: false, 
                    join: {
                      table: 'authors',
                      linkTable: 'books_authors_link',
                      sourceKey: 'id',
                      linkSourceKey: 'book',
                      linkTargetKey: 'author',
                      targetKey: 'id',
                      targetField: 'name',
                      aggregate: 'GROUP_CONCAT',
                      separator: ' & '
                    } 
                  },
        // 通过关联查询获取ISBN
        'isbn': { targetField: 'isbn', type: 'TEXT', required: false, 
                  join: {
                    table: 'identifiers',
                    sourceKey: 'id',
                    targetKey: 'book',
                    condition: "type = 'isbn'",
                    targetField: 'val'
                  } 
                },
        // 默认值映射
        'book_type': { targetField: 'book_type', type: 'INTEGER', required: true, defaultValue: 1 },
        'count_visit': { targetField: 'count_visit', type: 'INTEGER', required: true, defaultValue: 0 },
        'count_download': { targetField: 'count_download', type: 'INTEGER', required: true, defaultValue: 0 },
        'count_guest': { targetField: 'count_guest', type: 'INTEGER', required: true, defaultValue: 0 }
      }
    },
    // 其他表映射规则可以继续添加
  },
  
  // Talebook calibre-webserver.db -> Calibre metadata.db 映射规则
  talebookToCalibre: {
    // items表 -> books表映射
    itemsToBooks: {
      sourceTable: 'items',
      targetTable: 'books',
      primaryKey: 'id',
      fields: {
        'id': { targetField: 'id', type: 'INTEGER', required: true },
        'title': { targetField: 'title', type: 'TEXT', required: true },
        'create_time': { targetField: 'timestamp', type: 'DATETIME', required: true },
        'update_time': { targetField: 'last_modified', type: 'DATETIME', required: true },
        'author': { targetField: 'author', type: 'TEXT', required: false },
        'isbn': { targetField: 'isbn', type: 'TEXT', required: false }
        // 其他字段映射...
      }
    }
  }
};

/**
 * 数据类型转换函数
 */
export const TYPE_CONVERTERS = {
  /**
   * 转换为INTEGER类型
   */
  INTEGER: (value) => {
    if (value === null || value === undefined) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  },
  
  /**
   * 转换为TEXT类型
   */
  TEXT: (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  },
  
  /**
   * 转换为DATETIME类型
   */
  DATETIME: (value) => {
    if (value === null || value === undefined) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    // 尝试解析字符串为日期
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  },
  
  /**
   * 转换为BOOLEAN类型
   */
  BOOLEAN: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    if (typeof value === 'number') return value === 1;
    return false;
  }
};

/**
 * 冲突解决策略
 */
export const CONFLICT_STRATEGIES = {
  // 保留源数据
  KEEP_SOURCE: 'keep_source',
  // 保留目标数据
  KEEP_TARGET: 'keep_target',
  // 合并数据（源数据优先）
  MERGE_SOURCE_PRIORITY: 'merge_source_priority',
  // 合并数据（目标数据优先）
  MERGE_TARGET_PRIORITY: 'merge_target_priority',
  // 使用最新修改的数据
  USE_LATEST_MODIFIED: 'use_latest_modified'
};

/**
 * 同步方向
 */
export const SYNC_DIRECTIONS = {
  // 单向同步：从Calibre到Talebook
  CALIBRE_TO_TALEBOOK: 'calibre_to_talebook',
  // 单向同步：从Talebook到Calibre
  TALEBOOK_TO_CALIBRE: 'talebook_to_calibre',
  // 双向同步
  BIDIRECTIONAL: 'bidirectional'
};

/**
 * 同步状态
 */
export const SYNC_STATUS = {
  // 同步成功
  SUCCESS: 'success',
  // 同步失败
  FAILED: 'failed',
  // 同步冲突
  CONFLICT: 'conflict',
  // 跳过同步
  SKIPPED: 'skipped',
  // 同步中
  IN_PROGRESS: 'in_progress'
};

/**
 * 错误类型
 */
export const SYNC_ERROR_TYPES = {
  // 数据库连接错误
  DATABASE_CONNECTION_ERROR: 'database_connection_error',
  // SQL执行错误
  SQL_EXECUTION_ERROR: 'sql_execution_error',
  // 数据验证错误
  DATA_VALIDATION_ERROR: 'data_validation_error',
  // 冲突解决错误
  CONFLICT_RESOLUTION_ERROR: 'conflict_resolution_error',
  // 系统错误
  SYSTEM_ERROR: 'system_error'
};
