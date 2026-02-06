/**
 * 书籍数据验证器
 * 验证书籍数据的完整性和有效性
 */

/**
 * 书籍数据验证器类
 */
class BookValidator {
  constructor() {
    // 必需字段
    this.requiredFields = ['title'];
    
    // 可选字段
    this.optionalFields = [
      'author', 'publisher', 'isbn', 'rating', 
      'description', 'series', 'series_index',
      'timestamp', 'pubdate', 'tags', 'formats',
      'path', 'has_cover', 'uuid'
    ];
    
    // 字段类型映射
    this.fieldTypes = {
      title: 'string',
      author: 'string',
      publisher: 'string',
      isbn: 'string',
      rating: 'number',
      description: 'string',
      series: 'string',
      series_index: 'number',
      timestamp: 'string',
      pubdate: 'string',
      path: 'string',
      has_cover: 'boolean',
      uuid: 'string',
      tags: 'array',
      formats: 'array'
    };
  }

  /**
   * 验证书籍数据
   * @param {Object} book - 书籍数据
   * @returns {Object} 验证结果 { isValid: boolean, errors: string[] }
   */
  validate(book) {
    const errors = [];

    // 验证必需字段
    for (const field of this.requiredFields) {
      if (!this.hasValue(book[field])) {
        errors.push(`缺少必需字段: ${field}`);
      }
    }

    // 验证字段类型
    for (const field of this.requiredFields.concat(this.optionalFields)) {
      if (book[field] !== undefined && book[field] !== null) {
        const expectedType = this.fieldTypes[field];
        if (expectedType && !this.isValidType(book[field], expectedType)) {
          errors.push(`字段 ${field} 类型错误: 期望 ${expectedType}, 实际 ${typeof book[field]}`);
        }
      }
    }

    // 验证ISBN格式
    if (book.isbn && !this.isValidISBN(book.isbn)) {
      errors.push('ISBN 格式无效');
    }

    // 验证书名长度
    if (book.title && book.title.length > 500) {
      errors.push('书名过长（最多500字符）');
    }

    // 验证描述长度
    if (book.description && book.description.length > 10000) {
      errors.push('描述过长（最多10000字符）');
    }

    // 验证评分范围
    if (book.rating !== undefined && (book.rating < 0 || book.rating > 5)) {
      errors.push('评分范围无效（应在0-5之间）');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 验证ISBN格式
   */
  isValidISBN(isbn) {
    // 移除所有非数字字符（除了X）
    const cleaned = isbn.replace(/[^0-9X]/gi, '');
    
    // ISBN-10 或 ISBN-13
    if (cleaned.length === 10 || cleaned.length === 13) {
      return this.checkISBNChecksum(cleaned);
    }
    
    return false;
  }

  /**
   * 检查ISBN校验和
   */
  checkISBNChecksum(isbn) {
    if (isbn.length === 10) {
      // ISBN-10 校验
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(isbn[i]) * (10 - i);
      }
      const last = isbn[9].toUpperCase() === 'X' ? 10 : parseInt(isbn[9]);
      sum += last;
      return sum % 11 === 0;
    } else if (isbn.length === 13) {
      // ISBN-13 校验
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checksum = (10 - (sum % 10)) % 10;
      return parseInt(isbn[12]) === checksum;
    }
    return false;
  }

  /**
   * 检查值是否存在且不为空
   */
  hasValue(value) {
    return value !== undefined && value !== null && value !== '';
  }

  /**
   * 验证数据类型
   */
  isValidType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 批量验证书籍数据
   */
  validateBatch(books) {
    const results = {
      isValid: true,
      errors: [],
      validBooks: [],
      invalidBooks: []
    };

    for (const book of books) {
      const result = this.validate(book);
      if (result.isValid) {
        results.validBooks.push(book);
      } else {
        results.isValid = false;
        results.invalidBooks.push({
          book: book,
          errors: result.errors
        });
        results.errors.push(...result.errors);
      }
    }

    return results;
  }

  /**
   * 清理和标准化书籍数据
   */
  sanitize(book) {
    const sanitized = {};

    // 只保留已知字段
    const allowedFields = this.requiredFields.concat(this.optionalFields);
    for (const field of allowedFields) {
      if (book[field] !== undefined && book[field] !== null) {
        sanitized[field] = this.sanitizeField(field, book[field]);
      }
    }

    return sanitized;
  }

  /**
   * 清理字段值
   */
  sanitizeField(fieldName, value) {
    switch (fieldName) {
      case 'title':
      case 'author':
      case 'publisher':
      case 'description':
      case 'series':
        return String(value).trim();
      case 'isbn':
        return String(value).replace(/[^0-9X]/gi, '');
      case 'rating':
        return Math.round(value * 10) / 10; // 保留一位小数
      case 'has_cover':
        return Boolean(value);
      case 'tags':
      case 'formats':
        return Array.isArray(value) ? value : [];
      default:
        return value;
    }
  }
}

export default BookValidator;
