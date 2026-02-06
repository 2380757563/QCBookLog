/**
 * Calibre 作者仓储
 * 处理作者相关的数据库操作
 */

import BaseRepository from '../base-repository.js';

/**
 * Calibre 作者仓储类
 */
class AuthorRepository extends BaseRepository {
  /**
   * 查找所有作者
   */
  findAll() {
    try {
      const query = `
        SELECT
          a.id,
          a.name,
          (SELECT COUNT(*) FROM books_authors_link bal WHERE bal.author = a.id) as book_count
        FROM authors a
        ORDER BY a.sort
      `;
      return this.queryAll(query);
    } catch (error) {
      console.error('❌ 获取作者列表失败:', error.message);
      throw error;
    }
  }

  /**
   * 根据ID查找作者
   */
  findById(id) {
    try {
      const query = `
        SELECT
          a.*,
          (SELECT COUNT(*) FROM books_authors_link bal WHERE bal.author = a.id) as book_count
        FROM authors a
        WHERE a.id = ?
      `;
      return this.queryOne(query, [id]);
    } catch (error) {
      console.error(`❌ 查找作者 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 根据名称查找作者
   */
  findByName(name) {
    try {
      const query = 'SELECT * FROM authors WHERE name = ?';
      return this.queryOne(query, [name]);
    } catch (error) {
      console.error(`❌ 查找作者 name=${name} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 创建作者
   */
  create(name, sort = null) {
    try {
      const sortValue = sort || name;
      const id = this.insert('authors', { name, sort: sortValue });
      return this.findById(id);
    } catch (error) {
      console.error('❌ 创建作者失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新作者
   */
  update(id, data) {
    try {
      const updates = [];
      const values = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.sort !== undefined) {
        updates.push('sort = ?');
        values.push(data.sort);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const sql = `UPDATE authors SET ${updates.join(', ')} WHERE id = ?`;
      this.execute(sql, values);

      return this.findById(id);
    } catch (error) {
      console.error(`❌ 更新作者 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 删除作者
   */
  delete(id) {
    try {
      // 先删除书籍关联
      this.execute('DELETE FROM books_authors_link WHERE author = ?', [id]);
      // 删除作者
      const result = this.execute('DELETE FROM authors WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除作者 ID=${id} 失败:`, error.message);
      throw error;
    }
  }

  /**
   * 搜索作者
   */
  search(keyword) {
    try {
      const query = `
        SELECT
          a.id,
          a.name,
          (SELECT COUNT(*) FROM books_authors_link bal WHERE bal.author = a.id) as book_count
        FROM authors a
        WHERE a.name LIKE ?
        ORDER BY a.sort
      `;
      return this.queryAll(query, [`%${keyword}%`]);
    } catch (error) {
      console.error('❌ 搜索作者失败:', error.message);
      throw error;
    }
  }
}

export default AuthorRepository;
