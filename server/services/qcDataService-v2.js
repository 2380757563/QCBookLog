/**
 * qcDataService v2（重构版本）
 * 使用新的仓储系统，职责更清晰
 */

import databaseService from './database/index.js';

/**
 * 分组仓储（使用新的仓储系统）
 */
const GroupsRepository = {
  create(groupData) {
    const db = databaseService.talebookDb;
    if (!db) throw new Error('Talebook 数据库不可用');

    const query = `
      INSERT INTO qc_groups (name, description, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    const result = db.prepare(query).run(
      groupData.name,
      groupData.description || ''
    );
    
    return {
      id: result.lastInsertRowid,
      ...groupData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  findAll() {
    const db = databaseService.talebookDb;
    if (!db) return [];

    const query = 'SELECT * FROM qc_groups ORDER BY name';
    return db.prepare(query).all();
  },

  findById(groupId) {
    const db = databaseService.talebookDb;
    if (!db) return null;

    const query = 'SELECT * FROM qc_groups WHERE id = ?';
    return db.prepare(query).get(groupId);
  },

  update(groupId, groupData) {
    const db = databaseService.talebookDb;
    if (!db) return null;

    const query = `
      UPDATE qc_groups
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = db.prepare(query).run(
      groupData.name,
      groupData.description || '',
      groupId
    );
    
    if (result.changes === 0) return null;
    
    return {
      id: groupId,
      ...groupData,
      updated_at: new Date().toISOString()
    };
  },

  delete(groupId) {
    const db = databaseService.talebookDb;
    if (!db) return false;

    try {
      // 先删除分组与书籍的关联
      db.prepare('DELETE FROM qc_book_groups WHERE group_id = ?').run(groupId);
      // 再删除分组
      const result = db.prepare('DELETE FROM qc_groups WHERE id = ?').run(groupId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 删除分组ID ${groupId} 失败:`, error.message);
      return false;
    }
  },

  addBook(bookId, groupId) {
    const db = databaseService.talebookDb;
    if (!db) return false;

    try {
      const query = `
        INSERT OR IGNORE INTO qc_book_groups (book_id, group_id)
        VALUES (?, ?)
      `;
      const result = db.prepare(query).run(bookId, groupId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 添加书籍ID ${bookId} 到分组ID ${groupId} 失败:`, error.message);
      return false;
    }
  },

  removeBook(bookId, groupId) {
    const db = databaseService.talebookDb;
    if (!db) return false;

    try {
      const query = `
        DELETE FROM qc_book_groups 
        WHERE book_id = ? AND group_id = ?
      `;
      const result = db.prepare(query).run(bookId, groupId);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ 从分组ID ${groupId} 移除书籍ID ${bookId} 失败:`, error.message);
      return false;
    }
  }
};

/**
 * 书摘仓储（使用新的仓储系统）
 */
const BookmarksRepository = {
  findAll(options = {}) {
    return databaseService.repositories.talebook.qcBookmarks.findAll(options);
  },

  findById(id) {
    return databaseService.repositories.talebook.qcBookmarks.findById(id);
  },

  findByBookId(bookId) {
    return databaseService.repositories.talebook.qcBookmarks.findByBookId(bookId);
  },

  create(data) {
    return databaseService.repositories.talebook.qcBookmarks.create(data);
  },

  update(id, data) {
    return databaseService.repositories.talebook.qcBookmarks.update(id, data);
  },

  delete(id) {
    return databaseService.repositories.talebook.qcBookmarks.delete(id);
  },

  search(keyword) {
    return databaseService.repositories.talebook.qcBookmarks.search(keyword);
  },

  getAllTags() {
    return databaseService.repositories.talebook.qcBookmarks.getAllTags();
  }
};

/**
 * 阅读状态仓储（使用新的仓储系统）
 */
const ReadingStateRepository = {
  get(bookId, readerId = 0) {
    return databaseService.repositories.talebook.readingState.find(bookId, readerId);
  },

  setFavorite(bookId, favorite, readerId = 0) {
    return databaseService.repositories.talebook.readingState.setFavorite(bookId, favorite, readerId);
  },

  setWants(bookId, wants, readerId = 0) {
    return databaseService.repositories.talebook.readingState.setWants(bookId, wants, readerId);
  },

  setReadState(bookId, readState, readerId = 0) {
    return databaseService.repositories.talebook.readingState.setReadState(bookId, readState, readerId);
  },

  getFavorites(readerId = 0) {
    return databaseService.repositories.talebook.readingState.getFavorites(readerId);
  },

  getWants(readerId = 0) {
    return databaseService.repositories.talebook.readingState.getWants(readerId);
  },

  getRead(readerId = 0) {
    return databaseService.repositories.talebook.readingState.getRead(readerId);
  }
};

/**
 * 书籍扩展数据仓储（使用新的仓储系统）
 */
const BookDataRepository = {
  findByBookId(bookId) {
    return databaseService.repositories.talebook.qcBookdata.findByBookId(bookId);
  },

  upsert(bookId, data) {
    return databaseService.repositories.talebook.qcBookdata.upsert(bookId, data);
  },

  updateReadingProgress(bookId, readPages, duration = 0) {
    return databaseService.repositories.talebook.qcBookdata.updateReadingProgress(bookId, readPages, duration);
  },

  getReadingStats() {
    return databaseService.repositories.talebook.qcBookdata.getReadingStats();
  },

  getRecentlyRead(limit = 10) {
    return databaseService.repositories.talebook.qcBookdata.getRecentlyRead(limit);
  }
};

/**
 * qcDataService v2
 * 提供与旧版本相同的接口，但使用新的仓储系统
 */
class QcDataServiceV2 {
  constructor() {
    console.log('🔄 qcDataService v2 初始化，使用新的仓储系统');
    this.updateConnection();
  }

  /**
   * 检查 Talebook 数据库是否可用
   */
  isAvailable() {
    return databaseService.isTalebookAvailable();
  }

  /**
   * 更新数据库连接（已废弃，保留向后兼容）
   */
  updateConnection() {
    // 新版本不缓存连接，每次使用时从 databaseService 获取
    console.log('🔄 qcDataService v2 不再缓存数据库连接');
  }

  // ==================== 分组管理 ====================

  createGroup(groupData) {
    return GroupsRepository.create(groupData);
  }

  getAllGroups() {
    return GroupsRepository.findAll();
  }

  getGroupById(groupId) {
    return GroupsRepository.findById(groupId);
  }

  updateGroup(groupId, groupData) {
    return GroupsRepository.update(groupId, groupData);
  }

  deleteGroup(groupId) {
    return GroupsRepository.delete(groupId);
  }

  addBookToGroup(bookId, groupId) {
    return GroupsRepository.addBook(bookId, groupId);
  }

  removeBookFromGroup(bookId, groupId) {
    return GroupsRepository.removeBook(bookId, groupId);
  }

  // ==================== 书摘管理 ====================

  createBookmark(bookmarkData) {
    return BookmarksRepository.create(bookmarkData);
  }

  getAllBookmarks(options = {}) {
    return BookmarksRepository.findAll(options);
  }

  getBookmarkById(id) {
    return BookmarksRepository.findById(id);
  }

  getBookmarksByBookId(bookId) {
    return BookmarksRepository.findByBookId(bookId);
  }

  updateBookmark(id, data) {
    return BookmarksRepository.update(id, data);
  }

  deleteBookmark(id) {
    return BookmarksRepository.delete(id);
  }

  searchBookmarks(keyword) {
    return BookmarksRepository.search(keyword);
  }

  getAllBookmarkTags() {
    return BookmarksRepository.getAllTags();
  }

  // ==================== 阅读状态管理 ====================

  getReadingState(bookId, readerId = 0) {
    return ReadingStateRepository.get(bookId, readerId);
  }

  setFavorite(bookId, favorite, readerId = 0) {
    return ReadingStateRepository.setFavorite(bookId, favorite, readerId);
  }

  setWants(bookId, wants, readerId = 0) {
    return ReadingStateRepository.setWants(bookId, wants, readerId);
  }

  setReadState(bookId, readState, readerId = 0) {
    return ReadingStateRepository.setReadState(bookId, readState, readerId);
  }

  getFavorites(readerId = 0) {
    return ReadingStateRepository.getFavorites(readerId);
  }

  getWants(readerId = 0) {
    return ReadingStateRepository.getWants(readerId);
  }

  getRead(readerId = 0) {
    return ReadingStateRepository.getRead(readerId);
  }

  // ==================== 书籍扩展数据管理 ====================

  getBookData(bookId) {
    return BookDataRepository.findByBookId(bookId);
  }

  updateBookData(bookId, data) {
    return BookDataRepository.upsert(bookId, data);
  }

  updateReadingProgress(bookId, readPages, duration = 0) {
    return BookDataRepository.updateReadingProgress(bookId, readPages, duration);
  }

  getReadingStats() {
    return BookDataRepository.getReadingStats();
  }

  getRecentlyReadBooks(limit = 10) {
    return BookDataRepository.getRecentlyRead(limit);
  }
}

export default new QcDataServiceV2();
