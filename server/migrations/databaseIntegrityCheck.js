/**
 * 数据库完整性检查和修复脚本
 * 用于验证和修复 talebook 和 qcbooklog 数据库的结构完整性
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const TALEBOOK_DB_PATH = path.join(projectRoot, 'data/talebook/calibre-webserver.db');
const QCBOOKLOG_DB_PATH = path.join(projectRoot, 'data/qc_booklog.db');

const checkResults = {
  talebook: { tables: {}, fields: {}, errors: [], warnings: [] },
  qcbooklog: { tables: {}, fields: {}, errors: [], warnings: [] },
  success: true
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    fix: '🔧'
  }[type] || '📋';
  console.log(`${prefix} ${message}`);
}

function checkTableExists(db, tableName) {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  return !!result;
}

function getTableColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all();
}

function checkColumnExists(db, tableName, columnName) {
  const columns = getTableColumns(db, tableName);
  return columns.some(col => col.name === columnName);
}

function checkTalebookDatabase() {
  log('=== 开始检查 Talebook 数据库 ===', 'info');
  
  if (!fs.existsSync(TALEBOOK_DB_PATH)) {
    log(`Talebook 数据库文件不存在: ${TALEBOOK_DB_PATH}`, 'error');
    checkResults.talebook.errors.push('数据库文件不存在');
    checkResults.success = false;
    return;
  }

  const db = new Database(TALEBOOK_DB_PATH);
  
  try {
    db.pragma('journal_mode = WAL');
    
    const requiredTables = {
      'items': {
        description: '书籍统计信息表',
        requiredFields: ['book_id', 'book_type', 'count_visit', 'count_download', 'count_guest']
      },
      'reading_state': {
        description: '阅读状态表',
        requiredFields: ['book_id', 'reader_id', 'read_state', 'favorite', 'wants']
      },
      'readers': {
        description: '读者账户表',
        requiredFields: ['id', 'username', 'name', 'email', 'admin', 'active']
      },
      'readerlogs': {
        description: '读者日志表',
        requiredFields: ['id', 'reader_id', 'action', 'create_time']
      },
      'reading_goals': {
        description: '阅读目标表',
        requiredFields: ['id', 'reader_id', 'year', 'target', 'completed']
      },
      'qc_bookdata': {
        description: '书籍扩展数据表',
        requiredFields: ['book_id', 'page_count', 'standard_price', 'purchase_price']
      },
      'qc_bookmarks': {
        description: '书摘表',
        requiredFields: ['id', 'book_id', 'content', 'created_at']
      },
      'qc_groups': {
        description: '分组表',
        requiredFields: ['id', 'name', 'created_at']
      },
      'qc_book_groups': {
        description: '书籍分组关联表',
        requiredFields: ['id', 'book_id', 'group_id']
      },
      'devices': {
        description: '设备管理表',
        requiredFields: ['id', 'reader_id', 'device_name', 'device_type', 'created_at'],
        optional: true
      }
    };

    for (const [tableName, config] of Object.entries(requiredTables)) {
      const exists = checkTableExists(db, tableName);
      checkResults.talebook.tables[tableName] = { exists, description: config.description };
      
      if (!exists) {
        if (config.optional) {
          log(`表 ${tableName} (${config.description}) 不存在 - 可选表`, 'warning');
          checkResults.talebook.warnings.push(`可选表 ${tableName} 不存在`);
        } else {
          log(`表 ${tableName} (${config.description}) 不存在`, 'error');
          checkResults.talebook.errors.push(`表 ${tableName} 不存在`);
          checkResults.success = false;
        }
      } else {
        log(`表 ${tableName} (${config.description}) 存在`, 'success');
        
        if (config.requiredFields) {
          for (const field of config.requiredFields) {
            const fieldExists = checkColumnExists(db, tableName, field);
            if (!fieldExists) {
              log(`  字段 ${field} 不存在`, 'warning');
              checkResults.talebook.fields[`${tableName}.${field}`] = { exists: false };
              checkResults.talebook.warnings.push(`表 ${tableName} 缺少字段 ${field}`);
            } else {
              checkResults.talebook.fields[`${tableName}.${field}`] = { exists: true };
            }
          }
        }
      }
    }

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    log(`Talebook 数据库共有 ${tables.length} 个表`, 'info');
    
  } catch (error) {
    log(`检查 Talebook 数据库时出错: ${error.message}`, 'error');
    checkResults.talebook.errors.push(error.message);
    checkResults.success = false;
  } finally {
    db.close();
  }
}

function checkQcbooklogDatabase() {
  log('=== 开始检查 QCBookLog 数据库 ===', 'info');
  
  if (!fs.existsSync(QCBOOKLOG_DB_PATH)) {
    log(`QCBookLog 数据库文件不存在: ${QCBOOKLOG_DB_PATH}`, 'warning');
    checkResults.qcbooklog.warnings.push('数据库文件不存在，将在初始化时创建');
    return;
  }

  const db = new Database(QCBOOKLOG_DB_PATH);
  
  try {
    db.pragma('journal_mode = WAL');
    
    const requiredTables = {
      'qc_book_mapping': {
        description: '书籍映射表',
        requiredFields: ['id', 'calibre_book_id', 'talebook_book_id']
      },
      'qc_users': {
        description: '用户表',
        requiredFields: ['id', 'username', 'admin', 'active']
      },
      'qc_groups': {
        description: '分组表',
        requiredFields: ['id', 'name']
      },
      'qc_tags': {
        description: '标签表',
        requiredFields: ['id', 'name']
      },
      'qc_bookdata': {
        description: '书籍扩展数据表',
        requiredFields: ['id', 'book_id', 'page_count', 'standard_price', 'purchase_price', 'book_type']
      },
      'qc_bookmarks': {
        description: '书摘表',
        requiredFields: ['id', 'book_id', 'content']
      },
      'qc_bookmark_tags': {
        description: '书摘标签关联表',
        requiredFields: ['id', 'bookmark_id', 'tag_id']
      },
      'qc_book_groups': {
        description: '书籍分组关联表',
        requiredFields: ['id', 'book_id', 'group_id']
      },
      'qc_book_tags': {
        description: '书籍标签关联表',
        requiredFields: ['id', 'book_id', 'tag_name']
      },
      'qc_reading_records': {
        description: '阅读记录表',
        requiredFields: ['id', 'book_id', 'reader_id', 'start_time', 'duration']
      },
      'qc_daily_reading_stats': {
        description: '每日阅读统计表',
        requiredFields: ['id', 'reader_id', 'date', 'total_time', 'total_pages']
      },
      'qc_reading_goals': {
        description: '阅读目标表',
        requiredFields: ['id', 'reader_id', 'year', 'target', 'completed']
      },
      'qc_comments': {
        description: '评论表',
        requiredFields: ['id', 'book_id', 'user_id', 'content']
      },
      'qc_wishlist': {
        description: '愿望清单表',
        requiredFields: ['id', 'reader_id', 'isbn', 'title']
      }
    };

    for (const [tableName, config] of Object.entries(requiredTables)) {
      const exists = checkTableExists(db, tableName);
      checkResults.qcbooklog.tables[tableName] = { exists, description: config.description };
      
      if (!exists) {
        log(`表 ${tableName} (${config.description}) 不存在`, 'error');
        checkResults.qcbooklog.errors.push(`表 ${tableName} 不存在`);
        checkResults.success = false;
      } else {
        log(`表 ${tableName} (${config.description}) 存在`, 'success');
        
        if (config.requiredFields) {
          for (const field of config.requiredFields) {
            const fieldExists = checkColumnExists(db, tableName, field);
            if (!fieldExists) {
              log(`  字段 ${field} 不存在`, 'warning');
              checkResults.qcbooklog.fields[`${tableName}.${field}`] = { exists: false };
              checkResults.qcbooklog.warnings.push(`表 ${tableName} 缺少字段 ${field}`);
            } else {
              checkResults.qcbooklog.fields[`${tableName}.${field}`] = { exists: true };
            }
          }
        }
      }
    }

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    log(`QCBookLog 数据库共有 ${tables.length} 个表`, 'info');
    
  } catch (error) {
    log(`检查 QCBookLog 数据库时出错: ${error.message}`, 'error');
    checkResults.qcbooklog.errors.push(error.message);
    checkResults.success = false;
  } finally {
    db.close();
  }
}

function generateReport() {
  log('\n=== 数据库完整性检查报告 ===', 'info');
  
  log('\n【Talebook 数据库】', 'info');
  log(`  表检查: ${Object.keys(checkResults.talebook.tables).length} 个表`, 'info');
  log(`  错误: ${checkResults.talebook.errors.length} 个`, checkResults.talebook.errors.length > 0 ? 'error' : 'success');
  log(`  警告: ${checkResults.talebook.warnings.length} 个`, checkResults.talebook.warnings.length > 0 ? 'warning' : 'success');
  
  if (checkResults.talebook.errors.length > 0) {
    checkResults.talebook.errors.forEach(err => log(`    - ${err}`, 'error'));
  }
  
  log('\n【QCBookLog 数据库】', 'info');
  log(`  表检查: ${Object.keys(checkResults.qcbooklog.tables).length} 个表`, 'info');
  log(`  错误: ${checkResults.qcbooklog.errors.length} 个`, checkResults.qcbooklog.errors.length > 0 ? 'error' : 'success');
  log(`  警告: ${checkResults.qcbooklog.warnings.length} 个`, checkResults.qcbooklog.warnings.length > 0 ? 'warning' : 'success');
  
  if (checkResults.qcbooklog.errors.length > 0) {
    checkResults.qcbooklog.errors.forEach(err => log(`    - ${err}`, 'error'));
  }
  
  log('\n【总体结果】', 'info');
  log(`检查状态: ${checkResults.success ? '通过 ✅' : '存在问题 ❌'}`, checkResults.success ? 'success' : 'error');
  
  return checkResults;
}

async function main() {
  log('开始数据库完整性检查...', 'info');
  log(`项目根目录: ${projectRoot}`, 'info');
  log(`Talebook 数据库路径: ${TALEBOOK_DB_PATH}`, 'info');
  log(`QCBookLog 数据库路径: ${QCBOOKLOG_DB_PATH}`, 'info');
  
  checkTalebookDatabase();
  checkQcbooklogDatabase();
  
  const results = generateReport();
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('执行失败:', error);
      process.exit(1);
    });
}

export { checkResults, checkTalebookDatabase, checkQcbooklogDatabase, generateReport };
export default main;
