/**
 * 重构书摘相关表结构（修正版）
 * 目标：创建简洁、高效的书摘和标签表，完美支持书籍摘录并持久化
 * 
 * 说明：
 * - calibre-webserver.db 是 Talebook 的用户认证数据库
 * - books 表在 Calibre 主数据库中（metadata.db）
 * - items 表的 book_id 对应 Calibre 主数据库中 books 表的 id
 * - qc_bookmarks 的 book_id 应该与 items 表的 book_id 保持一致
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'calibre-webserver.db');

console.log('📚 开始重构书摘表结构...');
console.log('📁 数据库路径:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: false, fileMustExist: true });

// 启用外键约束
db.pragma('foreign_keys = ON');
console.log('✅ 外键约束已启用');

// 检查表是否存在
const checkTable = (tableName) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
  return !!result;
};

// 备份旧表数据
const backupOldData = () => {
  console.log('\n🔄 备份旧表数据...');

  if (checkTable('qc_bookmarks')) {
    const bookmarks = db.prepare('SELECT * FROM qc_bookmarks').all();
    console.log(`📦 备份 qc_bookmarks: ${bookmarks.length} 条记录`);
    if (bookmarks.length > 0) {
      fs.writeFileSync(
        path.join(process.cwd(), 'data', 'backup_qc_bookmarks.json'),
        JSON.stringify(bookmarks, null, 2)
      );
    }
  }

  if (checkTable('qc_bookmark_tags')) {
    const tags = db.prepare('SELECT * FROM qc_bookmark_tags').all();
    console.log(`📦 备份 qc_bookmark_tags: ${tags.length} 条记录`);
    if (tags.length > 0) {
      fs.writeFileSync(
        path.join(process.cwd(), 'data', 'backup_qc_bookmark_tags.json'),
        JSON.stringify(tags, null, 2)
      );
    }
  }

  console.log('✅ 备份完成');
};

// 删除旧表
const dropOldTables = () => {
  console.log('\n🗑️  删除旧表...');

  if (checkTable('qc_bookmark_tags')) {
    db.prepare('DROP TABLE IF EXISTS qc_bookmark_tags').run();
    console.log('✅ 删除 qc_bookmark_tags');
  }

  if (checkTable('qc_bookmarks')) {
    db.prepare('DROP TABLE IF EXISTS qc_bookmarks').run();
    console.log('✅ 删除 qc_bookmarks');
  }
};

// 创建新的 qc_bookmarks 表
const createBookmarksTable = () => {
  console.log('\n📝 创建 qc_bookmarks 表...');

  // 注意：不设置外键约束到 books 表，因为 books 表在另一个数据库中
  // book_id 字段存储的是 Calibre 主数据库中 books 表的 id
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS qc_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      note TEXT,
      page_num INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.prepare(createTableSQL).run();
  console.log('✅ qc_bookmarks 表创建成功');

  // 创建索引
  db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON qc_bookmarks(book_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON qc_bookmarks(created_at DESC)').run();
  console.log('✅ 索引创建成功');
};

// 创建新的 qc_bookmark_tags 表
const createBookmarkTagsTable = () => {
  console.log('\n📝 创建 qc_bookmark_tags 表...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS qc_bookmark_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookmark_id INTEGER NOT NULL,
      tag_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookmark_id) REFERENCES qc_bookmarks(id) ON DELETE CASCADE,
      UNIQUE(bookmark_id, tag_name)
    )
  `;

  db.prepare(createTableSQL).run();
  console.log('✅ qc_bookmark_tags 表创建成功');

  // 创建索引
  db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmark_id ON qc_bookmark_tags(bookmark_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag_name ON qc_bookmark_tags(tag_name)').run();
  console.log('✅ 索引创建成功');
};

// 插入测试数据
const insertTestData = () => {
  console.log('\n🧪 插入测试数据...');

  // 检查 items 表中是否有数据
  const items = db.prepare('SELECT book_id FROM items LIMIT 3').all();
  
  if (items.length === 0) {
    console.warn('⚠️  items 表中没有数据，跳过测试数据插入');
    return;
  }

  console.log(`📚 找到 ${items.length} 个书籍ID`);

  // 插入测试书摘
  const testBookmarks = [
    {
      book_id: items[0].book_id,
      content: '这是一段测试书摘内容，用于验证数据库结构是否正确。',
      note: '这是我的读书笔记',
      page_num: 123
    },
    {
      book_id: items[0].book_id,
      content: '另一段测试书摘，展示同一本书可以有多个书摘。',
      note: '重要段落',
      page_num: 456
    }
  ];

  for (const bookmark of testBookmarks) {
    const insertSQL = `
      INSERT INTO qc_bookmarks (book_id, content, note, page_num)
      VALUES (?, ?, ?, ?)
    `;
    const result = db.prepare(insertSQL).run(
      bookmark.book_id,
      bookmark.content,
      bookmark.note,
      bookmark.page_num
    );

    const bookmarkId = result.lastInsertRowid;

    // 为第一个书摘添加标签
    if (bookmarkId === 1) {
      const tags = ['重要', '经典', '推荐'];
      for (const tag of tags) {
        const insertTagSQL = `
          INSERT OR IGNORE INTO qc_bookmark_tags (bookmark_id, tag_name)
          VALUES (?, ?)
        `;
        db.prepare(insertTagSQL).run(bookmarkId, tag);
      }
    }

    console.log(`✅ 插入书摘 ID: ${bookmarkId}, 书籍ID: ${bookmark.book_id}`);
  }

  console.log('✅ 测试数据插入完成');
};

// 验证表结构
const verifyTables = () => {
  console.log('\n🔍 验证表结构...');

  // 验证 qc_bookmarks 表
  const bookmarks = db.prepare('SELECT * FROM qc_bookmarks').all();
  console.log(`📊 qc_bookmarks 表: ${bookmarks.length} 条记录`);
  if (bookmarks.length > 0) {
    console.log('   示例记录:', JSON.stringify(bookmarks[0], null, 2));
  }

  // 验证 qc_bookmark_tags 表
  const tags = db.prepare('SELECT * FROM qc_bookmark_tags').all();
  console.log(`📊 qc_bookmark_tags 表: ${tags.length} 条记录`);
  if (tags.length > 0) {
    console.log('   示例记录:', JSON.stringify(tags[0], null, 2));
  }

  // 验证外键关系
  console.log('\n🔗 验证外键关系...');
  const foreignKeys = db.pragma('foreign_key_list(qc_bookmarks)');
  console.log('   qc_bookmarks 外键:', JSON.stringify(foreignKeys, null, 2));

  const bookmarkTagsForeignKeys = db.pragma('foreign_key_list(qc_bookmark_tags)');
  console.log('   qc_bookmark_tags 外键:', JSON.stringify(bookmarkTagsForeignKeys, null, 2));
};

// 主函数
const main = () => {
  try {
    // 备份旧数据
    backupOldData();

    // 删除旧表
    dropOldTables();

    // 创建新表
    createBookmarksTable();
    createBookmarkTagsTable();

    // 插入测试数据
    insertTestData();

    // 验证表结构
    verifyTables();

    console.log('\n✨ 表结构重构完成！');
    console.log('\n📋 新表结构说明:');
    console.log('   qc_bookmarks:');
    console.log('     - id: 主键');
    console.log('     - book_id: 书籍ID（对应 Calibre 主数据库 books 表的 id）');
    console.log('     - content: 书摘内容');
    console.log('     - note: 读书笔记');
    console.log('     - page_num: 页码');
    console.log('     - created_at: 创建时间');
    console.log('     - updated_at: 更新时间');
    console.log('   qc_bookmark_tags:');
    console.log('     - id: 主键');
    console.log('     - bookmark_id: 外键，关联 qc_bookmarks 表');
    console.log('     - tag_name: 标签名称');
    console.log('     - created_at: 创建时间');

  } catch (error) {
    console.error('❌ 重构失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
    console.log('\n🔌 数据库连接已关闭');
  }
};

main();
