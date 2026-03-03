const testInit = async () => {
  console.log('========================================');
  console.log('📚 测试服务器初始化状态');
  console.log('========================================\n');

  try {
    // 添加书籍并检查服务器响应
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '初始化测试_' + Date.now(),
        author: '测试作者',
        isbn: '9999999999985'
      })
    });

    const result = await response.json();
    console.log('添加书籍成功, ID:', result.id);

    // 等待服务器处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查数据库
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3').default || require('better-sqlite3');
    
    const calibreDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db');
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    // 检查书籍是否在 Calibre 中
    const book = calibreDb.prepare('SELECT * FROM books WHERE id = ?').get(result.id);
    console.log('\nCalibre 书籍:', book ? '✅ 存在' : '❌ 不存在');
    
    // 检查映射是否在 QCBookLog 中
    const mapping = qcBooklogDb.prepare('SELECT * FROM qc_book_mapping WHERE calibre_book_id = ?').get(result.id);
    console.log('QCBookLog 映射:', mapping ? '✅ 存在' : '❌ 不存在');
    
    // 检查扩展数据是否在 QCBookLog 中
    const bookData = qcBooklogDb.prepare('SELECT * FROM qc_bookdata WHERE book_id = ?').get(result.id);
    console.log('QCBookLog 扩展数据:', bookData ? '✅ 存在' : '❌ 不存在');
    
    calibreDb.close();
    qcBooklogDb.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  }
};

testInit();
