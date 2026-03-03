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
console.log('📚 ISBN 图书添加测试');
console.log('========================================');
console.log(`📖 ISBN: ${ISBN}`);
console.log(`📂 Calibre 数据库: ${CALIBRE_PATH}`);
console.log(`📂 QCBookLog 数据库: ${QC_BOOKLOG_PATH}`);
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
      console.log(`  出版日期: ${bookData.pubdate}`);
      console.log(`  页数: ${bookData.pages}`);
      console.log(`  ISBN: ${bookData.isbn13}`);
      console.log(`  评分: ${bookData.rating?.average || 0}`);
      console.log(`  封面: ${bookData.images?.large || '无'}`);
    } else {
      console.log('❌ 获取图书元数据失败:', result.msg);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 调用 DBR API 失败:', error.message);
    console.log('⚠️ 请确保服务器正在运行 (npm run dev)');
    process.exit(1);
  }

  // 步骤 2: 添加图书到书架
  console.log('\n步骤 2: 添加图书到书架');
  console.log('----------------------------------------');
  
  let addedBook = null;
  try {
    const addData = {
      title: bookData.title,
      author: bookData.author ? bookData.author.join(' & ') : '未知',
      publisher: bookData.publisher || '',
      pubdate: bookData.pubdate || null,
      isbn: bookData.isbn13 || ISBN,
      pages: bookData.pages || 0,
      description: bookData.summary || '',
      tags: bookData.tags || [],
      rating: bookData.rating?.average || 0,
      cover: bookData.images?.large || ''
    };
    
    console.log('📤 发送添加请求...');
    console.log('  数据:', JSON.stringify(addData, null, 2).substring(0, 500) + '...');
    
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addData)
    });
    
    const result = await response.json();
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
    
    if (result.code === 0 || result.id || result.data?.id) {
      addedBook = result.data || result;
      console.log('✅ 图书添加成功, ID:', addedBook.id || result.id);
    } else {
      console.log('❌ 图书添加失败:', result.msg || result.message || '未知错误');
    }
  } catch (error) {
    console.error('❌ 添加图书失败:', error.message);
  }

  // 步骤 3: 验证数据是否写入 Calibre 数据库
  console.log('\n步骤 3: 验证数据是否写入 Calibre 数据库');
  console.log('----------------------------------------');
  
  try {
    const calibreDb = new Database(CALIBRE_PATH);
    
    const bookCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
    console.log(`📊 Calibre 书籍总数: ${bookCount.count}`);
    
    const lastBooks = calibreDb.prepare(`
      SELECT id, title, uuid, timestamp 
      FROM books 
      ORDER BY id DESC 
      LIMIT 5
    `).all();
    console.log('📚 最近添加的书籍:');
    lastBooks.forEach(book => {
      console.log(`  ID=${book.id}, 标题="${book.title}", 时间=${book.timestamp}`);
    });
    
    const isbnBook = calibreDb.prepare(`
      SELECT b.id, b.title, i.val as isbn
      FROM books b
      JOIN identifiers i ON b.id = i.book
      WHERE i.type = 'isbn' AND i.val = ?
    `).get(ISBN);
    
    if (isbnBook) {
      console.log(`\n✅ 找到 ISBN=${ISBN} 的书籍:`);
      console.log(`  ID: ${isbnBook.id}`);
      console.log(`  标题: ${isbnBook.title}`);
      console.log(`  ISBN: ${isbnBook.isbn}`);
    } else {
      console.log(`\n⚠️ 未找到 ISBN=${ISBN} 的书籍`);
    }
    
    calibreDb.close();
  } catch (error) {
    console.error('❌ 验证 Calibre 数据库失败:', error.message);
  }

  // 步骤 4: 验证 QCBookLog 映射
  console.log('\n步骤 4: 验证 QCBookLog 映射');
  console.log('----------------------------------------');
  
  try {
    const qcBooklogDb = new Database(QC_BOOKLOG_PATH);
    
    const mappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
    console.log(`📊 映射记录总数: ${mappingCount.count}`);
    
    const lastMappings = qcBooklogDb.prepare(`
      SELECT id, library_uuid, calibre_book_id, title, author, created_at
      FROM qc_book_mapping
      ORDER BY id DESC
      LIMIT 5
    `).all();
    console.log('📚 最近添加的映射:');
    lastMappings.forEach(m => {
      console.log(`  ID=${m.id}, book_id=${m.calibre_book_id}, 标题="${m.title}", library_uuid=${m.library_uuid?.substring(0, 8)}...`);
    });
    
    qcBooklogDb.close();
  } catch (error) {
    console.error('❌ 验证 QCBookLog 数据库失败:', error.message);
  }

  console.log('\n========================================');
  console.log('📋 测试完成');
  console.log('========================================');
}

main().catch(console.error);
