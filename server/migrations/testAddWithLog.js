const testAddWithLog = async () => {
  console.log('========================================');
  console.log('📚 测试添加书籍并检查映射');
  console.log('========================================\n');

  const addData = {
    title: '测试映射_' + Date.now(),
    author: '测试作者',
    publisher: '测试出版社',
    isbn: '9999999999991',
    pages: 100
  };

  console.log('📤 发送添加请求...');
  console.log('数据:', JSON.stringify(addData, null, 2));

  try {
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addData)
    });

    const result = await response.json();
    console.log('\n📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));

    // 等待一秒让数据库同步
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查映射
    console.log('\n步骤 2: 检查映射');
    console.log('----------------------------------------');
    
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3').default || require('better-sqlite3');
    
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    const mapping = qcBooklogDb.prepare(`
      SELECT * FROM qc_book_mapping WHERE calibre_book_id = ?
    `).get(result.id);
    
    if (mapping) {
      console.log('✅ 映射已创建:');
      console.log('  mapping_id:', mapping.id);
      console.log('  calibre_book_id:', mapping.calibre_book_id);
      console.log('  标题:', mapping.title);
    } else {
      console.log('❌ 映射未创建');
    }
    
    const bookData = qcBooklogDb.prepare(`
      SELECT * FROM qc_bookdata WHERE book_id = ?
    `).get(result.id);
    
    if (bookData) {
      console.log('✅ 扩展数据已创建:');
      console.log('  mapping_id:', bookData.mapping_id);
      console.log('  book_id:', bookData.book_id);
      console.log('  page_count:', bookData.page_count);
    } else {
      console.log('❌ 扩展数据未创建');
    }
    
    qcBooklogDb.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAddWithLog();
