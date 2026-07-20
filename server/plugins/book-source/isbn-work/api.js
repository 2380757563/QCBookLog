/**
 * ISBN 公共图书 API 客户端（data.isbn.work）
 */

import axios from 'axios';

export class IsbnWorkBookApi {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'http://data.isbn.work/openApi/getInfoByIsbn';
  }

  async getByIsbn(isbn) {
    const response = await axios.get(this.baseUrl, {
      params: {
        appKey: this.apiKey,
        isbn: isbn
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    return response.data;
  }
}

export default IsbnWorkBookApi;
