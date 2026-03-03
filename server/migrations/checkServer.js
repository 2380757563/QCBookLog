const checkServer = async () => {
  console.log('========================================');
  console.log('📚 检查服务器状态');
  console.log('========================================\n');

  try {
    // 检查服务器是否运行
    const healthResponse = await fetch('http://localhost:7401/api/health');
    console.log('服务器状态:', healthResponse.ok ? '✅ 运行中' : '❌ 未运行');

    // 检查数据库连接
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3').default || require('better-sqlite3');
    
    const calibreDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\moni\\book\\metadata.db');
    const qcBooklogDb = new Database('D:\\下载\\docs-xmnote-master\\QC-booklog\\data\\qc_booklog.db');
    
    const calibreCount = calibreDb.prepare('SELECT COUNT(*) as count FROM books').get();
    const mappingCount = qcBooklogDb.prepare('SELECT COUNT(*) as count FROM qc_book_mapping').get();
    
    console.log('\n数据库状态:');
    console.log('  Calibre 书籍数:', calibreCount.count);
    console.log('  QCBookLog 映射数:', mappingCount.count);
    
    // 检查最近添加的书籍
    const recentBooks = calibreDb.prepare(`
      SELECT id, title FROM books ORDER BY id DESC LIMIT 10
    `).all();
    
    console.log('\n最近添加的书籍:');
    recentBooks.forEach(b => {
      const mapping = qcBooklogDb.prepare(`
        SELECT id FROM qc_book_mapping WHERE calibre_book_id = ?
      `).get(b.id);
      console.log(`  ID=${b.id}, 标题="${b.title}", 映射=${mapping ? '✅' : '❌'}`);
    });
    
    calibreDb.close();
    qcBooklogDb.close();

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

checkServer();
