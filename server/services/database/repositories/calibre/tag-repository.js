/**
 * Calibre 标签仓储
 * 处理标签相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Calibre 标签仓储类
 */
class TagRepository extends BaseRepository {
  /**
   * 查找所有标签
   */
  findAll() {
    try {
      const query = `
        SELECT
          t.id,
          t.name,
          (SELECT COUNT(*) FROM books_tags_link btl WHERE btl.tag = t.id) as book_count
        FROM tags t
        ORDER BY t.name
      `;
      return this.queryAll(query);
    } catch (error) {
      console.error('❌ 获取标签列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找标签
   */
  findById(id) {
    try {
      const query = `
        SELECT
          t.*,
          (SELECT COUNT(*) FROM books_tags_link btl WHERE btl.tag = t.id) as book_count
        FROM tags t
        WHERE t.id = ?
      `;
      return this.queryOne(query, [id]);
    } catch (error) {
      console.error(`❌ 查找标签 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据名称查找标签
   */
  findByName(name) {
    try {
      const query = 'SELECT * FROM tags WHERE name = ?';
      return this.queryOne(query, [name]);
    } catch (error) {
      console.error(`❌ 查找标签 name=${name} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建标签
   */
  create(name) {
    try {
      const id = this.insert('tags', { name });
      return this.findById(id);
    } catch (error) {
      console.error('❌ 创建标签失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新标签
   */
  update(id, data) {
    try {
      if (data.name === undefined) {
        return this.findById(id);
      }

      this.execute('UPDATE tags SET name = ? WHERE id = ?', [data.name, id]);
      return this.findById(id);
    } catch (error) {
      console.error(`❌ 更新标签 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除标签
   */
  delete(id) {
    try {
      // 先删除书籍关联
      this.execute('DELETE FROM books_tags_link WHERE tag = ?', [id]);
      // 删除标签
      const result = this.execute('DELETE FROM tags WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除标签 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索标签
   */
  search(keyword) {
    try {
      const query = `
        SELECT
          t.id,
          t.name,
          (SELECT COUNT(*) FROM books_tags_link btl WHERE btl.tag = t.id) as book_count
        FROM tags t
        WHERE t.name LIKE ?
        ORDER BY t.name
      `;
      return this.queryAll(query, [`%${keyword}%`]);
    } catch (error) {
      console.error('❌ 搜索标签失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量创建标签
   */
  batchCreate(names) {
    try {
      const uniqueNames = [...new Set(names.filter(n => n))];
      const createTag = this.transaction((name) => {
        const existing = this.findByName(name);
        if (existing) {
          return existing.id;
        }
        return this.insert('tags', { name });
      });

      return uniqueNames.map(name => createTag(name));
    } catch (error) {
      console.error('❌ 批量创建标签失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取书籍的所有标签
   */
  findByBookId(bookId) {
    try {
      const query = `
        SELECT t.*
        FROM tags t
        JOIN books_tags_link btl ON t.id = btl.tag
        WHERE btl.book = ?
        ORDER BY t.name
      `;
      return this.queryAll(query, [bookId]);
    } catch (error) {
      console.error(`❌ 获取书籍 ID=${bookId} 的标签失败:`, error.message);
      throw error;
    }
  }

  /**
   * 为书籍添加标签
   */
  addToBook(bookId, tagId) {
    try {
      this.execute('INSERT OR IGNORE INTO books_tags_link (book, tag) VALUES (?, ?)', [bookId, tagId]);
      return true;
    } catch (error) {
      console.error(`❌ 为书籍 ID=${bookId} 添加标签 ID=${tagId} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 从书籍移除标签
   */
  removeFromBook(bookId, tagId) {
    try {
      this.execute('DELETE FROM books_tags_link WHERE book = ? AND tag = ?', [bookId, tagId]);
      return true;
    } catch (error) {
      console.error(`❌ 从书籍 ID=${bookId} 移除标签 ID=${tagId} 失败:`, error.message);
      throw error;
    }
  }
}

export default TagRepository;
