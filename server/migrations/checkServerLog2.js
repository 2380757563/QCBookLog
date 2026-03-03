const checkServerLog = async () => {
  console.log('========================================');
  console.log('📚 检查服务器启动日志');
  console.log('========================================\n');

  try {
    // 检查服务器是否运行
    const healthResponse = await fetch('http://localhost:7401/api/health');
    console.log('服务器状态:', healthResponse.ok ? '✅ 运行中' : '❌ 未运行');

    // 添加书籍并观察日志
    console.log('\n添加书籍...');
    const response = await fetch('http://localhost:7401/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '日志检查_' + Date.now(),
        author: '测试作者',
        isbn: '9999999999983'
      })
    });

    const result = await response.json();
    console.log('添加书籍成功, ID:', result.id);
    
    console.log('\n请检查服务器控制台输出中是否有:');
    console.log('  - "📊 准备写入 QCBookLog 数据"');
    console.log('  - "✅ QCBookLog 书籍映射已创建"');
    console.log('  - "✅ QCBookLog 书籍扩展数据已创建"');
    
    console.log('\n如果没有这些日志，说明 qcBooklogDb 为 null 或代码未执行到该部分');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

checkServerLog();
