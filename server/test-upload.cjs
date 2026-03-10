const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
  try {
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    formData.append('imageType', 'bookmark_background');

    console.log('🧪 测试上传图片...');
    const response = await axios.post('http://localhost:7401/api/user-images', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('✅ 上传成功:', response.data);
    process.exit(0);
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

testUpload();
