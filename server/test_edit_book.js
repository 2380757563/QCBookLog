import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 测试编辑书籍功能...\n');

async function testEditBook() {
  try {
    // 步骤 1: 获取书籍列表
    console.log('📋 步骤 1: 获取书籍列表');
    const booksResponse = await axios.get(`${API_BASE_URL}/books`);
    const books = booksResponse.data;
    console.log(`  获取到 ${books.length} 本书`);
    
    if (books.length === 0) {
      console.log('❌ 没有书籍可以编辑');
      return;
    }
    
    // 选择第一本书进行测试
    const testBook = books[0];
    console.log(`  选择书籍: [${testBook.id}] ${testBook.title}`);
    
    // 步骤 2: 获取书籍详细信息
    console.log('\n📋 步骤 2: 获取书籍详细信息');
    const bookDetailResponse = await axios.get(`${API_BASE_URL}/books/${testBook.id}`);
    const bookDetail = bookDetailResponse.data;
    console.log(`  书籍详情:`, JSON.stringify({
      id: bookDetail.id,
      title: bookDetail.title,
      pages: bookDetail.pages,
      standardPrice: bookDetail.standardPrice,
      purchasePrice: bookDetail.purchasePrice,
      purchaseDate: bookDetail.purchaseDate,
      binding1: bookDetail.binding1,
      binding2: bookDetail.binding2,
      paper1: bookDetail.paper1,
      edge1: bookDetail.edge1,
      edge2: bookDetail.edge2,
      book_type: bookDetail.book_type
    }, null, 2));
    
    // 步骤 3: 更新书籍信息
    console.log('\n📋 步骤 3: 更新书籍信息');
    const updateData = {
      pages: 500,
      standardPrice: 59.90,
      purchasePrice: 45.50,
      purchaseDate: '2024-01-15',
      binding1: 1,
      binding2: 1,
      paper1: 1,
      edge1: 1,
      edge2: 1,
      book_type: 1,
      note: '测试备注'
    };
    
    console.log('  更新数据:', JSON.stringify(updateData, null, 2));
    
    const updateResponse = await axios.put(`${API_BASE_URL}/books/${testBook.id}`, updateData);
    console.log('  ✅ 书籍更新成功');
    
    // 步骤 4: 再次获取书籍详细信息，验证更新
    console.log('\n📋 步骤 4: 验证更新结果');
    const updatedBookResponse = await axios.get(`${API_BASE_URL}/books/${testBook.id}`);
    const updatedBook = updatedBookResponse.data;
    
    console.log('  更新后的书籍详情:', JSON.stringify({
      id: updatedBook.id,
      title: updatedBook.title,
      pages: updatedBook.pages,
      standardPrice: updatedBook.standardPrice,
      purchasePrice: updatedBook.purchasePrice,
      purchaseDate: updatedBook.purchaseDate,
      binding1: updatedBook.binding1,
      binding2: updatedBook.binding2,
      paper1: updatedBook.paper1,
      edge1: updatedBook.edge1,
      edge2: updatedBook.edge2,
      book_type: updatedBook.book_type,
      note: updatedBook.note
    }, null, 2));
    
    // 步骤 5: 检查数据库中的数据
    console.log('\n📋 步骤 5: 检查数据库中的数据');
    
    const Database = (await import('better-sqlite3')).default;
    const path = (await import('path')).default;
    
    const talebookDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\talebook\\calibre-webserver.db');
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    // 检查 Talebook items 表
    const item = talebookDb.prepare('SELECT * FROM items WHERE book_id = ?').get(testBook.id);
    if (item) {
      console.log('  Talebook items 表:');
      console.log(`    book_id: ${item.book_id}`);
      console.log(`    book_type: ${item.book_type}`);
    } else {
      console.log('  ❌ Talebook items 表中未找到记录');
    }
    
    // 检查 QCBookLog qc_bookdata 表
    const qcBookdata = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(testBook.id);
    if (qcBookdata) {
      console.log('  QCBookLog qc_bookdata 表:');
      console.log(`    book_id: ${qcBookdata.book_id}`);
      console.log(`    page_count: ${qcBookdata.page_count}`);
      console.log(`    standard_price: ${qcBookdata.standard_price}`);
      console.log(`    purchase_price: ${qcBookdata.purchase_price}`);
      console.log(`    purchase_date: ${qcBookdata.purchase_date}`);
      console.log(`    binding1: ${qcBookdata.binding1}`);
      console.log(`    binding2: ${qcBookdata.binding2}`);
      console.log(`    paper1: ${qcBookdata.paper1}`);
      console.log(`    edge1: ${qcBookdata.edge1}`);
      console.log(`    edge2: ${qcBookdata.edge2}`);
      console.log(`    note: ${qcBookdata.note}`);
    } else {
      console.log('  ❌ QCBookLog qc_bookdata 表中未找到记录');
    }
    
    talebookDb.close();
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

testEditBook();