const checkServerLog = async () => {
  console.log('========================================');
  console.log('📚 检查服务器日志');
  console.log('========================================\n');

  const addData = {
    title: '日志测试_' + Date.now(),
    author: '测试作者',
    isbn: '9999999999988'
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
    console.log('📥 书籍标题:', result.title);

    console.log('\n请检查服务器日志中是否有以下输出:');
    console.log('  - "📊 准备写入 QCBookLog 数据"');
    console.log('  - "✅ QCBookLog 书籍映射已创建"');
    console.log('  - "✅ QCBookLog 书籍扩展数据已创建"');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

checkServerLog();
