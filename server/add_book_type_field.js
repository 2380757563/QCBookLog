import Database from 'better-sqlite3';

const qcBooklogDb = new Database('/app/data/qc_booklog.db');

try {
  console.log('🔄 正在添加 book_type 字段到 qc_bookdata 表...');
  
  // 检查字段是否已存在
  const schema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
  const hasBookType = schema.some(col => col.name === 'book_type');
  
  if (hasBookType) {
    console.log('✅ book_type 字段已存在，跳过添加');
  } else {
    // 添加 book_type 字段
    qcBooklogDb.prepare(`ALTER TABLE qc_bookdata ADD COLUMN book_type INTEGER NOT NULL DEFAULT 1`).run();
    console.log('✅ book_type 字段已添加，默认值为 1（实体书）');
  }
  
  // 验证字段
  const newSchema = qcBooklogDb.prepare("PRAGMA table_info(qc_bookdata)").all();
  const bookTypeColumn = newSchema.find(col => col.name === 'book_type');
  console.log('✅ 验证 book_type 字段:');
  console.log('  - 存在:', !!bookTypeColumn);
  console.log('  - 默认值:', bookTypeColumn?.dflt_value, '(1 = 实体书)');
  
} catch (error) {
  console.error('❌ 添加字段失败:', error.message);
} finally {
  qcBooklogDb.close();
}