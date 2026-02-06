import axios from 'axios';
import type { BookSearchResult } from './types';
import { dbrApi } from '@/services/apiClient';

// ISBN搜索结果缓存，独立于书籍列表缓存，用于批量添加功能
const ISBN_SEARCH_CACHE = new Map<string, {
  data: ReturnType<typeof searchBookByISBN>;
  timestamp: number;
}>();

// 缓存配置
const CACHE_CONFIG = {
  // ISBN搜索结果缓存时间：24小时（因为书籍信息不会频繁变化）
  TTL: 24 * 60 * 60 * 1000,
  // 最大缓存数量
  MAX_SIZE: 1000
};

/**
 * 检查缓存是否有效
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_CONFIG.TTL;
};

/**
 * 清理过期缓存和超出大小限制的缓存
 */
const cleanCache = () => {
  // 清理过期缓存
  for (const [isbn, cacheItem] of ISBN_SEARCH_CACHE.entries()) {
    if (!isCacheValid(cacheItem.timestamp)) {
      ISBN_SEARCH_CACHE.delete(isbn);
    }
  }
  
  // 如果缓存超出大小限制，删除最早的缓存项
  if (ISBN_SEARCH_CACHE.size > CACHE_CONFIG.MAX_SIZE) {
    const entries = Array.from(ISBN_SEARCH_CACHE.entries());
    // 按时间戳排序，删除最早的
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const excess = ISBN_SEARCH_CACHE.size - CACHE_CONFIG.MAX_SIZE;
    for (let i = 0; i < excess; i++) {
      ISBN_SEARCH_CACHE.delete(entries[i][0]);
    }
  }
};

/**
 * API调用策略说明
 * ====================
 * 
 * 免费API（自动调用，优先级从高到低）：
 * 1. DBR API - 高质量数据源，响应快速
 * 2. 公共图书API - 数据稳定，覆盖面广
 * 3. 豆瓣API - 数据丰富，但可能有频率限制
 * 
 * 计费API（仅在用户主动点击时调用）：
 * 4. 探数图书API - 作为备用方案，仅在免费API均失败时建议使用
 * 
 * 调用时机：
 * - 搜索操作：自动调用所有免费API（并行）
 * - 点击探数：触发用户确认后调用探数API
 * 
 * 错误处理：
 * - 使用Promise.allSettled确保一个API失败不影响其他API
 * - 所有免费API失败后，自动切换到探数数据源
 * - 探数API调用需要用户明确确认
 */

// API配置
const API_CONFIG = {
  // API1 探数图书（使用后端代理）
  TANSHU: {
    url: '/api/tanshu/isbn'
  },
  // API2 公共图书（使用后端代理）
  ISBN_WORK: {
    url: '/api/isbn-work/isbn'
  },
  // API3 豆瓣图书（使用后端代理）
  DOUBAN: {
    url: '/api/douban/v2/book/isbn/'
  }
};

/**
 * 调用探数图书API（使用后端代理）
 */
async function searchTanshu(isbn: string): Promise<BookSearchResult | null> {
  try {

    const response = await axios.get(`${API_CONFIG.TANSHU.url}/${isbn}`, {
      timeout: 15000
    });

    console.log('探数图书API完整响应:', JSON.stringify(response, null, 2));
    console.log('探数图书API响应数据:', JSON.stringify(response.data, null, 2));

    // 根据API文档，探数图书API成功码是1
    if (response.data) {

      if (response.data.code === 1) {
        const data = response.data.data;
        console.log('探数API完整数据:', JSON.stringify(data, null, 2));
        console.log('探数API数据字段:', Object.keys(data).join(', '));

        // 处理出版年份
        let publishYear: number | undefined;
        if (data.pubdate) {
          const yearMatch = data.pubdate.match(/\d{4}/);
          if (yearMatch) {
            publishYear = parseInt(yearMatch[0]);
          }
        }

        // 处理页数
        let pages: number | undefined;
        if (data.pages) {
          const pageMatch = data.pages.match(/\d+/);
          if (pageMatch) {
            pages = parseInt(pageMatch[0]);
          }
        }

        return {
          source: '探数图书',
          title: data.title || '',
          author: data.author || '',
          isbn: data.isbn || isbn,
          publisher: data.publisher || '',
          publishYear: publishYear,
          pages: pages,
          binding: data.binding || '',
          coverUrl: data.img || '',
          description: data.summary || '',
          price: data.price || '',
          rating: data.rating ? parseFloat((data.rating / 2).toFixed(1)) : undefined, // 探数评分通常是0-10，转换为0-5
          series: data.series ? (typeof data.series === 'string' ? data.series : data.series?.title || '') : '',
          tags: data.tags ? (Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'string' ? t : t.title).filter(Boolean) : [data.tags]) : []
        };
      } else {
        console.error('探数API返回错误:', response.data.code, response.data.msg);
      }
    }
    return null;
  } catch (error) {
    console.error('探数图书API调用失败:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('响应错误:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('请求错误:', error.request);
      } else {
        console.error('请求配置错误:', error.message);
      }
    }
    return null;
  }
}

/**
 * 调用公共图书API
 */
async function searchIsbnWork(isbn: string): Promise<BookSearchResult | null> {
  try {

    const response = await axios.get(`${API_CONFIG.ISBN_WORK.url}/${isbn}`, {
      timeout: 15000
    });

    // 根据文档，公共图书API成功码是0
    if (response.data && response.data.code === 0 && response.data.success) {
      const data = response.data.data;
      
      // 处理页数，提取数字
      let pages: number | undefined;
      if (data.pages) {
        const pageMatch = data.pages.match(/\d+/);
        if (pageMatch) {
          pages = parseInt(pageMatch[0]);
        }
      }
      
      // 处理出版年份，提取数字
      let publishYear: number | undefined;
      if (data.pressDate) {
        const yearMatch = data.pressDate.match(/\d{4}/);
        if (yearMatch) {
          publishYear = parseInt(yearMatch[0]);
        }
      }
      
      // 处理价格，转换为元
      let price: string = '';
      if (data.price) {
        price = `${(data.price / 100).toFixed(2)}`;
      }
      
      // 处理封面图片
      let coverUrl: string = '';
      if (data.pictures) {
        try {
          // 尝试解析为JSON数组
          let pictures: string[] = [];
          if (typeof data.pictures === 'string') {
            // 如果是字符串，尝试解析为JSON数组
            try {
              pictures = JSON.parse(data.pictures);
            } catch (parseError) {
              // 如果解析失败，直接作为单个URL处理
              pictures = [data.pictures];
            }
          } else if (Array.isArray(data.pictures)) {
            // 如果已经是数组，直接使用
            pictures = data.pictures;
          }
          
          if (pictures.length > 0) {
            let originalCoverUrl = pictures[0];

            // 如果是阿里云OSS图片URL，使用后端中转接口避免403错误
            if (originalCoverUrl && originalCoverUrl.includes('aliyuncs.com')) {

              // 提取图片路径，如 https://data-isbn.oss-cn-hangzhou.aliyuncs.com/7gxk02e1a88ijt9gx7ohg2nelforrje6.jpg 中的 7gxk02e1a88ijt9gx7ohg2nelforrje6.jpg
              const imagePathMatch = originalCoverUrl.match(/aliyuncs\.com\/(.*)$/i);
              if (imagePathMatch && imagePathMatch[1]) {
                const imagePath = imagePathMatch[1];
                // 使用后端中转接口，格式为 /api/aliyun-oss-image/:imagePath
                coverUrl = `/api/aliyun-oss-image/${imagePath}`;

              } else {
                coverUrl = originalCoverUrl;

              }
            } else {
              coverUrl = originalCoverUrl;

            }
          }
        } catch (e) {
          console.error('解析封面图片失败:', e);
        }
      }
      
      // 探数图书和公共图书都直接返回封面URL，不使用localCoverData
      // 这样保持了两者的一致性，前端都会直接使用coverUrl来加载图片
      
      console.log('📚 公共图书API返回的原始数据:', JSON.stringify(data, null, 2));
      
      return {
        source: '公共图书',
        title: data.bookName || '',
        author: data.author || '',
        isbn: data.isbn || isbn,
        publisher: data.press || '',
        publishYear: publishYear,
        pages: pages,
        binding: data.binding || '',
        coverUrl: coverUrl,
        description: data.bookDesc || '',
        price: price,
        rating: data.rating ? parseFloat((data.rating / 2).toFixed(1)) : undefined, // 转换评分
        series: data.series ? (typeof data.series === 'string' ? data.series : data.series?.title || '') : '',
        tags: data.tags ? (Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'string' ? t : t.title).filter(Boolean) : [data.tags]) : []
      };
    } else {
      console.error('公共图书API返回错误码:', response.data?.code, response.data?.msg || response.data?.success);
    }
    return null;
  } catch (error) {
    console.error('公共图书API调用失败:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('响应错误:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('请求错误:', error.request);
      } else {
        console.error('请求配置错误:', error.message);
      }
    }
    return null;
  }
}

/**
 * 调用DBR (Douban Book Rust) API
 */
async function searchDBR(isbn: string): Promise<BookSearchResult | null> {
  try {

    // 调用DBR API获取书籍信息
    const response = await dbrApi.getByIsbn(isbn);

    if (!response || response.code === undefined || response.code !== 0 || !response.data) {
      console.error('DBR API返回无效数据:', response);
      return null;
    }
    
    const data = response.data;

    // 处理封面图片，使用后端中转接口避免40310015错误
    let coverUrl: string = data.images?.large || data.images?.medium || data.images?.small || '';
    let localCoverData: string | undefined;
    
    // 如果是豆瓣图片URL，使用后端中转接口
    if (coverUrl && coverUrl.includes('doubanio.com')) {

      // 提取豆瓣图片ID，如 https://img9.doubanio.com/view/subject/l/public/s35302086.jpg 中的 s35302086
      const coverIdMatch = coverUrl.match(/\/public\/(s\d+)\.jpg/i);
      if (coverIdMatch && coverIdMatch[1]) {
        const coverId = coverIdMatch[1];
        // 使用后端中转接口，格式为 /api/douban/cover/:coverId
        coverUrl = `/api/douban/cover/${coverId}`;

      }
    }
    
    // 处理出版年份
    let publishYear: number | undefined;
    if (data.pubdate) {
      const yearMatch = data.pubdate.match(/\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0]);
      }
    }
    
    // 处理页数
    let pages: number | undefined;
    if (data.pages) {
      const pageMatch = data.pages.match(/\d+/);
      if (pageMatch) {
        pages = parseInt(pageMatch[0]);
      }
    }
    
    // 处理作者字段，保留国家标签
    let authorText = '';
    if (Array.isArray(data.author)) {
      // 处理译者合并后的格式："[日本] 吉本芭娜娜 & 李萍" 或 原始数组
      authorText = data.author.join(' / ');
    } else {
      // 字符串格式，直接使用原始作者信息
      authorText = data.author || '';
    }
    // 确保作者信息不为空
    authorText = authorText.trim();

    // 构建返回结果
    const result: BookSearchResult = {
      source: 'DBR',
      title: data.title || '',
      author: authorText,
      isbn: data.isbn13 || isbn,
      publisher: data.publisher || '',
      publishYear: publishYear,
      pages: pages,
      binding: data.binding || '',
      coverUrl: coverUrl,
      description: data.summary || '',
      price: data.price || '',
      rating: data.rating?.average ? parseFloat((data.rating.average / 2).toFixed(1)) : undefined, // DBR评分结构是 {average: 8.2}
      // DBR使用serials字段，豆瓣使用series字段，需要兼容两种格式
      series: (data.series ? (typeof data.series === 'string' ? data.series : data.series?.title || '') : '') ||
              (data.serials ? (typeof data.serials === 'string' ? data.serials : data.serials?.title || '') : ''),
      tags: data.tags ? (Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'string' ? t : t.title).filter(Boolean) : [data.tags]) : [],
      // 添加原始HTML和源URL
      rawHtml: data.rawHtml,
      sourceUrl: data.sourceUrl
    };

    return result;
  } catch (error) {
    console.error('DBR API调用失败:', error);
    return null;
  }
}

/**
 * 调用豆瓣图书API（使用后端代理，避免CORS和不安全头问题）
 * 注意：使用GET请求，因为豆瓣API在2025年改用GET方式
 */
async function searchDouban(isbn: string): Promise<BookSearchResult | null> {
  try {
    // 输入验证
    if (!isbn || isbn.length < 10 || isbn.length > 13) {
      console.error('无效的ISBN格式:', isbn);
      return null;
    }

    // 使用后端代理，GET请求方式
    const response = await axios.get(
      `${API_CONFIG.DOUBAN.url}${isbn}`,
      {
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 15000
      }
    );

    // 验证响应数据
    if (!response.data || typeof response.data !== 'object') {
      console.error('豆瓣API返回无效数据:', response.data);
      return null;
    }

    const data = response.data;
    console.log('豆瓣图书API响应数据:', JSON.stringify(data, null, 2));

    // 检查是否是HTML响应（403错误）
    if (typeof data === 'string' && data.includes('<html>')) {
      console.error('豆瓣官方API已限制访问（403 Forbidden）');
      return null;
    }

    // 处理封面图片
    let coverUrl: string = '';
    let localCoverData: string | undefined;

    const originalCoverUrl = data.images?.large || data.image || '';




    // 处理豆瓣图片URL，使用后端中转接口避免40310015错误
    if (originalCoverUrl) {

      // 提取豆瓣图片ID，如 https://img9.doubanio.com/view/subject/l/public/s35302086.jpg 中的 s35302086
      const coverIdMatch = originalCoverUrl.match(/\/public\/(s\d+)\.jpg/i);
      if (coverIdMatch && coverIdMatch[1]) {
        const coverId = coverIdMatch[1];
        // 使用后端中转接口，格式为 /api/douban/cover/:coverId
        coverUrl = `/api/douban/cover/${coverId}`;

      } else {

        coverUrl = originalCoverUrl;
      }
    } else {

    }

    return {
      source: '豆瓣图书',
      title: data.title || '',
      author: Array.isArray(data.author) ? data.author.join(', ') : data.author || '',
      isbn: data.isbn13 || data.isbn10 || isbn,
      publisher: data.publisher || '',
      publishYear: data.pubdate ? parseInt(data.pubdate.split('-')[0]) : undefined,
      pages: data.pages ? parseInt(data.pages) : undefined,
      binding: data.binding || '',
      coverUrl: coverUrl,
      localCoverData: localCoverData,
      description: data.summary || '',
      price: data.price || '',
      rating: data.rating?.average ? parseFloat((data.rating.average / 2).toFixed(1)) : undefined, // 豆瓣评分结构是 {average: 8.2}
      series: data.series ? (typeof data.series === 'string' ? data.series : data.series?.title || '') : '',
      tags: data.tags ? (Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'string' ? t : t.title).filter(Boolean) : [data.tags]) : []
    };
  } catch (error) {
    console.error('豆瓣图书API调用失败:', error);
    if (axios.isAxiosError(error)) {
      console.error('请求配置:', JSON.stringify(error.config, null, 2));
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('请求信息:', error.request);
      } else {
        console.error('请求错误:', error.message);
      }
    }
    return null;
  }
}

/**
 * 多源图书搜索（免费API优先策略）
 * 只调用免费API：DBR、公共图书、豆瓣
 * 探数API仅在用户主动点击时调用
 */
export async function searchBookByISBN(isbn: string): Promise<{
  douban: BookSearchResult | null;
  isbnWork: BookSearchResult | null;
  tanshu: BookSearchResult | null;
  dbr: BookSearchResult | null; // 添加DBR搜索结果字段
  bestResult: BookSearchResult | null; // 添加最佳结果字段
}> {
  console.log(`开始多源搜索ISBN: ${isbn} (免费API模式)`);
  
  // 先检查缓存
  const cached = ISBN_SEARCH_CACHE.get(isbn);
  if (cached && isCacheValid(cached.timestamp)) {

    return cached.data;
  }
  
  // 并行调用所有免费API（DBR、公共图书、豆瓣）
  // 探数API不在此处调用，只在用户主动点击时触发
  const [isbnWorkResult, dbrResult, doubanResult] = await Promise.allSettled([
    searchIsbnWork(isbn),
    searchDBR(isbn),
    searchDouban(isbn)
  ]);
  
  // 处理公共图书API结果
  let finalIsbnWorkResult: BookSearchResult | null = null;
  if (isbnWorkResult.status === 'fulfilled') {
    finalIsbnWorkResult = isbnWorkResult.value;

  } else {
    console.error('❌ 公共图书API调用异常:', isbnWorkResult.reason);
    finalIsbnWorkResult = null;
  }
  
  // 处理DBR API结果
  let finalDBRResult: BookSearchResult | null = null;
  if (dbrResult.status === 'fulfilled') {
    finalDBRResult = dbrResult.value;

  } else {
    console.error('❌ DBR API调用异常:', dbrResult.reason);
    finalDBRResult = null;
  }
  
  // 处理豆瓣API结果
  let finalDoubanResult: BookSearchResult | null = null;
  if (doubanResult.status === 'fulfilled') {
    finalDoubanResult = doubanResult.value;

  } else {
    console.error('❌ 豆瓣图书API调用异常:', doubanResult.reason);
    finalDoubanResult = null;
  }
  
  // 探数API结果初始化为null，等待用户主动点击时调用
  const finalTanshuResult: BookSearchResult | null = null;

  // 确定最佳结果，优先使用免费API的高质量数据源
  // 优先级: DBR > 公共图书 > 豆瓣 > 探数
  const bestResult = finalDBRResult || finalIsbnWorkResult || finalDoubanResult || finalTanshuResult;
  
  // 构建结果对象
  const result = {
    douban: finalDoubanResult,
    isbnWork: finalIsbnWorkResult,
    tanshu: finalTanshuResult,
    dbr: finalDBRResult,
    bestResult: bestResult
  };
  
  // 保存到缓存
  ISBN_SEARCH_CACHE.set(isbn, {
    data: result,
    timestamp: Date.now()
  });
  
  // 清理过期缓存
  cleanCache();


  return result;
}

/**
 * 单独调用探数图书API（用户主动点击时）
 */
export async function searchTanshuByISBN(isbn: string): Promise<BookSearchResult | null> {
  return await searchTanshu(isbn);
}

/**
 * 单独调用豆瓣图书API
 */
export async function searchDoubanByISBN(isbn: string): Promise<BookSearchResult | null> {
  return await searchDouban(isbn);
}

/**
 * 单独调用公共图书API
 */
export async function searchIsbnWorkByISBN(isbn: string): Promise<BookSearchResult | null> {
  return await searchIsbnWork(isbn);
}

/**
 * 获取API调用统计信息
 * 用于调试和监控各API的调用情况
 */
export function getApiStats() {
  return {
    freeApis: ['DBR', '公共图书', '豆瓣'],
    paidApis: ['探数图书'],
    strategy: '免费API优先，计费API按需调用',
    priority: 'DBR > 公共图书 > 豆瓣 > 探数',
    description: '搜索时仅调用免费API，探数API仅在用户主动点击时触发',
    cacheInfo: {
      size: ISBN_SEARCH_CACHE.size,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      ttl: CACHE_CONFIG.TTL
    }
  };
}

/**
 * ISBN搜索结果缓存管理工具函数
 */
export const isbnCacheUtils = {
  /**
   * 清除指定ISBN的缓存
   */
  clearByISBN: (isbn: string) => {
    ISBN_SEARCH_CACHE.delete(isbn);

  },
  
  /**
   * 清除所有ISBN搜索缓存
   */
  clearAll: () => {
    ISBN_SEARCH_CACHE.clear();

  },
  
  /**
   * 获取指定ISBN的缓存
   */
  getCache: (isbn: string) => {
    const cached = ISBN_SEARCH_CACHE.get(isbn);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  },
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats: () => {
    let validCount = 0;
    let invalidCount = 0;
    
    for (const [, cacheItem] of ISBN_SEARCH_CACHE.entries()) {
      if (isCacheValid(cacheItem.timestamp)) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
    
    return {
      total: ISBN_SEARCH_CACHE.size,
      valid: validCount,
      invalid: invalidCount,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      ttl: CACHE_CONFIG.TTL
    };
  }
};

export default {
  searchBookByISBN,
  searchTanshuByISBN,
  searchDoubanByISBN,
  searchIsbnWorkByISBN,
  getApiStats,
  isbnCacheUtils
};