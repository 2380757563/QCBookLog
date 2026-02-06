/**
 * 书籍数据验证器
 * 验证书籍创建和更新的数据
 */

import databaseService from '../../../services/database/index.js';

/**
 * 验证书籍ID
 */
function validateBookId(id) {
  const bookId = parseInt(id, 10);
  if (isNaN(bookId)) {
    throw new Error('无效的书籍ID');
  }
  return bookId;
}

/**
 * 验证书籍创建数据
 */
function validateBookCreateData(data) {
  const errors = [];
  
  // 验证书名
  if (!data.title || data.title.trim() === '') {
    errors.push('书名不能为空');
  }
  
  // 验证作者
  if (!data.author || data.author.trim() === '') {
    errors.push('作者不能为空');
  }
  
  // 验证 ISBN
  if (data.isbn) {
    const validationResult = databaseService.validateBook(data);
    if (!validationResult.isValid) {
      errors.push(...validationResult.errors);
    }
  }
  
  // 验证评分
  if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
    errors.push('评分范围无效（应在0-5之间）');
  }
  
  // 验证页数
  if (data.pages !== undefined && (data.pages < 0 || data.pages > 100000)) {
    errors.push('页数范围无效');
  }
  
  // 验证标签
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('标签必须是数组');
  }
  
  // 验证分组
  if (data.groups && !Array.isArray(data.groups)) {
    errors.push('分组必须是数组');
  }
  
  if (errors.length > 0) {
    const error = new Error('书籍数据验证失败');
    error.validationErrors = errors;
    throw error;
  }
  
  // 清理数据
  return sanitizeBookData(data);
}

/**
 * 验证书籍更新数据
 */
function validateBookUpdateData(data) {
  const errors = [];
  
  // 如果更新标题，验证标题
  if (data.title !== undefined && data.title.trim() === '') {
    errors.push('书名不能为空');
  }
  
  // 如果更新作者，验证作者
  if (data.author !== undefined && data.author.trim() === '') {
    errors.push('作者不能为空');
  }
  
  // 验证评分
  if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
    errors.push('评分范围无效（应在0-5之间）');
  }
  
  // 验证页数
  if (data.pages !== undefined && (data.pages < 0 || data.pages > 100000)) {
    errors.push('页数范围无效');
  }
  
  if (errors.length > 0) {
    const error = new Error('书籍更新数据验证失败');
    error.validationErrors = errors;
    throw error;
  }
  
  return data;
}

/**
 * 清理书籍数据
 */
function sanitizeBookData(data) {
  const sanitized = {
    title: data.title?.trim() || '',
    author: data.author?.trim() || '',
    isbn: data.isbn || '',
    publisher: data.publisher || '',
    description: data.description || '',
    publishYear: data.publishYear || undefined,
    pages: data.pages || undefined,
    binding1: data.binding1 !== undefined ? data.binding1 : 0,
    binding2: data.binding2 !== undefined ? data.binding2 : 0,
    rating: data.rating || undefined,
    series: data.series || '',
    language: data.language || 'zh',
    readStatus: data.readStatus || '未读',
    tags: Array.isArray(data.tags) ? data.tags : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    purchaseDate: data.purchaseDate || new Date().toISOString(),
    purchasePrice: data.purchasePrice || undefined,
    readCompleteDate: data.readCompleteDate || '',
    standardPrice: data.standardPrice || 0,
    note: data.note || ''
  };
  
  // 生成路径（如果没有提供）
  if (!data.path) {
    sanitized.path = `${sanitized.author}/${sanitized.title}`;
  }
  
  return sanitized;
}

export default {
  validateBookId,
  validateBookCreateData,
  validateBookUpdateData,
  sanitizeBookData
};
