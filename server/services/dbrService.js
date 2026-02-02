/**
 * DBR (Douban Book Rust) 搜索服务
 * 基于Rust版豆瓣信息爬取功能的Node.js实现
 * 优化版本：改进缓存策略，添加请求超时优化和性能监控
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

// 缓存配置
// 书籍详情缓存：TTL 30分钟，最大300条记录
const BOOK_CACHE = new NodeCache({ stdTTL: 30 * 60, maxKeys: 300 });
// 搜索结果缓存：TTL 5分钟，最大50条记录
const SEARCH_CACHE = new NodeCache({ stdTTL: 5 * 60, maxKeys: 50 });

// 性能监控
const perfMetrics = {
  search: { count: 0, totalTime: 0, cacheHits: 0 },
  getBookByIsbn: { count: 0, totalTime: 0, cacheHits: 0 },
  getBookById: { count: 0, totalTime: 0, cacheHits: 0 }
};

/**
 * DBR搜索服务类
 */
class DBRService {
  constructor() {
    // 初始化正则表达式
    this.reId = /sid: (\d+?),/;
    this.reInfoPair = /([^\s]+?):\s*([^\n]+)/g;
    this.reRemoveSplitSpace = /\s+?\/\s+/g;

    // 初始化axios实例 - 优化超时配置
    this.axiosInstance = axios.create({
      timeout: 15000, // 15秒超时（原来10秒）
      maxRedirects: 3, // 限制重定向次数
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      }
    });
  }

  /**
   * 搜索书籍（优化版本：带缓存）
   * @param {string} q - 搜索关键词
   * @param {number} count - 返回结果数量
   * @returns {Promise<Array>} 搜索结果列表
   */
  async search(q, count = 10) {
    const startTime = Date.now();
    perfMetrics.search.count++;

    if (!q) {
      return [];
    }

    // 检查搜索缓存
    const cacheKey = `search:${q}:${count}`;
    const cachedResults = SEARCH_CACHE.get(cacheKey);
    if (cachedResults) {
      perfMetrics.search.cacheHits++;
      const elapsed = Date.now() - startTime;
      perfMetrics.search.totalTime += elapsed;
      console.log(`📦 从缓存获取搜索结果，关键词: "${q}"，耗时: ${elapsed}ms`);
      return cachedResults;
    }

    const url = 'https://www.douban.com/search';
    const params = {
      cat: '1001',
      q: q
    };

    try {
      const response = await this.axiosInstance.get(url, { params });
      const $ = cheerio.load(response.data);
      const resultList = [];

      $('.result').each((index, element) => {
        if (index >= count) return false;

        const $element = $(element);
        const onclick = $element.find('div.title a').attr('onclick') || '';
        const title = $element.find('div.title a').text().trim();
        const summary = $element.find('p').text().trim();
        const large = $element.find('.pic img').attr('src') || '';
        const rate = $element.find('.rating_nums').text().trim();
        const subStr = $element.find('.subject-cast').text().trim();
        const subjects = subStr.split('/').filter(s => s.trim() !== '');
        const len = subjects.length;

        let pubdate = '';
        let publisher = '';
        const author = [];

        if (len >= 3) {
          pubdate = subjects[len - 1].trim();
          publisher = subjects[len - 2].trim();
          for (let i = 0; i < len - 2; i++) {
            author.push(subjects[i].trim());
          }
        } else if (len == 2) {
          author.push(subjects[0].trim());
          if (!isNaN(subjects[1].trim())) {
            pubdate = subjects[1].trim();
          } else {
            publisher = subjects[1].trim();
          }
        } else if (len == 1) {
          author.push(subjects[0].trim());
        }

        let id = '';
        const match = this.reId.exec(onclick);
        if (match) {
          id = match[1].trim();
        }

        const rating = {
          average: rate ? parseFloat(rate) : 0
        };

        const images = {
          small: large,
          medium: large,
          large: large
        };

        resultList.push({
          id,
          title,
          author,
          pubdate,
          publisher,
          images,
          rating,
          summary
        });
      });

      // 存入缓存
      SEARCH_CACHE.set(cacheKey, resultList);

      const elapsed = Date.now() - startTime;
      perfMetrics.search.totalTime += elapsed;
      console.log(`🔍 DBR搜索完成，关键词: "${q}"，结果数: ${resultList.length}，耗时: ${elapsed}ms`);

      return resultList;
    } catch (error) {
      console.error('❌ DBR搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 根据ISBN获取书籍信息（优化版本：带性能监控）
   * @param {string} isbn - ISBN号码
   * @param {boolean} returnRawHtml - 是否返回原始HTML，默认true
   * @returns {Promise<Object|null>} 书籍信息
   */
  async getBookByIsbn(isbn, returnRawHtml = true) {
    const startTime = Date.now();
    perfMetrics.getBookByIsbn.count++;

    // 检查缓存
    const cachedBook = BOOK_CACHE.get(isbn);
    if (cachedBook) {
      perfMetrics.getBookByIsbn.cacheHits++;
      const elapsed = Date.now() - startTime;
      perfMetrics.getBookByIsbn.totalTime += elapsed;
      console.log(`📦 从缓存获取书籍，ISBN: ${isbn}，耗时: ${elapsed}ms`);
      return cachedBook;
    }

    const url = `https://douban.com/isbn/${isbn}/`;

    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const book = this._parseBookDetail($, isbn);

      // 添加原始HTML数据
      if (returnRawHtml) {
        book.rawHtml = response.data;
        book.sourceUrl = url;
      }

      // 双键缓存（ISBN + ID）
      BOOK_CACHE.set(isbn, book);
      if (book.id) {
        BOOK_CACHE.set(book.id, book);
      }

      const elapsed = Date.now() - startTime;
      perfMetrics.getBookByIsbn.totalTime += elapsed;
      console.log(`🔍 DBR ISBN查询完成，ISBN: ${isbn}，耗时: ${elapsed}ms`);

      return book;
    } catch (error) {
      console.error(`❌ DBR ISBN查询失败 (${isbn}):`, error.message);
      return null;
    }
  }

  /**
   * 根据ID获取书籍信息（优化版本：带性能监控）
   * @param {string} id - 书籍ID
   * @param {boolean} returnRawHtml - 是否返回原始HTML，默认true
   * @returns {Promise<Object|null>} 书籍信息
   */
  async getBookById(id, returnRawHtml = true) {
    const startTime = Date.now();
    perfMetrics.getBookById.count++;

    // 检查缓存
    const cachedBook = BOOK_CACHE.get(id);
    if (cachedBook) {
      perfMetrics.getBookById.cacheHits++;
      const elapsed = Date.now() - startTime;
      perfMetrics.getBookById.totalTime += elapsed;
      console.log(`📦 从缓存获取书籍，ID: ${id}，耗时: ${elapsed}ms`);
      return cachedBook;
    }

    const url = `https://book.douban.com/subject/${id}/`;

    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);
      const book = this._parseBookDetail($, '');

      // 添加原始HTML数据
      if (returnRawHtml) {
        book.rawHtml = response.data;
        book.sourceUrl = url;
      }

      // 双键缓存（ID + ISBN）
      BOOK_CACHE.set(id, book);
      if (book.isbn13) {
        BOOK_CACHE.set(book.isbn13, book);
      }

      const elapsed = Date.now() - startTime;
      perfMetrics.getBookById.totalTime += elapsed;
      console.log(`🔍 DBR ID查询完成，ID: ${id}，耗时: ${elapsed}ms`);

      return book;
    } catch (error) {
      console.error(`❌ DBR ID查询失败 (${id}):`, error.message);
      return null;
    }
  }

  /**
   * 从DOM提取作者和译者（备用方法）
   */
  _extractAuthorsFromDOM($, authors, translators) {
    // 方法1: 直接遍历带有pl类的span标签，提取后续内容
    $('#info').find('.pl').each((index, element) => {
      const label = $(element).text().trim();
      console.log(`🔍 找到标签: "${label}"`);

      // 获取当前元素后的所有兄弟节点，直到 <br>
      const $nextElements = $(element).nextUntil('br');
      const currentAuthors = [];
      const currentTranslators = [];

      $nextElements.each((i, el) => {
        const $el = $(el);
        const tagName = el.tagName ? el.tagName.toUpperCase() : '';

        console.log(`  - 节点 ${i}: tagName=${tagName}, nodeType=${el.nodeType}, text="${$el.text()}"`);

        if (tagName === 'A') {
          // a 标签，提取完整文本（包括前面的 [日本] 等）
          const fullText = $el.text().trim();
          console.log(`    提取 a 完整内容: "${fullText}"`);
          
          if (label.includes('作者')) {
            currentAuthors.push(fullText);
          } else if (label.includes('译者')) {
            currentTranslators.push(fullText);
          }
        }
      });

      // 处理作者信息
      if (label.includes('作者') && currentAuthors.length > 0) {
        console.log(`📚 提取到作者列表:`, currentAuthors);
        // 将多个作者用" / "连接
        const authorStr = currentAuthors.join(' / ');
        authors.push(authorStr);
        console.log('✅ 解析到作者:', authorStr);
      }

      // 处理译者信息
      if (label.includes('译者') && currentTranslators.length > 0) {
        console.log(`🔤 提取到译者列表:`, currentTranslators);
        // 将多个译者用" & "连接
        const translatorStr = currentTranslators.join(' & ');
        translators.push(translatorStr);
        console.log('✅ 解析到译者:', translatorStr);
      }
    });
  }

  /**
   * 解析书籍详情
   * @param {Object} $ - cheerio实例
   * @param {string} isbn - ISBN号码
   * @returns {Object} 书籍详情
   */
  _parseBookDetail($, isbn) {
    const title = $('h1 > span:first-child').text().trim();
    const largeImg = $('a.nbg').attr('href') || '';
    const smallImg = $('a.nbg > img').attr('src') || '';
    const ratingStr = $('div.rating_self strong.rating_num').text().trim();
    const rating = { average: ratingStr ? parseFloat(ratingStr) : 0 };

    // 初始化作者和译者数组
    const authors = [];
    const translators = [];

    // 使用HTML解析提取作者和译者
    console.log('📖 开始解析 #info 区域...');
    const infoHtml = $('#info').html();
    console.log('📄 #info HTML:', infoHtml);

    // 直接使用DOM解析方法提取作者和译者
    this._extractAuthorsFromDOM($, authors, translators);

    // 清理作者和译者数组：去除多余的空白和换行符
    const cleanAuthors = authors.map(author => author.replace(/\s+/g, ' ').trim()).filter(author => author);
    const cleanTranslators = translators.map(translator => translator.replace(/\s+/g, ' ').trim()).filter(translator => translator);

    console.log('📚 清理后的作者列表:', cleanAuthors);
    console.log('🔤 清理后的译者列表:', cleanTranslators);

    // 合并作者和译者：所有作者用 " / " 连接，译者用 " & " 连接
    let finalAuthors = cleanAuthors;
    if (cleanTranslators.length > 0 && cleanAuthors.length > 0) {
      const authorStr = cleanAuthors.join(' / ');
      const translatorStr = cleanTranslators.join(' & ');
      finalAuthors = [`${authorStr} & ${translatorStr}`];
      console.log('✅ 合并后的作者:', finalAuthors[0]);
    } else if (cleanTranslators.length > 0 && cleanAuthors.length === 0) {
      finalAuthors = cleanTranslators;
      console.log('⚠️ 只有译者，没有作者');
    }

    console.log('📚 最终作者列表:', finalAuthors);
    console.log('🔤 最终译者列表:', cleanTranslators);

    // 获取书籍标签
    const tags = this._getTags($);

    // 解析其他信息
    const infoText = $('#info').text().trim();
    const infoMap = this._parseInfoText(infoText);

    return {
      id: this._getBookId($),
      author: finalAuthors,
      author_intro: this._getAuthorIntro($),
      translators,
      images: { 
        small: smallImg, 
        medium: largeImg, 
        large: largeImg 
      },
      binding: this._getText(infoMap, '装帧'),
      category: '',
      rating,
      isbn13: isbn || this._getText(infoMap, 'ISBN'),
      pages: this._getText(infoMap, '页数'),
      price: this._getText(infoMap, '定价'),
      pubdate: this._getText(infoMap, '出版年'),
      publisher: this._getText(infoMap, '出版社'),
      producer: this._getText(infoMap, '出品方'),
      serials: this._getText(infoMap, '丛书'),
      subtitle: this._getText(infoMap, '副标题'),
      summary: this._getSummary($),
      title,
      tags,
      origin: this._getText(infoMap, '原作名')
    };
  }

  /**
   * 获取书籍标签（多选择器策略）
   * @param {Object} $ - cheerio实例
   * @returns {Array} 标签列表
   */
  _getTags($) {
    const tags = [];

    // 策略0: 尝试从 criteria 字段提取标签（优先）
    const criteriaText = $('body').text() || '';
    const criteriaMatch = criteriaText.match(/criteria\s*=\s*['"]([^'"]+)['"]/);
    if (criteriaMatch) {
      console.log(`🏷️  找到 criteria 字段: "${criteriaMatch[1]}"`);
      // 按 "|" 分割，然后提取 ":" 后面的标签名
      const tagList = criteriaMatch[1]
        .split('|')
        .map(item => {
          const match = item.match(/\d+:(.+)/);
          return match ? match[1].trim() : null;
        })
        .filter(tag => {
          // 过滤掉空标签、包含/subject/的链接标签，以及只保留合法字符
          return tag && 
                 tag.length > 0 && 
                 !tag.includes('/subject/') &&
                 /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(tag);
        });
      tags.push(...tagList);
      console.log(`✅ 策略0成功获取${tags.length}个标签 (criteria字段)`);
      if (tags.length > 0) {
        return tags;
      }
    }

    // 策略1: 尝试豆瓣常用的标签区域
    let $tagsSection = $('#db-tags-section');
    if ($tagsSection.length) {
      $tagsSection.find('a').each((index, element) => {
        const tagText = $(element).text().trim();
        if (tagText && !tags.includes(tagText)) {
          tags.push(tagText);
        }
      });
      if (tags.length > 0) {
        console.log(`✅ 策略1成功获取${tags.length}个标签 (db-tags-section)`);
        return tags;
      }
    }

    // 策略2: 尝试.tags-body选择器
    $tagsSection = $('.tags-body');
    if ($tagsSection.length) {
      $tagsSection.find('a').each((index, element) => {
        const tagText = $(element).text().trim();
        if (tagText && !tags.includes(tagText)) {
          tags.push(tagText);
        }
      });
      if (tags.length > 0) {
        console.log(`✅ 策略2成功获取${tags.length}个标签 (.tags-body)`);
        return tags;
      }
    }

    // 策略3: 尝试查找所有包含/tag/的链接
    $('a[href*="/tag/"]').each((index, element) => {
      const tagText = $(element).text().trim();
      // 过滤掉太短或无效的标签
      if (tagText && tagText.length >= 2 && tagText.length <= 20 && !tags.includes(tagText)) {
        // 确保是中文、英文或数字
        if (/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(tagText)) {
          tags.push(tagText);
        }
      }
    });
    if (tags.length > 0) {
      console.log(`✅ 策略3成功获取${tags.length}个标签 (包含/tag/的链接)`);
      return tags;
    }

    // 策略4: 原始方法 - 查找.tag类
    $('a.tag').each((index, element) => {
      const tagText = $(element).text().trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
    if (tags.length > 0) {
      console.log(`✅ 策略4成功获取${tags.length}个标签 (.tag类)`);
      return tags;
    }

    console.log(`⚠️ 所有策略均未获取到标签`);
    return tags;
  }

  /**
   * 获取书籍ID
   * @param {Object} $ - cheerio实例
   * @returns {string} 书籍ID
   */
  _getBookId($) {
    const url = $('meta[property="og:url"]').attr('content') || '';
    if (url) {
      const match = url.match(/\d+/);
      if (match) {
        return match[0];
      }
    }
    return '';
  }

  /**
   * 获取作者简介
   * @param {Object} $ - cheerio实例
   * @returns {string} 作者简介
   */
  _getAuthorIntro($) {
    let authorIntro = $('.related_info .indent:not([id]) > .all.hidden .intro').html() || '';
    if (!authorIntro) {
      authorIntro = $('.related_info .indent:not([id]) .intro').html() || '';
    }
    return authorIntro.trim();
  }

  /**
   * 获取书籍摘要
   * @param {Object} $ - cheerio实例
   * @returns {string} 书籍摘要
   */
  _getSummary($) {
    let summary = $('#link-report .hidden .intro').text() || '';
    if (!summary) {
      summary = $('#link-report .intro').text() || '';
    }
    return summary.trim();
  }

  /**
   * 解析信息文本
   * @param {string} s - 信息文本
   * @returns {Object} 解析后的信息映射
   */
  _parseInfoText(s) {
    const map = {};
    // 先替换掉多作者/之间的换行符，避免下面的正则匹配少作者
    const fixStr = s.replaceAll(this.reRemoveSplitSpace, '/');
    // 再匹配:字符两边信息
    for (const cap of fixStr.matchAll(this.reInfoPair)) {
      map[cap[1].trim()] = cap[2].trim();
    }
    return map;
  }

  /**
   * 获取单个文本值
   * @param {Object} infoTextMap - 信息映射
   * @param {string} key - 键
   * @returns {string} 值
   */
  _getText(infoTextMap, key) {
    return infoTextMap[key] || '';
  }

  /**
   * 获取多个文本值
   * @param {Object} infoTextMap - 信息映射
   * @param {string} key - 键
   * @returns {Array} 值列表
   */
  _getTexts(infoTextMap, key) {
    const value = infoTextMap[key] || '';
    return value.split('/')
      .filter(x => x.trim() !== '')
      .map(x => x.trim());
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    BOOK_CACHE.flushAll();
    SEARCH_CACHE.flushAll();
    console.log('🗑️ 已清空所有DBR缓存');
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...perfMetrics,
      getAvgTime: (metric) => {
        const m = perfMetrics[metric];
        return m.count > 0 ? (m.totalTime / m.count).toFixed(2) : 0;
      },
      getCacheHitRate: (metric) => {
        const m = perfMetrics[metric];
        return m.count > 0 ? ((m.cacheHits / m.count) * 100).toFixed(2) + '%' : '0%';
      }
    };
  }

  /**
   * 打印性能报告
   */
  printPerformanceReport() {
    console.log('\n📊 DBR服务性能报告:');
    console.log('========================================');
    console.log(`search:      调用${perfMetrics.search.count}次, 命中${perfMetrics.search.cacheHits}次 (${((perfMetrics.search.cacheHits / (perfMetrics.search.count || 1)) * 100).toFixed(2)}%), 平均耗时${(perfMetrics.search.totalTime / (perfMetrics.search.count || 1)).toFixed(2)}ms`);
    console.log(`getBookByIsbn: 调用${perfMetrics.getBookByIsbn.count}次, 命中${perfMetrics.getBookByIsbn.cacheHits}次 (${((perfMetrics.getBookByIsbn.cacheHits / (perfMetrics.getBookByIsbn.count || 1)) * 100).toFixed(2)}%), 平均耗时${(perfMetrics.getBookByIsbn.totalTime / (perfMetrics.getBookByIsbn.count || 1)).toFixed(2)}ms`);
    console.log(`getBookById:  调用${perfMetrics.getBookById.count}次, 命中${perfMetrics.getBookById.cacheHits}次 (${((perfMetrics.getBookById.cacheHits / (perfMetrics.getBookById.count || 1)) * 100).toFixed(2)}%), 平均耗时${(perfMetrics.getBookById.totalTime / (perfMetrics.getBookById.count || 1)).toFixed(2)}ms`);
    console.log('========================================\n');
  }
}

export default new DBRService();
