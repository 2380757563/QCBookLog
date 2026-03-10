const axios = require('axios');

async function testImages() {
  try {
    console.log('🧪 测试获取用户图片...');
    const response = await axios.get('http://localhost:7401/api/user-images?imageType=bookmark_background');
    
    console.log('✅ 获取图片成功');
    console.log('图片数量:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      const firstImage = response.data.data[0];
      console.log('\n第一张图片信息:');
      console.log('  ID:', firstImage.id);
      console.log('  类型:', firstImage.imageType);
      console.log('  名称:', firstImage.imageName);
      console.log('  大小:', firstImage.imageSize, 'bytes');
      console.log('  排序:', firstImage.sortOrder);
      console.log('  图片数据长度:', firstImage.imageData.length, '字符');
      console.log('  图片数据前50字符:', firstImage.imageData.substring(0, 50));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

testImages();
