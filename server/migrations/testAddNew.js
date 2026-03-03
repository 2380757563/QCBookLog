const testAddNew = async () => {
  console.log('========================================');
  console.log('📚 测试添加新书籍（不存在的 ISBN）');
  console.log('========================================\n');

  const addData = {
    title: '三体',
    author: '刘慈欣',
    publisher: '重庆出版社',
    isbn: '9787536692930',
    pubdate: '2008-01',
    pages: 302
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
    console.log('\n返回的书籍 ID:', result.id);
    console.log('返回的书籍标题:', result.title);
    console.log('返回的书籍 ISBN:', result.isbn);
    console.log('返回的书籍 last_modified:', result.last_modified);

    // 验证书籍列表
    console.log('\n验证书籍列表:');
    const listResponse = await fetch('http://localhost:7401/api/books?noCache=true');
    const listResult = await listResponse.json();
    
    const newBook = listResult.find(b => b.id === result.id);
    if (newBook) {
      console.log('✅ 书籍已添加到列表');
      console.log('  ID:', newBook.id);
      console.log('  标题:', newBook.title);
      console.log('  last_modified:', newBook.last_modified);
    } else {
      console.log('❌ 书籍未找到');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
};

testAddNew();
