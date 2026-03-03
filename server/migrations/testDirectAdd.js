const testAdd = async () => {
  console.log('========================================');
  console.log('📚 测试直接添加书籍');
  console.log('========================================\n');

  const addData = {
    title: '活着',
    author: '余华',
    publisher: '人民文学出版社',
    isbn: '9787020024751',
    pubdate: '2012-8',
    pages: 191
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

    console.log('\n步骤 2: 验证书籍列表');
    console.log('----------------------------------------');
    
    const listResponse = await fetch('http://localhost:7401/api/books?noCache=true');
    const listResult = await listResponse.json();
    
    console.log('书籍总数:', listResult.length);
    console.log('前3本书籍:');
    listResult.slice(0, 3).forEach((b, i) => {
      console.log(`  ${i+1}. ID=${b.id}, 标题="${b.title}", last_modified=${b.last_modified}`);
    });

    const newBook = listResult.find(b => b.id === result.id);
    if (newBook) {
      console.log('\n✅ 书籍已添加到列表');
      console.log('  ID:', newBook.id);
      console.log('  标题:', newBook.title);
    } else {
      console.log('\n❌ 书籍未找到在列表中');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAdd();
