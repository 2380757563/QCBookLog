import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), 'src')
    }
  },
  server: {
    host: '0.0.0.0', // 允许外部设备访问
    port: 8080, // 修改端口号为 8080
    strictPort: false, // 不强制使用特定端口，如果被占用则自动递增
    allowedHosts: [
      'paxil-maritime-dance-contests.trycloudflare.com',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1',
      'qcbooklog.voidvoice.ip-ddns.com'
    ],
    fs: {
      // 允许访问项目根目录外的文件
      allow: ['.']
    },
    proxy: {
      // 优先匹配具体的API路径，代理到本地后端
      '/api/douban/cover': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 阿里云OSS图片代理，代理到本地后端
      '/api/aliyun-oss-image': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // DBR API代理，代理到本地后端
      '/api/dbr': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 探数图书API代理，代理到本地后端
      '/api/tanshu': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 豆瓣图书API代理，代理到本地后端
      '/api/douban': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 公共图书API代理，代理到本地后端
      '/api/isbn-work': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 其他书籍相关API，代理到本地后端
      '/api/books': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/groups': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/tags': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/bookmarks': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/backup': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 健康检查和版本信息，代理到本地后端
      '/api/health': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api/version': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 性能监控API，代理到本地后端
      '/api/performance': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // Calibre 配置API，代理到本地后端
      '/api/config': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 阅读追踪API，代理到本地后端
      '/api/reading': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      },
      // 优化后的豆瓣图片代理配置，解决40310015错误
      '/api/douban-cover': {
        target: 'https://img1.doubanio.com',
        changeOrigin: true,
        rewrite: (path) => {
          // 重写路径：/api/douban-cover/s35334340.jpg → /view/subject/l/public/s35334340.jpg
          const coverId = path.split('/').pop()?.replace('.jpg', '') || '';
          return `/view/subject/l/public/${coverId}.jpg`;
        },
        // 核心：模拟豆瓣站内请求的完整请求头
        headers: {
          'Referer': 'https://book.douban.com/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 Edg/143.0.0.0',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Dest': 'image',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      },
      // 其他API请求代理到本地后端服务器（通用代理）
      '/api': {
        target: 'http://localhost:7401',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})