/**
 * 封面服务
 * 处理书籍封面的上传和删除
 */

import path from 'path';
import fs from 'fs/promises';
import calibreService from '../../../services/calibreService.js';
import databaseService from '../../../services/database/index.js';

/**
 * 上传书籍封面
 */
async function uploadCover(bookId, coverBuffer, originalName) {
  try {
    console.log(`\n📤 开始上传封面，书籍ID: ${bookId}`);
    console.log(`📤 封面文件: ${originalName}, 大小: ${coverBuffer.length}字节`);

    // 从 Calibre 格式获取书籍
    const book = await calibreService.getBookFromCalibreById(bookId);
    if (!book) {
      throw new Error('书籍不存在');
    }

    console.log(`✅ 找到书籍: ${book.title}`);

    // 确保使用最新的书库目录
    calibreService.updateBookDir();
    const bookDir = calibreService.getBookDir();
    console.log(`📂 当前书库目录: ${bookDir}`);

    // 使用数据库中的 path 字段构建封面路径
    const bookPath = book.path || `${book.author || '未知作者'}/${book.title || '未知书名'}`;
    const coverDir = path.join(bookDir, bookPath);
    const coverPath = path.join(coverDir, 'cover.jpg');

    console.log(`💾 保存新封面到 Calibre 路径: ${coverPath}`);

    // 创建目录（如果不存在）
    await fs.mkdir(coverDir, { recursive: true });

    // 保存封面图片到 Calibre 路径
    await fs.writeFile(coverPath, coverBuffer);
    console.log('✅ 封面保存成功');

    // 更新书籍的封面状态
    const updatedBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      hasCover: true,
      path: book.path
    };

    // 更新数据库中的 has_cover 字段
    try {
      if (databaseService.isCalibreAvailable()) {
        databaseService.updateBookInDB(updatedBook);
        console.log('✅ 数据库中 has_cover 字段更新成功');
      }
    } catch (dbError) {
      console.warn('⚠️ 更新数据库 has_cover 字段失败:', dbError.message);
    }

    // 保存到 Calibre 格式
    await calibreService.saveBookToCalibre(updatedBook);
    console.log('✅ 封面上传成功');

    // 清除缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    calibreService.clearCoverCache();
    console.log('🗑️ 缓存已清除');

    // 更新元数据汇总
    const allBooks = await calibreService.getAllBooksFromCalibre();
    await calibreService.generateCalibreMetadataSummary(allBooks);

    return updatedBook;
  } catch (error) {
    console.error('❌ 封面上传失败:', error);
    throw error;
  }
}

/**
 * 删除书籍封面
 */
async function deleteCover(bookId) {
  try {
    console.log(`\n🗑️ 开始删除封面，书籍ID: ${bookId}`);

    // 从 Calibre 格式获取书籍
    const book = await calibreService.getBookFromCalibreById(bookId);
    if (!book) {
      throw new Error('书籍不存在');
    }

    // 确保使用最新的书库目录
    calibreService.updateBookDir();
    const bookDir = calibreService.getBookDir();

    // 使用数据库中的 path 字段构建封面路径
    const bookPath = book.path || `${book.author || '未知作者'}/${book.title || '未知书名'}`;
    const coverPath = path.join(bookDir, bookPath, 'cover.jpg');

    // 尝试删除封面文件
    try {
      await fs.access(coverPath);
      await fs.unlink(coverPath);
      console.log(`✅ 封面文件已删除: ${coverPath}`);
    } catch (err) {
      console.log(`ℹ️ 封面文件不存在或已删除: ${coverPath}`);
    }

    // 更新书籍信息，移除封面
    const updatedBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      hasCover: false,
      path: book.path
    };

    // 更新数据库中的封面状态
    if (databaseService.isCalibreAvailable()) {
      try {
        databaseService.updateBookInDB(updatedBook);
        console.log('✅ 数据库中的封面状态已更新');
      } catch (dbError) {
        console.warn('⚠️ 更新数据库封面状态失败:', dbError.message);
      }
    }

    // 保存到 Calibre 格式
    await calibreService.saveBookToCalibre(updatedBook);

    // 清除缓存
    calibreService.clearBooksListCache();
    calibreService.clearBookCache();
    calibreService.clearCoverCache();

    // 更新元数据汇总
    try {
      const allBooks = await calibreService.getAllBooksFromCalibre();
      await calibreService.generateCalibreMetadataSummary(allBooks);
    } catch (metadataError) {
      console.warn('⚠️ 更新元数据汇总失败:', metadataError.message);
    }

    return updatedBook;
  } catch (error) {
    console.error('❌ 删除封面失败:', error);
    throw error;
  }
}

export default {
  uploadCover,
  deleteCover
};
