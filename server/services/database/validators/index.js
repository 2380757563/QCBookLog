/**
 * 数据验证模块
 * 提供书籍数据和数据库结构的验证功能
 */

import BookValidator from './book-validator.js';
import SchemaValidator from './schema-validator.js';

const validators = {
  book: new BookValidator(),
  schema: new SchemaValidator()
};

export default validators;
