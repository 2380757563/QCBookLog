import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 测试添加书籍并检查 Talebook items 表...\n');

async function testBookAddition() {
  try {
    // 步骤 1: 添加一本测试书籍
    console.log('📋 步骤 1: 添加一本测试书籍');
    const testBook = {
      title: '测试书籍-TalebookItems',
      author: '测试作者',
      publisher: '测试出版社',
      publishYear: 2024,
      pages: 300,
      standardPrice: 45.00,
      purchasePrice: 38.50,
      purchaseDate: '2024-01-15',
      binding1: 1,
      binding2: 2,
      note: '这是一本测试书籍'
    };

    console.log(`  正在添加书籍: ${testBook.title}`);
    const addResponse = await axios.post(`${API_BASE_URL}/books`, testBook);
    const newBookId = addResponse.data.id;
    console.log(`  ✅ 书籍添加成功: [${newBookId}] ${testBook.title}`);

    // 步骤 2: 检查数据库状态
    console.log('\n📋 步骤 2: 检查数据库状态');
    
    const Database = (await import('better-sqlite3')).default;
    const path = (await import('path')).default;
    
    const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
    
    const itemsCount = talebookDb.prepare('SELECT COUNT(*) as count FROM items').get();
    console.log(`  Talebook items 表记录数: ${itemsCount.count}`);
    
    if (itemsCount.count > 0) {
      const items = talebookDb.prepare('SELECT * FROM items WHERE book_id = ?').get(newBookId);
      if (items) {
        console.log(`  ✅ items 表中找到记录: book_id=${items.book_id}, book_type=${items.book_type}`);
      } else {
        console.log(`  ❌ items 表中未找到 book_id=${newBookId} 的记录`);
      }
    } else {
      console.log(`  ❌ items 表为空，没有记录`);
    }
    
    talebookDb.close();
    
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    const mappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping WHERE calibre_book_id = ?').get(newBookId);
    console.log(`  QCBookLog qc_book_mapping 表记录数: ${mappingCount.count}`);
    
    if (mappingCount.count > 0) {
      console.log(`  ✅ qc_book_mapping 表中找到记录`);
    } else {
      console.log(`  ❌ qc_book_mapping 表中未找到 calibre_book_id=${newBookId} 的记录`);
    }
    
    const qcBookdataCount2 = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_bookdata WHERE book_id = ?').get(newBookId);
    console.log(`  QCBookLog qc_bookdata 表记录数: ${qcBookdataCount2.count}`);
    
    if (qcBookdataCount2.count > 0) {
      console.log(`  ✅ QCBookLog qc_bookdata 表中找到记录`);
    } else {
      console.log(`  ❌ QCBookLog qc_bookdata 表中未找到 book_id=${newBookId} 的记录`);
    }
    
    qcBooklogDb.close();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:');
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据:`, error.response.data);
    } else {
      console.error(`  错误信息: ${error.message}`);
    }
    process.exit(1);
  }
}

testBookAddition();