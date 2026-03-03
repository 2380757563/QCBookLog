import axios from 'axios';

const API_BASE_URL = 'http://localhost:7401/api';

console.log('🧪 开始测试数据库验证功能...\n');

async function testDatabaseValidation() {
  try {
    // 测试 1: 检查数据库状态
    console.log('📋 测试 1: 检查数据库状态');
    const checkResponse = await axios.get(`${API_BASE_URL}/config/check-databases`);
    console.log('  响应数据:', JSON.stringify(checkResponse.data, null, 2));
    console.log(`  Calibre 数据库: ${checkResponse.data.data.calibre.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`  Talebook 数据库: ${checkResponse.data.data.talebook.available ? '✅ 可用' : '❌ 不可用'}`);
    console.log(`  QCBookLog 数据库: ${checkResponse.data.data.qcBooklog ? '✅ 可用' : '❌ 不可用'}`);

    // 测试 2: 验证 Talebook 数据库
    console.log('\n📋 测试 2: 验证 Talebook 数据库');
    const talebookResponse = await axios.get(`${API_BASE_URL}/config/talebook-path`);
    console.log(`  验证结果: ${talebookResponse.data.valid ? '✅ 有效' : '❌ 无效'}`);
    if (talebookResponse.data.error) {
      console.log(`  错误信息: ${talebookResponse.data.error}`);
    } else {
      console.log(`  统计信息: 书籍 ${talebookResponse.data.stats?.bookCount || 0} 本`);
    }

    // 测试 3: 验证 Calibre 数据库
    console.log('\n📋 测试 3: 验证 Calibre 数据库');
    const calibreResponse = await axios.get(`${API_BASE_URL}/config/calibre-path`);
    console.log(`  验证结果: ${calibreResponse.data.valid ? '✅ 有效' : '❌ 无效'}`);
    if (calibreResponse.data.error) {
      console.log(`  错误信息: ${calibreResponse.data.error}`);
    } else {
      console.log(`  统计信息: 书籍 ${calibreResponse.data.stats?.bookCount || 0} 本`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库验证测试完成!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:');
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据:`, error.response.data);
    } else {
      console.error(`  错误信息: ${error.message}`);
    }
    process.exit(1);
  }
}

testDatabaseValidation();