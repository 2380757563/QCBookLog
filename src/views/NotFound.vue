<template>
  <div class="not-found-container">
    <h1 class="not-found-title">404</h1>
    <p class="not-found-text">页面未找到</p>
    <router-link to="/" class="back-home-btn">返回首页</router-link>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
}

.not-found-title {
  font-size: 80px;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 20px;
}

.not-found-text {
  font-size: 24px;
  color: #666;
  margin-bottom: 30px;
}

.back-home-btn {
  padding: 12px 24px;
  background-color: #3498db;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 16px;
  transition: background-color 0.3s;
}

.back-home-btn:hover {
  background-color: #2980b9;
}
</style>