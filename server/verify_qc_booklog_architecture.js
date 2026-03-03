import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TALEBOOK_DB_PATH = path.join(__dirname, '../data/talebook/calibre-webserver.db');
const QC_BOOKLOG_DB_PATH = path.join(__dirname, '../data/qc_booklog.db');

console.log('🔍 开始验证 QCBookLog 数据库架构...\n');

let allPassed = true;

try {
  const talebookDb = new Database(TALEBOOK_DB_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_DB_PATH);

  console.log('📋 检查 1: 验证所有表是否创建成功');
  const expectedTables = [
    'qc_book_mapping',
    'qc_users',
    'qc_groups',
    'qc_tags',
    'qc_bookdata',
    'qc_bookmarks',
    'qc_bookmark_tags',
    'qc_book_groups',
    'qc_book_tags',
    'qc_reading_records',
    'qc_daily_reading_stats',
    'qc_reading_goals',
    'qc_comments'
  ];

  const qcTables = qcBooklogDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const qcTableNames = new Set(qcTables.map(t => t.name));

  expectedTables.forEach(tableName => {
    if (qcTableNames.has(tableName)) {
      console.log(`  ✅ ${tableName} 表存在`);
    } else {
      console.log(`  ❌ ${tableName} 表不存在`);
      allPassed = false;
    }
  });

  console.log('\n📋 检查 2: 验证外键约束');
  const foreignKeyChecks = [
    { table: 'qc_bookdata', fk: 'book_id', ref: 'qc_book_mapping', refField: 'calibre_book_id' },
    { table: 'qc_bookmarks', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_bookmark_tags', fk: 'bookmark_id', ref: 'qc_bookmarks', refField: 'id' },
    { table: 'qc_bookmark_tags', fk: 'tag_id', ref: 'qc_tags', refField: 'id' },
    { table: 'qc_book_groups', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_book_groups', fk: 'group_id', ref: 'qc_groups', refField: 'id' },
    { table: 'qc_book_tags', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_reading_records', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_reading_records', fk: 'reader_id', ref: 'qc_users', refField: 'id' },
    { table: 'qc_daily_reading_stats', fk: 'reader_id', ref: 'qc_users', refField: 'id' },
    { table: 'qc_reading_goals', fk: 'reader_id', ref: 'qc_users', refField: 'id' },
    { table: 'qc_comments', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_comments', fk: 'user_id', ref: 'qc_users', refField: 'id' }
  ];

  foreignKeyChecks.forEach(check => {
    const foreignKeys = qcBooklogDb.prepare(`PRAGMA foreign_key_list(${check.table})`).all();
    const hasForeignKey = foreignKeys.some(fk => 
      fk.from === check.fk && fk.table === check.ref && fk.to === check.refField
    );

    if (hasForeignKey) {
      console.log(`  ✅ ${check.table}.${check.fk} -> ${check.ref}.${check.refField}`);
    } else {
      console.log(`  ❌ ${check.table}.${check.fk} -> ${check.ref}.${check.refField} (外键不存在)`);
      allPassed = false;
    }
  });

  console.log('\n📋 检查 3: 验证唯一性约束');
  const uniqueChecks = [
    { table: 'qc_book_mapping', columns: ['calibre_book_id', 'talebook_book_id'] },
    { table: 'qc_users', columns: ['username'] },
    { table: 'qc_tags', columns: ['name'] },
    { table: 'qc_bookdata', columns: ['book_id'] },
    { table: 'qc_daily_reading_stats', columns: ['reader_id', 'date'] },
    { table: 'qc_reading_goals', columns: ['reader_id', 'year'] }
  ];

  uniqueChecks.forEach(check => {
    const tableInfo = qcBooklogDb.prepare(`PRAGMA table_info(${check.table})`).all();
    const indexes = qcBooklogDb.prepare(`PRAGMA index_list(${check.table})`).all();
    
    let hasUnique = false;
    indexes.forEach(idx => {
      const indexInfo = qcBooklogDb.prepare(`PRAGMA index_info(${idx.name})`).all();
      const indexColumns = indexInfo.map(info => {
        const col = tableInfo.find(c => c.cid === info.cid);
        return col ? col.name : '';
      });
      
      if (indexColumns.join(',') === check.columns.join(',')) {
        hasUnique = idx.unique === 1;
      }
    });

    if (hasUnique) {
      console.log(`  ✅ ${check.table}(${check.columns.join(', ')}) 唯一性约束存在`);
    } else {
      console.log(`  ⚠️ ${check.table}(${check.columns.join(', ')}) 唯一性约束可能不存在`);
    }
  });

  console.log('\n📋 检查 4: 验证索引');
  const indexChecks = [
    { table: 'qc_book_mapping', index: 'idx_mapping_calibre', columns: ['calibre_book_id'] },
    { table: 'qc_book_mapping', index: 'idx_mapping_talebook', columns: ['talebook_book_id'] },
    { table: 'qc_users', index: 'idx_users_username', columns: ['username'] },
    { table: 'qc_users', index: 'idx_users_email', columns: ['email'] },
    { table: 'qc_groups', index: 'idx_groups_name', columns: ['name'] },
    { table: 'qc_tags', index: 'idx_tags_name', columns: ['name'] },
    { table: 'qc_bookdata', index: 'idx_bookdata_book_id', columns: ['book_id'] },
    { table: 'qc_bookmarks', index: 'idx_bookmarks_book_id', columns: ['book_id'] },
    { table: 'qc_bookmarks', index: 'idx_bookmarks_created_at', columns: ['created_at'] },
    { table: 'qc_reading_records', index: 'idx_reading_book_reader', columns: ['book_id', 'reader_id'] },
    { table: 'qc_reading_records', index: 'idx_reading_date', columns: ['start_time'] },
    { table: 'qc_reading_records', index: 'idx_reading_reader_date', columns: ['reader_id', 'start_time'] },
    { table: 'qc_daily_reading_stats', index: 'idx_daily_stats_reader_date', columns: ['reader_id', 'date'] },
    { table: 'qc_reading_goals', index: 'idx_reading_goals_reader_year', columns: ['reader_id', 'year'] },
    { table: 'qc_comments', index: 'idx_comments_book_id', columns: ['book_id'] },
    { table: 'qc_comments', index: 'idx_comments_user_id', columns: ['user_id'] }
  ];

  indexChecks.forEach(check => {
    const indexes = qcBooklogDb.prepare(`PRAGMA index_list(${check.table})`).all();
    const indexExists = indexes.some(idx => idx.name === check.index);

    if (indexExists) {
      console.log(`  ✅ ${check.index} 索引存在`);
    } else {
      console.log(`  ❌ ${check.index} 索引不存在`);
      allPassed = false;
    }
  });

  console.log('\n📋 检查 5: 验证数据完整性');
  const integrityChecks = [
    { table: 'qc_bookdata', fk: 'book_id', ref: 'qc_book_mapping', refField: 'calibre_book_id' },
    { table: 'qc_bookmarks', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' },
    { table: 'qc_reading_records', fk: 'book_id', ref: 'qc_bookdata', refField: 'book_id' }
  ];

  integrityChecks.forEach(check => {
    const invalidCount = qcBooklogDb.prepare(`
      SELECT COUNT(*) as count FROM ${check.table} t
      LEFT JOIN ${check.ref} r ON t.${check.fk} = r.${check.refField}
      WHERE r.${check.refField} IS NULL
    `).get().count;

    if (invalidCount === 0) {
      console.log(`  ✅ ${check.table}.${check.fk} -> ${check.ref}.${check.refField} (0 条无效记录)`);
    } else {
      console.log(`  ❌ ${check.table}.${check.fk} -> ${check.ref}.${check.refField} (${invalidCount} 条无效记录)`);
      allPassed = false;
    }
  });

  console.log('\n📋 检查 6: 验证数据库配置');
  const pragmas = [
    { name: 'journal_mode', expected: 'wal' },
    { name: 'foreign_keys', expected: 1 }
  ];

  pragmas.forEach(prag => {
    const result = qcBooklogDb.prepare(`PRAGMA ${prag.name}`).get();
    const actual = result[prag.name];
    if (actual === prag.expected) {
      console.log(`  ✅ PRAGMA ${prag.name} = ${actual}`);
    } else {
      console.log(`  ❌ PRAGMA ${prag.name} = ${actual} (期望: ${prag.expected})`);
      allPassed = false;
    }
  });

  console.log('\n📋 检查 7: 验证表结构');
  const tableStructureChecks = [
    { table: 'qc_book_mapping', requiredFields: ['id', 'calibre_book_id', 'talebook_book_id', 'created_at', 'updated_at'] },
    { table: 'qc_users', requiredFields: ['id', 'username', 'name', 'email', 'avatar', 'admin', 'active', 'created_at', 'updated_at'] },
    { table: 'qc_bookdata', requiredFields: ['id', 'book_id', 'page_count', 'standard_price', 'purchase_price', 'purchase_date', 'total_reading_time', 'read_pages', 'reading_count', 'last_read_date', 'last_read_duration'] },
    { table: 'qc_bookmarks', requiredFields: ['id', 'book_id', 'content', 'created_at', 'updated_at'] },
    { table: 'qc_reading_records', requiredFields: ['id', 'book_id', 'reader_id', 'start_time', 'end_time', 'duration', 'start_page', 'end_page', 'pages_read'] }
  ];

  tableStructureChecks.forEach(check => {
    const columns = qcBooklogDb.prepare(`PRAGMA table_info(${check.table})`).all();
    const columnNames = new Set(columns.map(c => c.name));
    
    let allFieldsExist = true;
    check.requiredFields.forEach(field => {
      if (!columnNames.has(field)) {
        console.log(`  ❌ ${check.table}.${field} 字段不存在`);
        allFieldsExist = false;
        allPassed = false;
      }
    });

    if (allFieldsExist) {
      console.log(`  ✅ ${check.table} 表结构完整`);
    }
  });

  talebookDb.close();
  qcBooklogDb.close();

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ 所有检查通过! QCBookLog 数据库架构验证成功!');
  } else {
    console.log('❌ 部分检查失败，请查看上述详细信息');
  }
  console.log('='.repeat(50));

} catch (error) {
  console.error('\n❌ 验证过程中发生错误:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}