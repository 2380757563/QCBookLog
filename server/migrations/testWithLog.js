const testWithLog = async () => {
  console.log('========================================');
  console.log('📚 测试添加书籍并输出详细日志');
  console.log('========================================\n');

  try {
    // 添加书籍
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '详细日志测试_' + Date.now(),
        author: '测试作者',
        isbn: '9999999999984'
      })
    });

    const result = await response.json();
    console.log('添加书籍成功, ID:', result.id);

    // 等待服务器处理
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查数据库
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3').default || require('better-sqlite3');
    
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    // 检查映射
    const mapping = qcBooklogDb.prepare('SELECT * FROM qc_book_mapping WHERE calibre_book_id = ?').get(result.id);
    console.log('\n映射状态:', mapping ? '✅ 已创建' : '❌ 未创建');
    
    // 检查最近的映射
    const recentMappings = qcBooklogDb.prepare('SELECT * FROM qc_book_mapping ORDER BY id DESC LIMIT 3').all();
    console.log('\n最近的映射:');
    recentMappings.forEach(m => {
      console.log(`  ID=${m.id}, book_id=${m.calibre_book_id}, 标题="${m.title}"`);
    });
    
    qcBooklogDb.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testWithLog();
