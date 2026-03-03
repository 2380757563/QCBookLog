const testDbConnection = async () => {
  console.log('========================================');
  console.log('📚 测试数据库连接');
  console.log('========================================\n');

  try {
    // 通过 API 检查数据库连接状态
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'DB连接测试_' + Date.now(),
        author: '测试作者',
        isbn: '9999999999986'
      })
    });

    const result = await response.json();
    console.log('添加书籍成功, ID:', result.id);

    // 等待服务器处理
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查服务器日志文件
    const fs = await import('fs');
    const path = await import('path');
    
    const logDir = 'D:\\下载\\docs-xmnote-master\\QC-booklog\\server\\logs';
    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    
    if (logFiles.length > 0) {
      const latestLog = logFiles[logFiles.length - 1];
      const logContent = fs.readFileSync(path.join(logDir, latestLog), 'utf8');
      
      // 检查是否有 QCBookLog 相关日志
      const qcLogLines = logContent.split('\n').filter(line => 
        line.includes('QCBookLog') || 
        line.includes('准备写入') ||
        line.includes('映射已创建')
      );
      
      console.log('\nQCBookLog 相关日志:');
      qcLogLines.slice(-10).forEach(line => {
        console.log('  ', line.substring(0, 200));
      });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testDbConnection();
