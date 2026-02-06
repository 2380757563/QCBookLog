/**
 * 数据库结构验证器
 * 验证数据库表结构和完整性
 */

/**
 * 数据库结构验证器类
 */
class SchemaValidator {
  constructor() {
    // Calibre 数据库必需的表
    this.calibreRequiredTables = [
      'books',
      'authors',
      'publishers',
      'tags',
      'identifiers',
      'comments',
      'ratings',
      'books_authors_link',
      'books_publishers_link',
      'books_tags_link',
      'books_ratings_link'
    ];

    // Talebook 数据库必需的表
    this.talebookRequiredTables = [
      'items',
      'users',
      'reading_state',
      'qc_bookdata',
      'qc_bookmarks',
      'qc_bookmark_tags',
      'qc_groups',
      'qc_book_groups'
    ];

    // 各表必需的字段
    this.requiredColumns = {
      books: ['id', 'title', 'timestamp', 'path', 'uuid', 'has_cover'],
      authors: ['id', 'name', 'sort'],
      publishers: ['id', 'name'],
      tags: ['id', 'name'],
      items: ['book_id', 'book_type', 'count_visit', 'count_download'],
      users: ['id', 'username', 'admin'],
      reading_state: ['book_id', 'reader_id', 'favorite', 'wants', 'read_state'],
      qc_bookdata: ['book_id'],
      qc_bookmarks: ['id', 'book_id', 'content']
    };
  }

  /**
   * 验证 Calibre 数据库结构
   */
  validateCalibreSchema(db) {
    if (!db) {
      return {
        isValid: false,
        errors: ['数据库连接不可用']
      };
    }

    const errors = [];

    try {
      // 检查必需的表
      for (const tableName of this.calibreRequiredTables) {
        if (!this.tableExists(db, tableName)) {
          errors.push(`Calibre 数据库缺少必需的表: ${tableName}`);
        }
      }

      // 检查必需的字段
      for (const [tableName, columns] of Object.entries(this.requiredColumns)) {
        if (this.calibreRequiredTables.includes(tableName)) {
          const missingColumns = this.checkRequiredColumns(db, tableName, columns);
          if (missingColumns.length > 0) {
            errors.push(`表 ${tableName} 缺少必需的字段: ${missingColumns.join(', ')}`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`验证 Calibre 数据库结构失败: ${error.message}`]
      };
    }
  }

  /**
   * 验证 Talebook 数据库结构
   */
  validateTalebookSchema(db) {
    if (!db) {
      return {
        isValid: false,
        errors: ['数据库连接不可用']
      };
    }

    const errors = [];

    try {
      // 检查必需的表
      for (const tableName of this.talebookRequiredTables) {
        if (!this.tableExists(db, tableName)) {
          errors.push(`Talebook 数据库缺少必需的表: ${tableName}`);
        }
      }

      // 检查必需的字段
      for (const [tableName, columns] of Object.entries(this.requiredColumns)) {
        if (this.talebookRequiredTables.includes(tableName)) {
          const missingColumns = this.checkRequiredColumns(db, tableName, columns);
          if (missingColumns.length > 0) {
            errors.push(`表 ${tableName} 缺少必需的字段: ${missingColumns.join(', ')}`);
          }
        }
      }

      // 检查外键约束
      const foreignKeyErrors = this.checkForeignKeys(db);
      errors.push(...foreignKeyErrors);

      return {
        isValid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`验证 Talebook 数据库结构失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查表是否存在
   */
  tableExists(db, tableName) {
    try {
      const result = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name = ?
      `).get(tableName);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查必需的列是否存在
   */
  checkRequiredColumns(db, tableName, requiredColumns) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const existingColumns = new Set(columns.map(col => col.name));
      
      return requiredColumns.filter(col => !existingColumns.has(col));
    } catch (error) {
      console.error(`检查表 ${tableName} 的列失败:`, error);
      return requiredColumns;
    }
  }

  /**
   * 检查外键约束
   */
  checkForeignKeys(db) {
    const errors = [];

    try {
      // 检查 items 表的主键
      const itemsColumns = db.prepare('PRAGMA table_info(items)').all();
      const hasBookIdPK = itemsColumns.some(col => col.name === 'book_id' && col.pk > 0);
      
      if (!hasBookIdPK) {
        errors.push('items 表缺少 book_id 主键');
      }

      // 检查 reading_state 表的外键
      const readingStateFK = db.prepare('PRAGMA foreign_key_list(reading_state)').all();
      if (readingStateFK.length > 0) {
        errors.push('reading_state 表不应有外键约束');
      }

      // 检查 qc_book_groups 表的外键
      const bookGroupsFK = db.prepare('PRAGMA foreign_key_list(qc_book_groups)').all();
      const hasIncorrectFK = bookGroupsFK.some(fk => fk.table === 'items' && fk.from === 'id');
      
      if (hasIncorrectFK) {
        errors.push('qc_book_groups 表的外键约束不正确');
      }

    } catch (error) {
      console.error('检查外键约束失败:', error);
    }

    return errors;
  }

  /**
   * 验证数据库完整性
   */
  validateIntegrity(db) {
    if (!db) {
      return {
        isValid: false,
        errors: ['数据库连接不可用']
      };
    }

    const errors = [];

    try {
      // 检查外键约束是否启用
      const fkResult = db.prepare('PRAGMA foreign_keys').get();
      if (fkResult.foreign_keys !== 1) {
        errors.push('外键约束未启用');
      }

      // 检查完整性检查
      const integrityResult = db.prepare('PRAGMA integrity_check').get();
      if (integrityResult.integrity_check !== 'ok') {
        errors.push(`数据库完整性检查失败: ${integrityResult.integrity_check}`);
      }

      return {
        isValid: errors.length === 0,
        errors: errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`验证数据库完整性失败: ${error.message}`]
      };
    }
  }

  /**
   * 获取表结构信息
   */
  getTableStructure(db, tableName) {
    try {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const indexes = db.prepare(`PRAGMA index_list(${tableName})`).all();
      
      return {
        columns: columns,
        indexes: indexes
      };
    } catch (error) {
      console.error(`获取表 ${tableName} 结构失败:`, error);
      return null;
    }
  }

  /**
   * 比较两个数据库的结构
   */
  compareSchemas(db1, db2) {
    const differences = {
      tablesOnlyInDB1: [],
      tablesOnlyInDB2: [],
      tableDifferences: []
    };

    try {
      // 获取两个数据库的表列表
      const tables1 = this.getAllTables(db1);
      const tables2 = this.getAllTables(db2);

      // 找出只在 db1 中的表
      for (const table of tables1) {
        if (!tables2.includes(table)) {
          differences.tablesOnlyInDB1.push(table);
        }
      }

      // 找出只在 db2 中的表
      for (const table of tables2) {
        if (!tables1.includes(table)) {
          differences.tablesOnlyInDB2.push(table);
        }
      }

      // 比较共同表的结构
      const commonTables = tables1.filter(t => tables2.includes(t));
      for (const table of commonTables) {
        const cols1 = db.prepare(`PRAGMA table_info(${table})`).all();
        const cols2 = db.prepare(`PRAGMA table_info(${table})`).all();
        
        const colNames1 = new Set(cols1.map(c => c.name));
        const colNames2 = new Set(cols2.map(c => c.name));

        const onlyIn1 = [...colNames1].filter(c => !colNames2.has(c));
        const onlyIn2 = [...colNames2].filter(c => !colNames1.has(c));

        if (onlyIn1.length > 0 || onlyIn2.length > 0) {
          differences.tableDifferences.push({
            table: table,
            columnsOnlyInFirst: onlyIn1,
            columnsOnlyInSecond: onlyIn2
          });
        }
      }

      return differences;
    } catch (error) {
      console.error('比较数据库结构失败:', error);
      return null;
    }
  }

  /**
   * 获取所有表名
   */
  getAllTables(db) {
    try {
      const result = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      return result.map(row => row.name);
    } catch (error) {
      console.error('获取表列表失败:', error);
      return [];
    }
  }
}

export default SchemaValidator;
