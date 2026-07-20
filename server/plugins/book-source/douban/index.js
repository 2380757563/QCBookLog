import BookSourcePlugin from '../base.js';
import { DoubanBookApi } from './api.js';

export class DoubanBookSource extends BookSourcePlugin {
  get sourceKey() {
    return 'douban';
  }

  get sourceName() {
    return '豆瓣图书';
  }

  get isRequired() {
    return true;
  }

  get description() {
    return '豆瓣图书 API（v2），需要 apikey，用于查询图书元数据和封面';
  }

  get sortOrder() {
    return 2;
  }

  isEnabled(config) {
    return !!(config && config.apiKey);
  }

  async searchByIsbn(isbn, config) {
    const api = new DoubanBookApi(config.apiKey);
    return await api.getByIsbn(isbn);
  }
}

export default DoubanBookSource;
