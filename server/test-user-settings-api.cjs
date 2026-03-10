const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 测试获取用户设置...');
    const getResponse = await axios.get('http://localhost:7401/api/user-settings');
    console.log('✅ 获取设置成功:', getResponse.data);

    console.log('\n🧪 测试保存用户设置...');
    const saveResponse = await axios.post('http://localhost:7401/api/user-settings', {
      settings: {
        backgroundMode: 'color',
        selectedColorIndex: 1
      },
      priority: 'high'
    });
    console.log('✅ 保存设置成功:', saveResponse.data);

    console.log('\n🧪 测试再次获取用户设置...');
    const getResponse2 = await axios.get('http://localhost:7401/api/user-settings');
    console.log('✅ 获取设置成功:', getResponse2.data);

    console.log('\n🧪 测试获取用户图片...');
    const getImagesResponse = await axios.get('http://localhost:7401/api/user-images');
    console.log('✅ 获取图片成功:', getImagesResponse.data);

    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

testAPI();
