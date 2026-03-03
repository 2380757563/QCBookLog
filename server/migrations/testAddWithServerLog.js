const testAddWithServerLog = async () => {
  console.log('========================================');
  console.log('📚 测试添加书籍并检查服务器日志');
  console.log('========================================\n');

  const addData = {
    title: '服务器日志测试_' + Date.now(),
    author: '测试作者',
    isbn: '9999999999987'
  };

  console.log('📤 发送添加请求...');

  try {
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addData)
    });

    const result = await response.json();
    console.log('\n📥 响应状态:', response.status);
    console.log('📥 书籍 ID:', result.id);

    // 等待服务器处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查数据库
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3').default || require('better-sqlite3');
    
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    const mapping = qcBooklogDb.prepare(`
      SELECT * FROM qc_book_mapping WHERE calibre_book_id = ?
    `).get(result.id);
    
    console.log('\n映射检查:', mapping ? '✅ 已创建' : '❌ 未创建');
    
    qcBooklogDb.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAddWithServerLog();
