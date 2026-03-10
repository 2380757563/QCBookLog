const axios = require('axios');

const BASE_URL = 'http://localhost:7401/api';

async function testUserIsolation() {
  console.log('========================================');
  console.log('🧪 测试用户数据隔离功能');
  console.log('========================================\n');

  try {
    // 1. 获取所有读者
    console.log('📋 步骤1: 获取所有读者');
    const readersResponse = await axios.get(`${BASE_URL}/readers`);
    const readers = readersResponse.data;
    console.log(`✅ 找到 ${readers.length} 个读者:`);
    readers.forEach(r => {
      console.log(`  - ID: ${r.id}, 用户名: ${r.username}, 名称: ${r.name || '未设置'}`);
    });
    console.log('');

    // 2. 获取书籍列表（使用默认用户ID=0）
    console.log('📋 步骤2: 获取书籍列表（默认用户 ID=0）');
    const booksResponse0 = await axios.get(`${BASE_URL}/books?readerId=0`);
    const books0 = booksResponse0.data;
    console.log(`✅ 找到 ${books0.length} 本书籍`);
    
    // 找一本有标记状态的书籍
    const bookWithStatus0 = books0.find(b => b.favorite === 1 || b.wants === 1);
    if (bookWithStatus0) {
      console.log(`  示例书籍: "${bookWithStatus0.title}"`);
      console.log(`  - favorite: ${bookWithStatus0.favorite}`);
      console.log(`  - wants: ${bookWithStatus0.wants}`);
    }
    console.log('');

    // 3. 获取书籍列表（使用admin用户ID，假设为1）
    const adminReader = readers.find(r => r.username === 'admin') || readers.find(r => r.id !== 0);
    if (adminReader) {
      console.log(`📋 步骤3: 获取书籍列表（admin用户 ID=${adminReader.id}）`);
      const booksResponse1 = await axios.get(`${BASE_URL}/books?readerId=${adminReader.id}`);
      const books1 = booksResponse1.data;
      console.log(`✅ 找到 ${books1.length} 本书籍`);
      
      // 检查同一本书的标记状态
      if (bookWithStatus0) {
        const sameBook1 = books1.find(b => b.id === bookWithStatus0.id);
        if (sameBook1) {
          console.log(`  同一本书 "${sameBook1.title}" 的状态:`);
          console.log(`  - favorite: ${sameBook1.favorite}`);
          console.log(`  - wants: ${sameBook1.wants}`);
          
          if (sameBook1.favorite !== bookWithStatus0.favorite || sameBook1.wants !== bookWithStatus0.wants) {
            console.log('  ✅ 用户数据隔离正常：不同用户的标记状态不同');
          } else {
            console.log('  ⚠️  警告：不同用户的标记状态相同，可能存在数据混淆');
          }
        }
      }
      console.log('');

      // 4. 测试更新书籍标记状态（使用admin用户）
      if (bookWithStatus0) {
        console.log(`📋 步骤4: 测试更新书籍标记状态（admin用户 ID=${adminReader.id}）`);
        console.log(`  书籍: "${bookWithStatus0.title}" (ID: ${bookWithStatus0.id})`);
        
        const updateData = {
          favorite: 1,
          favorite_date: new Date().toISOString()
        };
        
        console.log(`  发送更新请求: favorite=1, readerId=${adminReader.id}`);
        const updateResponse = await axios.put(
          `${BASE_URL}/books/${bookWithStatus0.id}?readerId=${adminReader.id}`,
          updateData
        );
        
        console.log('  ✅ 更新成功');
        console.log('');

        // 5. 验证更新结果
        console.log('📋 步骤5: 验证更新结果');
        
        // 检查默认用户的书籍状态
        const booksAfterUpdate0 = await axios.get(`${BASE_URL}/books?readerId=0`);
        const bookAfterUpdate0 = booksAfterUpdate0.data.find(b => b.id === bookWithStatus0.id);
        console.log(`  默认用户(ID=0)的书籍状态:`);
        console.log(`  - favorite: ${bookAfterUpdate0.favorite}`);
        
        // 检查admin用户的书籍状态
        const booksAfterUpdate1 = await axios.get(`${BASE_URL}/books?readerId=${adminReader.id}`);
        const bookAfterUpdate1 = booksAfterUpdate1.data.find(b => b.id === bookWithStatus0.id);
        console.log(`  admin用户(ID=${adminReader.id})的书籍状态:`);
        console.log(`  - favorite: ${bookAfterUpdate1.favorite}`);
        
        if (bookAfterUpdate0.favorite !== bookAfterUpdate1.favorite) {
          console.log('  ✅ 用户数据隔离验证成功：不同用户的状态正确隔离');
        } else {
          console.log('  ❌ 用户数据隔离验证失败：不同用户的状态混淆了');
        }
        console.log('');
      }
    } else {
      console.log('⚠️  未找到admin用户，跳过用户切换测试');
    }

    console.log('========================================');
    console.log('✅ 测试完成');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testUserIsolation();
