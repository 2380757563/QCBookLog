import BookSourcePlugin from '../base.js';
import { IsbnWorkBookApi } from './api.js';

export class IsbnWorkBookSource extends BookSourcePlugin {
  get sourceKey() {
    return 'isbnWork';
  }

  get sourceName() {
    return '公共图书';
  }

  get isRequired() {
    return true;
  }

  get description() {
    return 'ISBN 公共图书 API（data.isbn.work），需要 appKey';
  }

  get sortOrder() {
    return 3;
  }

  isEnabled(config) {
    return !!(config && config.apiKey);
  }

  async searchByIsbn(isbn, config) {
    const api = new IsbnWorkBookApi(config.apiKey);
    return await api.getByIsbn(isbn);
  }
}

export default IsbnWorkBookSource;
