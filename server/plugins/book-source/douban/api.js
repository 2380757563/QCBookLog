/**
 * 豆瓣图书 API 客户端
 */

import axios from 'axios';

export class DoubanBookApi {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async getByIsbn(isbn) {
    const response = await axios.get(
      `https://api.douban.com/v2/book/isbn/${isbn}`,
      {
        params: {
          apikey: this.apiKey
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 15000
      }
    );

    const data = response.data;

    // 处理译者，合并到作者字段
    if (data.translator && Array.isArray(data.translator) && data.translator.length > 0) {
      const translatorStr = data.translator.join(' & ');
      if (data.author && Array.isArray(data.author)) {
        if (data.author.length > 0) {
          data.author[data.author.length - 1] = `${data.author[data.author.length - 1]} & ${translatorStr}`;
        } else {
          data.author = [translatorStr];
        }
      }
    }

    return data;
  }
}

export default DoubanBookApi;
