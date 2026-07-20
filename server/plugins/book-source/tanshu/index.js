import BookSourcePlugin from '../base.js';
import { TanshuBookApi } from './api.js';

export class TanshuBookSource extends BookSourcePlugin {
  get sourceKey() {
    return 'tanshu';
  }

  get sourceName() {
    return '探数图书';
  }

  get isRequired() {
    return true;
  }

  get description() {
    return '探数图书 ISBN 查询 API，计费接口，填写后可在搜索结果中显示';
  }

  get sortOrder() {
    return 1;
  }

  isEnabled(config) {
    return !!(config && config.apiKey);
  }

  async searchByIsbn(isbn, config) {
    const api = new TanshuBookApi(config.apiKey);
    return await api.getByIsbn(isbn);
  }
}

export default TanshuBookSource;
