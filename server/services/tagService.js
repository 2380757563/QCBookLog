/**
 * 标签服务
 * 负责处理书籍标签的添加、去重、规范化等操作
 * 支持中文标签的正确处理和数据库事务完整性
 */

class TagService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  /**
   * 规范化标签名称
   * - 去除前后空格
   * - 处理重复空格
   * - 确保标签不为空
   * @param {string} tagName - 原始标签名称
   * @returns {string|null} 规范化后的标签名称，如果无效则返回null
   */
  normalizeTagName(tagName) {
    if (!tagName || typeof tagName !== 'string') {
      return null;
    }

    // 去除前后空格
    let normalized = tagName.trim();

    // 处理内部多个空格，替换为单个空格
    normalized = normalized.replace(/\s+/g, ' ');

    // 如果规范化后为空，返回null
    if (normalized.length === 0) {
      return null;
    }

    return normalized;
  }

  /**
   * 标签数组去重和规范化
   * - 去除重复标签（不区分大小写）
   * - 规范化每个标签名称
   * - 过滤无效标签
   * @param {string[]} tags - 原始标签数组
   * @returns {string[]} 处理后的标签数组
   */
  normalizeAndDeduplicateTags(tags) {
    if (!Array.isArray(tags)) {
      console.warn('⚠️ tags不是数组，返回空数组');
      return [];
    }

    const normalizedTags = [];
    const seenTags = new Set();

    for (const tag of tags) {
      const normalized = this.normalizeTagName(tag);

      if (!normalized) {
        console.warn(`⚠️ 跳过无效标签: ${JSON.stringify(tag)}`);
        continue;
      }

      // 使用小写进行去重比较，但保留原始大小写
      const lowerCaseTag = normalized.toLowerCase();
      if (seenTags.has(lowerCaseTag)) {
        console.log(`ℹ️ 跳过重复标签: ${normalized}`);
        continue;
      }

      seenTags.add(lowerCaseTag);
      normalizedTags.push(normalized);
    }

    return normalizedTags;
  }

  /**
   * 批量添加标签到数据库（带去重）
   * @param {string[]} tagNames - 标签名称数组
   * @returns {Map<string, number>} 标签名称到ID的映射
   */
  batchAddTags(tagNames) {
    if (!this.databaseService || !this.databaseService.calibreDb) {
      throw new Error('Calibre数据库服务不可用');
    }

    const db = this.databaseService.calibreDb;
    const tagIdMap = new Map();

    console.log(`🏷️  开始批量添加标签，共 ${tagNames.length} 个`);

    for (const tagName of tagNames) {
      try {
        // 查找标签是否已存在
        const existingTag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName);

        if (existingTag) {
          console.log(`✅ 标签已存在: ${tagName} (ID: ${existingTag.id})`);
          tagIdMap.set(tagName, existingTag.id);
        } else {
          // 插入新标签
          const result = db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(tagName);
          const newTagId = result.lastInsertRowid;
          console.log(`✅ 新标签已创建: ${tagName} (ID: ${newTagId})`);
          tagIdMap.set(tagName, newTagId);
        }
      } catch (error) {
        console.error(`❌ 添加标签失败: ${tagName}`, error.message);
        // 继续处理其他标签，不中断整个流程
      }
    }

    console.log(`🏷️  批量添加标签完成，成功 ${tagIdMap.size}/${tagNames.length} 个`);
    return tagIdMap;
  }

  /**
   * 为书籍添加标签关联
   * @param {number} bookId - 书籍ID
   * @param {string[]} tagNames - 标签名称数组
   * @returns {Object} 操作结果
   */
  addTagsToBook(bookId, tagNames) {
    try {
      if (!this.databaseService || !this.databaseService.calibreDb) {
        throw new Error('Calibre数据库服务不可用');
      }

      const db = this.databaseService.calibreDb;

      console.log(`\n🏷️  开始为书籍添加标签，书籍ID: ${bookId}`);
      console.log(`🏷️  原始标签数量: ${tagNames.length}`);

      // 1. 规范化和去重标签
      const normalizedTags = this.normalizeAndDeduplicateTags(tagNames);
      console.log(`🏷️  规范化后标签数量: ${normalizedTags.length}`);
      console.log(`🏷️  规范化后标签列表:`, normalizedTags);

      if (normalizedTags.length === 0) {
        console.log(`ℹ️ 没有有效标签需要添加`);
        return {
          success: true,
          message: '没有有效标签需要添加',
          addedCount: 0,
          skippedCount: tagNames.length
        };
      }

      // 2. 批量添加标签到tags表
      const tagIdMap = this.batchAddTags(normalizedTags);

      // 3. 建立书籍与标签的关联
      let addedCount = 0;
      let skippedCount = 0;

      for (const tagName of normalizedTags) {
        const tagId = tagIdMap.get(tagName);

        if (!tagId) {
          console.warn(`⚠️ 标签ID未找到: ${tagName}`);
          skippedCount++;
          continue;
        }

        try {
          // 使用INSERT OR IGNORE避免重复关联
          const result = db.prepare(`INSERT OR IGNORE INTO books_tags_link (book, tag) VALUES (?, ?)`).run(bookId, tagId);

          if (result.changes > 0) {
            console.log(`✅ 标签关联已添加: ${tagName} (Tag ID: ${tagId})`);
            addedCount++;
          } else {
            console.log(`ℹ️ 标签关联已存在: ${tagName}`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ 添加标签关联失败: ${tagName}`, error.message);
          skippedCount++;
        }
      }

      console.log(`🏷️  标签添加完成，成功: ${addedCount}, 跳过: ${skippedCount}\n`);

      return {
        success: true,
        message: `成功添加 ${addedCount} 个标签`,
        addedCount,
        skippedCount,
        totalTags: normalizedTags.length
      };
    } catch (error) {
      console.error(`❌ 为书籍添加标签失败:`, error.message);
      console.error(`❌ 错误堆栈:`, error.stack);
      return {
        success: false,
        message: error.message,
        addedCount: 0,
        skippedCount: 0
      };
    }
  }

  /**
   * 更新书籍的标签（替换所有标签）
   * @param {number} bookId - 书籍ID
   * @param {string[]} tagNames - 新的标签名称数组
   * @returns {Object} 操作结果
   */
  updateBookTags(bookId, tagNames) {
    try {
      if (!this.databaseService || !this.databaseService.calibreDb) {
        throw new Error('Calibre数据库服务不可用');
      }

      const db = this.databaseService.calibreDb;

      console.log(`\n🏷️  开始更新书籍标签，书籍ID: ${bookId}`);

      // 1. 删除旧的标签关联
      const deleteResult = db.prepare(`DELETE FROM books_tags_link WHERE book = ?`).run(bookId);
      console.log(`✅ 已删除旧标签关联: ${deleteResult.changes} 条`);

      // 2. 添加新的标签
      const result = this.addTagsToBook(bookId, tagNames);

      console.log(`🏷️  书籍标签更新完成\n`);

      return {
        success: true,
        message: '书籍标签更新成功',
        deletedCount: deleteResult.changes,
        ...result
      };
    } catch (error) {
      console.error(`❌ 更新书籍标签失败:`, error.message);
      console.error(`❌ 错误堆栈:`, error.stack);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 获取书籍的所有标签
   * @param {number} bookId - 书籍ID
   * @returns {Array} 标签数组
   */
  getBookTags(bookId) {
    try {
      if (!this.databaseService || !this.databaseService.calibreDb) {
        throw new Error('Calibre数据库服务不可用');
      }

      const db = this.databaseService.calibreDb;

      const tags = db.prepare(`
        SELECT t.id, t.name
        FROM tags t
        JOIN books_tags_link btl ON t.id = btl.tag
        WHERE btl.book = ?
        ORDER BY t.name
      `).all(bookId);

      return tags;
    } catch (error) {
      console.error(`❌ 获取书籍标签失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有标签
   * @returns {Array} 标签数组
   */
  getAllTags() {
    try {
      if (!this.databaseService || !this.databaseService.calibreDb) {
        throw new Error('Calibre数据库服务不可用');
      }

      const db = this.databaseService.calibreDb;

      const tags = db.prepare(`
        SELECT id, name
        FROM tags
        ORDER BY name
      `).all();

      return tags;
    } catch (error) {
      console.error(`❌ 获取所有标签失败:`, error.message);
      return [];
    }
  }

  /**
   * 删除标签
   * @param {number} tagId - 标签ID
   * @returns {Object} 操作结果
   */
  deleteTag(tagId) {
    try {
      if (!this.databaseService || !this.databaseService.calibreDb) {
        throw new Error('Calibre数据库服务不可用');
      }

      const db = this.databaseService.calibreDb;

      // 删除标签（会自动级联删除books_tags_link中的关联记录）
      const result = db.prepare(`DELETE FROM tags WHERE id = ?`).run(tagId);

      return {
        success: true,
        message: '标签删除成功',
        deletedCount: result.changes
      };
    } catch (error) {
      console.error(`❌ 删除标签失败:`, error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default TagService;
