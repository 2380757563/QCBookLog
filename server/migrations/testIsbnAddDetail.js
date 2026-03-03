import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const require = createRequire(import.meta.url);
let Database = null;

try {
  const module = require('better-sqlite3');
  Database = module.default || module;
} catch (error) {
  console.error('❌ better-sqlite3 未安装');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CALIBRE_PATH = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db';
const QC_BOOKLOG_PATH = path.join(__dirname, '../../data/qc_booklog.db');
const ISBN = '9787530220290';

console.log('========================================');
console.log('📚 ISBN 图书添加测试（详细版）');
console.log('========================================\n');

async function main() {
  // 步骤 1: 调用 DBR API 获取图书元数据
  console.log('步骤 1: 调用 DBR API 获取图书元数据');
  console.log('----------------------------------------');
  
  let bookData = null;
  try {
    const response = await fetch(`http://localhost:7401/api/dbr/isbn/${ISBN}`);
    const result = await response.json();
    
    if (result.code === 0 && result.data) {
      bookData = result.data;
      console.log('✅ 成功获取图书元数据:');
      console.log(`  标题: ${bookData.title}`);
      console.log(`  作者: ${bookData.author ? bookData.author.join(', ') : '未知'}`);
      console.log(`  出版社: ${bookData.publisher}`);
      console.log(`  ISBN: ${bookData.isbn13}`);
    } else {
      console.log('❌ 获取图书元数据失败:', result.msg);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 调用 DBR API 失败:', error.message);
    process.exit(1);
  }

  // 步骤 2: 记录添加前的状态
  console.log('\n步骤 2: 记录添加前的状态');
  console.log('----------------------------------------');
  
  const calibreDb = new Database(CALIBRE_PATH);
  const qcBooklogDb = new Database(QC_BOOKLOG_PATH);
  
  calibreDb.pragma('journal_mode = WAL');
  qcBooklogDb.pragma('journal_mode = WAL');
  
  const beforeBooks = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
  const beforeMappings = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
  
  console.log(`  Calibre 书籍数量: ${beforeBooks.count}`);
  console.log(`  QCBookLog 映射数量: ${beforeMappings.count}`);
  
  const beforeLastBook = calibreDb.prepare('SELECT id, title FROM books ORDER BY id DESC LIMIT 1').get();
  console.log(`  最后书籍: ID=${beforeLastBook?.id}, 标题="${beforeLastBook?.title}"`);

  // 步骤 3: 添加图书
  console.log('\n步骤 3: 添加图书到书架');
  console.log('----------------------------------------');
  
  const addData = {
    title: bookData.title,
    author: bookData.author ? bookData.author.join(' & ') : '未知',
    publisher: bookData.publisher || '',
    pubdate: bookData.pubdate || null,
    isbn: bookData.isbn13 || ISBN,
    pages: bookData.pages || 0,
    description: bookData.summary || '',
    tags: bookData.tags || [],
    rating: bookData.rating?.average || 0
  };
  
  console.log('📤 发送添加请求...');
  console.log('  标题:', addData.title);
  console.log('  作者:', addData.author);
  console.log('  ISBN:', addData.isbn);
  
  const response = await fetch('http://localhost:7401/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addData)
  });
  
  const result = await response.json();
  console.log('\n📥 响应状态:', response.status);
  console.log('📥 响应数据:', JSON.stringify(result, null, 2));

  // 步骤 4: 验证数据库变化
  console.log('\n步骤 4: 验证数据库变化');
  console.log('----------------------------------------');
  
  calibreDb.pragma('wal_checkpoint(PASSIVE)');
  
  const afterBooks = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
  console.log(`  Calibre 书籍数量: ${afterBooks.count} (之前: ${beforeBooks.count})`);
  
  const afterLastBook = calibreDb.prepare('SELECT id, title, uuid FROM books ORDER BY id DESC LIMIT 1').get();
  console.log(`  最后书籍: ID=${afterLastBook?.id}, 标题="${afterLastBook?.title}"`);
  
  // 检查是否添加成功
  if (afterBooks.count > beforeBooks.count) {
    console.log('  ✅ 书籍已添加到 Calibre 数据库');
    
    // 检查 ISBN 是否正确
    const isbnCheck = calibreDb.prepare(`
      SELECT b.id, b.title, i.val as isbn
      FROM books b
      LEFT JOIN identifiers i ON b.id = i.book AND i.type = 'isbn'
      WHERE b.id = ?
    `).get(afterLastBook.id);
    
    console.log(`  书籍详情: ID=${isbnCheck?.id}, 标题="${isbnCheck?.title}", ISBN="${isbnCheck?.isbn}"`);
    
    if (isbnCheck?.isbn === ISBN) {
      console.log('  ✅ ISBN 正确写入');
    } else {
      console.log('  ⚠️ ISBN 未正确写入，期望:', ISBN, '实际:', isbnCheck?.isbn);
    }
  } else {
    console.log('  ❌ 书籍未添加到 Calibre 数据库');
  }
  
  // 检查 QCBookLog 映射
  const afterMappings = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
  console.log(`  QCBookLog 映射数量: ${afterMappings.count} (之前: ${beforeMappings.count})`);
  
  const lastMapping = qcBooklogDb.prepare(`
    SELECT id, library_uuid, calibre_book_id, title, author 
    FROM qc_book_mapping 
    ORDER BY id DESC LIMIT 1
  `).get();
  console.log(`  最后映射: ID=${lastMapping?.id}, book_id=${lastMapping?.calibre_book_id}, 标题="${lastMapping?.title}"`);
  
  // 步骤 5: 检查 API 返回的书籍是否与数据库一致
  console.log('\n步骤 5: 检查 API 返回一致性');
  console.log('----------------------------------------');
  
  if (result.id === afterLastBook?.id) {
    console.log('  ✅ API 返回的 ID 与数据库一致');
  } else {
    console.log('  ❌ API 返回的 ID 与数据库不一致');
    console.log(`     API 返回: ID=${result.id}, 标题="${result.title}"`);
    console.log(`     数据库实际: ID=${afterLastBook?.id}, 标题="${afterLastBook?.title}"`);
  }
  
  if (result.title === addData.title) {
    console.log('  ✅ API 返回的标题与请求一致');
  } else {
    console.log('  ❌ API 返回的标题与请求不一致');
    console.log(`     请求标题: "${addData.title}"`);
    console.log(`     API 返回: "${result.title}"`);
  }

  calibreDb.close();
  qcBooklogDb.close();

  console.log('\n========================================');
  console.log('📋 测试完成');
  console.log('========================================');
}

main().catch(console.error);
