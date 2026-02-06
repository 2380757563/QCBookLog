/**
 * Calibre 出版社仓储
 * 处理出版社相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Calibre 出版社仓储类
 */
class PublisherRepository extends BaseRepository {
  /**
   * 查找所有出版社
   */
  findAll() {
    try {
      const query = `
        SELECT
          p.id,
          p.name,
          (SELECT COUNT(*) FROM books_publishers_link bpl WHERE bpl.publisher = p.id) as book_count
        FROM publishers p
        ORDER BY p.name
      `;
      return this.queryAll(query);
    } catch (error) {
      console.error('❌ 获取出版社列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找出版社
   */
  findById(id) {
    try {
      const query = `
        SELECT
          p.*,
          (SELECT COUNT(*) FROM books_publishers_link bpl WHERE bpl.publisher = p.id) as book_count
        FROM publishers p
        WHERE p.id = ?
      `;
      return this.queryOne(query, [id]);
    } catch (error) {
      console.error(`❌ 查找出版社 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据名称查找出版社
   */
  findByName(name) {
    try {
      const query = 'SELECT * FROM publishers WHERE name = ?';
      return this.queryOne(query, [name]);
    } catch (error) {
      console.error(`❌ 查找出版社 name=${name} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建出版社
   */
  create(name) {
    try {
      const id = this.insert('publishers', { name });
      return this.findById(id);
    } catch (error) {
      console.error('❌ 创建出版社失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新出版社
   */
  update(id, data) {
    try {
      if (data.name === undefined) {
        return this.findById(id);
      }

      this.execute('UPDATE publishers SET name = ? WHERE id = ?', [data.name, id]);
      return this.findById(id);
    } catch (error) {
      console.error(`❌ 更新出版社 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除出版社
   */
  delete(id) {
    try {
      // 先删除书籍关联
      this.execute('DELETE FROM books_publishers_link WHERE publisher = ?', [id]);
      // 删除出版社
      const result = this.execute('DELETE FROM publishers WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除出版社 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索出版社
   */
  search(keyword) {
    try {
      const query = `
        SELECT
          p.id,
          p.name,
          (SELECT COUNT(*) FROM books_publishers_link bpl WHERE bpl.publisher = p.id) as book_count
        FROM publishers p
        WHERE p.name LIKE ?
        ORDER BY p.name
      `;
      return this.queryAll(query, [`%${keyword}%`]);
    } catch (error) {
      console.error('❌ 搜索出版社失败:', error.message);
      throw error;
    }
  }
}

export default PublisherRepository;
