/**
 * 配置路径验证器
 * 验证数据库路径的有效性
 */

import fs from 'fs';
import path from 'path';

/**
 * 配置路径验证器类
 */
class PathValidator {
  /**
   * 验证 Calibre 数据库路径
   */
  async validateCalibrePath(dbPath) {
    const errors = [];
    const warnings = [];

    try {
      // 检查路径是否存在
      if (!dbPath) {
        errors.push('Calibre 数据库路径不能为空');
        return { isValid: false, errors, warnings };
      }

      // 检查文件是否存在
      const fileExists = fs.existsSync(dbPath);
      if (!fileExists) {
        errors.push(`Calibre 数据库文件不存在: ${dbPath}`);
        return { isValid: false, errors, warnings };
      }

      // 检查文件扩展名
      if (!dbPath.endsWith('.db')) {
        warnings.push('Calibre 数据库文件应以 .db 结尾');
      }

      // 检查是否是文件
      const stats = fs.statSync(dbPath);
      if (!stats.isFile()) {
        errors.push(`${dbPath} 不是文件`);
        return { isValid: false, errors, warnings };
      }

      // 检查文件大小
      if (stats.size < 1024) {
        warnings.push('Calibre 数据库文件过小（可能损坏）');
      }

      // 验证目录结构
      const calibreDir = path.dirname(dbPath);
      const authorDir = path.join(calibreDir, 'authors');
      const booksDir = path.join(calibreDir, 'books');

      if (!fs.existsSync(authorDir)) {
        warnings.push('Calibre authors 目录不存在');
      }
      if (!fs.existsSync(booksDir)) {
        warnings.push('Calibre books 目录不存在');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`验证 Calibre 数据库路径失败: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * 验证 Talebook 数据库路径
   */
  async validateTalebookPath(dbPath) {
    const errors = [];
    const warnings = [];

    try {
      // 检查路径是否存在
      if (!dbPath) {
        errors.push('Talebook 数据库路径不能为空');
        return { isValid: false, errors, warnings };
      }

      // 检查文件是否存在
      const fileExists = fs.existsSync(dbPath);
      if (!fileExists) {
        errors.push(`Talebook 数据库文件不存在: ${dbPath}`);
        return { isValid: false, errors, warnings };
      }

      // 检查文件扩展名
      if (!dbPath.endsWith('.db')) {
        warnings.push('Talebook 数据库文件应以 .db 结尾');
      }

      // 检查是否是文件
      const stats = fs.statSync(dbPath);
      if (!stats.isFile()) {
        errors.push(`${dbPath} 不是文件`);
        return { isValid: false, errors, warnings };
      }

      // 检查文件大小
      if (stats.size < 1024) {
        warnings.push('Talebook 数据库文件过小（可能损坏）');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`验证 Talebook 数据库路径失败: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * 验证 Calibre 书库目录
   */
  async validateCalibreDir(dirPath) {
    const errors = [];
    const warnings = [];

    try {
      // 检查路径是否存在
      if (!dirPath) {
        errors.push('Calibre 书库目录不能为空');
        return { isValid: false, errors, warnings };
      }

      // 检查目录是否存在
      const dirExists = fs.existsSync(dirPath);
      if (!dirExists) {
        errors.push(`Calibre 书库目录不存在: ${dirPath}`);
        return { isValid: false, errors, warnings };
      }

      // 检查是否是目录
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        errors.push(`${dirPath} 不是目录`);
        return { isValid: false, errors, warnings };
      }

      // 检查必需的子目录
      const requiredDirs = ['authors', 'books', 'metadata.db'];
      for (const dir of requiredDirs) {
        const itemPath = path.join(dirPath, dir);
        if (!fs.existsSync(itemPath)) {
          warnings.push(`缺少必需项: ${dir}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`验证 Calibre 书库目录失败: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }
}

export default new PathValidator();
