<template>
  <div class="test-container">
    <h1>ISBN搜索测试</h1>
    
    <div class="test-input">
      <input 
        v-model="isbn" 
        placeholder="请输入ISBN" 
        @keyup.enter="testSearch"
      />
      <button @click="testSearch">测试搜索</button>
    </div>
    
    <div v-if="loading" class="loading">
      搜索中...
    </div>
    
    <div v-else-if="result" class="test-result">
      <h2>搜索结果</h2>
      
      <div class="result-section">
        <h3>基本信息</h3>
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
      
      <div class="result-section">
        <h3>localCoverData状态</h3>
        <p><strong>是否存在:</strong> {{ !!result.localCoverData }}</p>
        <p v-if="result.localCoverData"><strong>数据长度:</strong> {{ result.localCoverData.length }} 字节</p>
        <p v-if="result.localCoverData"><strong>数据前缀:</strong> {{ result.localCoverData.substring(0, 100) }}...</p>
      </div>
      
      <div class="result-section">
        <h3>图片预览</h3>
        <div class="image-preview">
          <img 
            v-if="result.localCoverData || result.coverUrl" 
            :src="result.localCoverData || result.coverUrl" 
            alt="图书封面" 
            @load="onImageLoad" 
            @error="onImageError"
          />
          <div v-else class="no-image">无图片</div>
        </div>
      </div>
      
      <div class="result-section">
        <h3>控制台日志</h3>
        <div class="logs">
          <div v-for="(log, index) in logs" :key="index" :class="log.type">
            {{ log.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { searchBookByISBN } from '@/services/common/isbnApi';
import { downloadBookCover } from '@/utils/imageUtils';

const isbn = ref('9787506365437'); // 测试用ISBN
const loading = ref(false);
const result = ref<any>(null);
const logs = ref<Array<{type: string, message: string}>>([]);

const log = (type: string, message: string) => {
  logs.value.push({ type, message });
  console.log(`${type.toUpperCase()}: ${message}`);
};

const testSearch = async () => {
  loading.value = true;
  logs.value = [];
  result.value = null;
  
  try {
    log('info', `开始搜索ISBN: ${isbn.value}`);
    
    // 直接调用ISBN搜索API
    const searchResults = await searchBookByISBN(isbn.value);
    log('info', '搜索完成，结果: ' + JSON.stringify(searchResults));
    
    const bestResult = searchResults.douban;
    if (bestResult) {
      log('success', '获取到豆瓣图书结果');
      result.value = bestResult;
      
      // 单独测试图片下载
        if (bestResult.coverUrl) {
          log('info', `测试单独下载图片: ${bestResult.coverUrl}`);
          // 使用ISBN作为图片存储的key（转换为数字）
          const isbnKey = parseInt(bestResult.isbn, 10);
          const base64 = await downloadBookCover(isbnKey, bestResult.coverUrl);
          if (base64) {
            log('success', `图片下载成功，数据长度: ${(base64 as any).length} 字节`);
            result.value.localCoverData = base64;
          } else {
            log('error', '图片下载失败');
          }
        }
    } else {
      log('error', '未获取到搜索结果');
    }
  } catch (error) {
    log('error', `搜索出错: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    loading.value = false;
  }
};

const onImageLoad = () => {
  log('success', '图片加载成功');
};

const onImageError = (e: any) => {
  log('error', `图片加载失败: ${e.target.src}`);
};

// 页面加载时自动测试
setTimeout(() => {
  testSearch();
}, 1000);
</script>

<style scoped>
.test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-input {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.test-input input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
}

.test-input button {
  padding: 10px 20px;
  background-color: #42b883;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.loading {
  padding: 20px;
  font-size: 18px;
  color: #666;
}

.test-result {
  margin-top: 20px;
}

.result-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.result-section h3 {
  margin-top: 0;
  color: #333;
}

.result-section pre {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 14px;
}

.image-preview {
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background-color: #fff;
  display: inline-block;
}

.image-preview img {
  max-width: 200px;
  max-height: 300px;
  border-radius: 4px;
}

.no-image {
  padding: 50px;
  color: #999;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.logs {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.logs .info {
  color: #333;
  margin: 5px 0;
}

.logs .success {
  color: #42b883;
  margin: 5px 0;
}

.logs .error {
  color: #ff4d4f;
  margin: 5px 0;
}
</style>
