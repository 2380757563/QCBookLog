/**
 * 阅读状态同步服务
 * 实现 QCBookLog 和 Talebook 数据库之间的阅读状态双向同步
 */

import databaseService from './database/index.js';

/**
 * 同步状态枚举
 */
const SyncStatus = {
  NOT_SYNCED: 0,      // 未同步
  SYNCED: 1,          // 已同步
  SYNCING: 2,         // 同步中
  SYNC_FAILED: 3        // 同步失败
};

/**
 * 冲突解决策略
 */
const ConflictResolution = {
  LATEST_WINS: 'latest',      // 最新更新优先
  TALEBOOK_WINS: 'talebook',  // Talebook 优先
  QCBOOKLOG_WINS: 'qcbooklog'  // QCBookLog 优先
};

/**
 * 阅读状态同步服务类
 */
class ReadingStateSyncService {
  constructor() {
    this.syncInProgress = new Map(); // 正在同步的书籍ID集合
    this.lastSyncTime = null; // 最后同步时间
  }

  /**
   * 获取 QCBookLog 数据库实例
   */
  getQcBooklogDb() {
    return databaseService.getQcBooklogDb();
  }

  /**
   * 获取 Talebook 数据库实例
   */
  getTalebookDb() {
    return databaseService.connectionManager.getTalebookDb();
  }

  /**
   * 检查 Talebook 数据库是否可用
   */
  isTalebookAvailable() {
    return databaseService.isTalebookAvailable();
  }

  /**
   * 检查 QCBookLog 数据库是否可用
   */
  isQcBooklogAvailable() {
    return databaseService.isQcBooklogAvailable();
  }

  /**
   * 从 QCBookLog 获取阅读状态
   */
  getQcReadingState(bookId, readerId = 0) {
    if (!this.isQcBooklogAvailable()) {
      return null;
    }

    try {
      const db = this.getQcBooklogDb();
      const result = db.prepare(`
        SELECT * FROM qc_reading_state
        WHERE book_id = ? AND reader_id = ?
      `).get(bookId, readerId);
      return result || null;
    } catch (error) {
      console.error(`❌ 从 QCBookLog 获取阅读状态失败:`, error.message);
      return null;
    }
  }

  /**
   * 从 Talebook 获取阅读状态
   */
  getTalebookReadingState(bookId, readerId = 0) {
    if (!this.isTalebookAvailable()) {
      return null;
    }

    try {
      const db = this.getTalebookDb();
      const result = db.prepare(`
        SELECT * FROM reading_state
        WHERE book_id = ? AND reader_id = ?
      `).get(bookId, readerId);
      return result || null;
    } catch (error) {
      console.error(`❌ 从 Talebook 获取阅读状态失败:`, error.message);
      return null;
    }
  }

  /**
   * 更新 QCBookLog 阅读状态
   */
  updateQcReadingState(bookId, readerId, readingState) {
    if (!this.isQcBooklogAvailable()) {
      throw new Error('QCBookLog 数据库不可用');
    }

    const db = this.getQcBooklogDb();

    try {
      // 计算进度百分比
      let progressPercent = 0;
      if (readingState.total_pages && readingState.total_pages > 0) {
        progressPercent = Math.round((readingState.current_page / readingState.total_pages) * 100);
      }

      // 检查记录是否存在
      const existing = this.getQcReadingState(bookId, readerId);

      if (existing) {
        // 更新现有记录
        db.prepare(`
          UPDATE qc_reading_state SET
            read_state = ?,
            current_page = ?,
            total_pages = ?,
            progress_percent = ?,
            favorite = ?,
            favorite_date = ?,
            wants = ?,
            wants_date = ?,
            read_date = ?,
            start_date = ?,
            last_read_time = ?,
            total_reading_time = ?,
            read_count = ?,
            online_read = ?,
            download = ?,
            current_chapter = ?,
            notes = ?,
            rating = ?,
            sync_status = ?,
            last_sync_time = ?,
            sync_error = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE book_id = ? AND reader_id = ?
        `).run(
          readingState.read_state,
          readingState.current_page || existing.current_page,
          readingState.total_pages || existing.total_pages,
          progressPercent,
          readingState.favorite !== undefined ? readingState.favorite : existing.favorite,
          readingState.favorite_date || existing.favorite_date,
          readingState.wants !== undefined ? readingState.wants : existing.wants,
          readingState.wants_date || existing.wants_date,
          readingState.read_date || existing.read_date,
          readingState.start_date || existing.start_date,
          readingState.last_read_time || new Date().toISOString(),
          readingState.total_reading_time !== undefined ? readingState.total_reading_time : existing.total_reading_time,
          readingState.read_count !== undefined ? readingState.read_count : existing.read_count,
          readingState.online_read !== undefined ? readingState.online_read : existing.online_read,
          readingState.download !== undefined ? readingState.download : existing.download,
          readingState.current_chapter !== undefined ? readingState.current_chapter : existing.current_chapter,
          readingState.notes !== undefined ? readingState.notes : existing.notes,
          readingState.rating !== undefined ? readingState.rating : existing.rating,
          SyncStatus.SYNCED,
          new Date().toISOString(),
          bookId,
          readerId
        );
      } else {
        // 创建新记录
        db.prepare(`
          INSERT INTO qc_reading_state (
            book_id, reader_id, read_state, current_page, total_pages,
            progress_percent, favorite, favorite_date, wants, wants_date,
            read_date, start_date, last_read_time, total_reading_time,
            read_count, online_read, download, current_chapter, notes, rating,
            sync_status, last_sync_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          bookId,
          readerId,
          readingState.read_state,
          readingState.current_page || 0,
          readingState.total_pages || 0,
          progressPercent,
          readingState.favorite !== undefined ? readingState.favorite : 0,
          readingState.favorite_date || null,
          readingState.wants !== undefined ? readingState.wants : 0,
          readingState.wants_date || null,
          readingState.read_date || null,
          readingState.start_date || null,
          new Date().toISOString(),
          readingState.total_reading_time || 0,
          readingState.read_count || 0,
          readingState.online_read || 0,
          readingState.download || 0,
          readingState.current_chapter || 0,
          readingState.notes || null,
          readingState.rating || 0,
          SyncStatus.SYNCED,
          new Date().toISOString()
        );
      }

      console.log(`✅ QCBookLog 阅读状态已更新: 书籍 ${bookId}, 读者 ${readerId}`);
      return true;
    } catch (error) {
      console.error(`❌ 更新 QCBookLog 阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 更新 Talebook 阅读状态
   */
  updateTalebookReadingState(bookId, readerId, readingState) {
    if (!this.isTalebookAvailable()) {
      throw new Error('Talebook 数据库不可用');
    }

    const db = this.getTalebookDb();

    try {
      // 检查记录是否存在
      const existing = this.getTalebookReadingState(bookId, readerId);

      if (existing) {
        // 更新现有记录
        const updates = [];
        const values = [];

        if (readingState.read_state !== undefined) {
          updates.push('read_state = ?');
          values.push(readingState.read_state);
        }
        if (readingState.favorite !== undefined) {
          updates.push('favorite = ?');
          values.push(readingState.favorite);
          if (readingState.favorite === 1 && (!existing.favorite_date || existing.favorite === 0)) {
            updates.push('favorite_date = ?');
            values.push(new Date().toISOString());
          }
        }
        if (readingState.wants !== undefined) {
          updates.push('wants = ?');
          values.push(readingState.wants);
          if (readingState.wants === 1 && (!existing.wants_date || existing.wants === 0)) {
            updates.push('wants_date = ?');
            values.push(new Date().toISOString());
          }
        }
        if (readingState.read_state === 1 && !existing.read_date) {
          updates.push('read_date = ?');
          values.push(new Date().toISOString());
        }
        if (readingState.online_read !== undefined) {
          updates.push('online_read = ?');
          values.push(readingState.online_read);
        }
        if (readingState.download !== undefined) {
          updates.push('download = ?');
          values.push(readingState.download);
        }

        if (updates.length > 0) {
          values.push(bookId, readerId);
          const sql = `UPDATE reading_state SET ${updates.join(', ')} WHERE book_id = ? AND reader_id = ?`;
          db.prepare(sql).run(...values);
        }
      } else {
        // 创建新记录
        db.prepare(`
          INSERT INTO reading_state (
            book_id, reader_id, favorite, wants, read_state,
            online_read, download, favorite_date, wants_date, read_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          bookId,
          readerId,
          readingState.favorite !== undefined ? readingState.favorite : 0,
          readingState.wants !== undefined ? readingState.wants : 0,
          readingState.read_state,
          readingState.online_read || 0,
          readingState.download || 0,
          readingState.favorite === 1 ? new Date().toISOString() : null,
          readingState.wants === 1 ? new Date().toISOString() : null,
          readingState.read_state === 1 ? new Date().toISOString() : null
        );
      }

      console.log(`✅ Talebook 阅读状态已更新: 书籍 ${bookId}, 读者 ${readerId}`);
      return true;
    } catch (error) {
      console.error(`❌ 更新 Talebook 阅读状态失败:`, error.message);
      throw error;
    }
  }

  /**
   * 同步阅读状态到 Talebook（QCBookLog -> Talebook）
   */
  async syncToTalebook(bookId, readerId = 0) {
    if (!this.isTalebookAvailable()) {
      console.warn('⚠️ Talebook 数据库不可用，跳过同步到 Talebook');
      return false;
    }

    // 检查是否正在同步
    const syncKey = `${bookId}-${readerId}`;
    if (this.syncInProgress.has(syncKey)) {
      console.warn(`⚠️ 书籍 ${bookId} 读者 ${readerId} 正在同步中，跳过`);
      return false;
    }

    this.syncInProgress.set(syncKey, true);

    try {
      // 从 QCBookLog 获取阅读状态
      const qcState = this.getQcReadingState(bookId, readerId);
      if (!qcState) {
        console.warn(`⚠️ QCBookLog 中没有书籍 ${bookId} 读者 ${readerId} 的阅读状态，跳过同步`);
        return false;
      }

      // 转换为 Talebook 格式
      const talebookState = {
        read_state: qcState.read_state,
        favorite: qcState.favorite,
        wants: qcState.wants,
        online_read: qcState.online_read,
        download: qcState.download
      };

      // 更新到 Talebook
      await this.updateTalebookReadingState(bookId, readerId, talebookState);

      // 更新 QCBookLog 同步状态
      const db = this.getQcBooklogDb();
      db.prepare(`
        UPDATE qc_reading_state SET
          sync_status = ?,
          last_sync_time = ?,
          sync_error = NULL
        WHERE book_id = ? AND reader_id = ?
      `).run(SyncStatus.SYNCED, new Date().toISOString(), bookId, readerId);

      console.log(`✅ 阅读状态已同步到 Talebook: 书籍 ${bookId}, 读者 ${readerId}`);
      return true;
    } catch (error) {
      // 记录同步失败
      const db = this.getQcBooklogDb();
      db.prepare(`
        UPDATE qc_reading_state SET
          sync_status = ?,
          last_sync_time = ?,
          sync_error = ?
        WHERE book_id = ? AND reader_id = ?
      `).run(SyncStatus.SYNC_FAILED, new Date().toISOString(), error.message, bookId, readerId);

      console.error(`❌ 同步到 Talebook 失败: 书籍 ${bookId}, 读者 ${readerId}`, error.message);
      return false;
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * 同步阅读状态到 QCBookLog（Talebook -> QCBookLog）
   */
  async syncToQcBooklog(bookId, readerId = 0) {
    if (!this.isQcBooklogAvailable()) {
      console.warn('⚠️ QCBookLog 数据库不可用，跳过同步到 QCBookLog');
      return false;
    }

    // 检查是否正在同步
    const syncKey = `${bookId}-${readerId}`;
    if (this.syncInProgress.has(syncKey)) {
      console.warn(`⚠️ 书籍 ${bookId} 读者 ${readerId} 正在同步中，跳过`);
      return false;
    }

    this.syncInProgress.set(syncKey, true);

    try {
      // 从 Talebook 获取阅读状态
      const talebookState = this.getTalebookReadingState(bookId, readerId);
      if (!talebookState) {
        console.warn(`⚠️ Talebook 中没有书籍 ${bookId} 读者 ${readerId} 的阅读状态，跳过同步`);
        return false;
      }

      // 转换为 QCBookLog 格式
      const qcState = {
        read_state: talebookState.read_state,
        favorite: talebookState.favorite,
        wants: talebookState.wants,
        online_read: talebookState.online_read,
        download: talebookState.download,
        last_read_time: new Date().toISOString()
      };

      // 更新到 QCBookLog
      await this.updateQcReadingState(bookId, readerId, qcState);

      // 更新同步状态
      const db = this.getQcBooklogDb();
      db.prepare(`
        UPDATE qc_reading_state SET
          sync_status = ?,
          last_sync_time = ?,
          sync_error = NULL
        WHERE book_id = ? AND reader_id = ?
      `).run(SyncStatus.SYNCED, new Date().toISOString(), bookId, readerId);

      console.log(`✅ 阅读状态已同步到 QCBookLog: 书籍 ${bookId}, 读者 ${readerId}`);
      return true;
    } catch (error) {
      // 记录同步失败
      const db = this.getQcBooklogDb();
      db.prepare(`
        UPDATE qc_reading_state SET
          sync_status = ?,
          last_sync_time = ?,
          sync_error = ?
        WHERE book_id = ? AND reader_id = ?
      `).run(SyncStatus.SYNC_FAILED, new Date().toISOString(), error.message, bookId, readerId);

      console.error(`❌ 同步到 QCBookLog 失败: 书籍 ${bookId}, 读者 ${readerId}`, error.message);
      return false;
    } finally {
      this.syncInProgress.delete(syncKey);
    }
  }

  /**
   * 双向同步阅读状态
   * 冲突解决策略：最新更新优先
   */
  async syncReadingState(bookId, readerId = 0, conflictResolution = ConflictResolution.LATEST_WINS) {
    try {
      // 获取两边的阅读状态
      const qcState = this.getQcReadingState(bookId, readerId);
      const talebookState = this.getTalebookReadingState(bookId, readerId);

      // 如果两边都没有数据，跳过
      if (!qcState && !talebookState) {
        console.log(`ℹ️ 书籍 ${bookId} 读者 ${readerId} 两边都没有阅读状态，跳过同步`);
        return { success: true, message: '两边都没有数据，无需同步' };
      }

      // 如果只有 QCBookLog 有数据，同步到 Talebook
      if (qcState && !talebookState) {
        console.log(`📤 QCBookLog 有数据，同步到 Talebook: 书籍 ${bookId}`);
        return await this.syncToTalebook(bookId, readerId);
      }

      // 如果只有 Talebook 有数据，同步到 QCBookLog
      if (!qcState && talebookState) {
        console.log(`📥 Talebook 有数据，同步到 QCBookLog: 书籍 ${bookId}`);
        return await this.syncToQcBooklog(bookId, readerId);
      }

      // 如果两边都有数据，根据冲突解决策略处理
      if (qcState && talebookState) {
        console.log(`⚠️ 书籍 ${bookId} 读者 ${readerId} 两边都有数据，需要解决冲突`);

        // 比较更新时间
        const qcUpdateTime = new Date(qcState.updated_at || qcState.last_sync_time);
        const talebookUpdateTime = new Date(talebookState.read_date || talebookState.favorite_date || talebookState.wants_date || '2000-01-01');

        let sourceState, targetDb;

        switch (conflictResolution) {
          case ConflictResolution.LATEST_WINS:
            // 最新更新优先
            if (qcUpdateTime > talebookUpdateTime) {
              sourceState = qcState;
              targetDb = 'Talebook';
            } else {
              sourceState = talebookState;
              targetDb = 'QCBookLog';
            }
            break;

          case ConflictResolution.TALEBOOK_WINS:
            // Talebook 优先
            sourceState = talebookState;
            targetDb = 'QCBookLog';
            break;

          case ConflictResolution.QCBOOKLOG_WINS:
            // QCBookLog 优先
            sourceState = qcState;
            targetDb = 'Talebook';
            break;

          default:
            throw new Error(`未知的冲突解决策略: ${conflictResolution}`);
        }

        console.log(`🔄 使用 ${sourceState === qcState ? 'QCBookLog' : 'Talebook'} 的数据同步到 ${targetDb}`);

        // 执行同步
        if (targetDb === 'Talebook') {
          const talebookStateData = {
            read_state: sourceState.read_state,
            favorite: sourceState.favorite,
            wants: sourceState.wants,
            online_read: sourceState.online_read,
            download: sourceState.download
          };
          await this.updateTalebookReadingState(bookId, readerId, talebookStateData);
        } else {
          const qcStateData = {
            read_state: sourceState.read_state,
            favorite: sourceState.favorite,
            wants: sourceState.wants,
            online_read: sourceState.online_read,
            download: sourceState.download,
            last_read_time: new Date().toISOString()
          };
          await this.updateQcReadingState(bookId, readerId, qcStateData);
        }

        return { success: true, message: `冲突已解决，使用 ${sourceState === qcState ? 'QCBookLog' : 'Talebook'} 的数据` };
      }
    } catch (error) {
      console.error(`❌ 双向同步失败: 书籍 ${bookId}, 读者 ${readerId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量同步所有阅读状态
   */
  async syncAllReadingStates(readerId = 0) {
    if (!this.isQcBooklogAvailable()) {
      console.warn('⚠️ QCBookLog 数据库不可用，跳过批量同步');
      return { success: false, message: 'QCBookLog 数据库不可用' };
    }

    try {
      const db = this.getQcBooklogDb();
      const allStates = db.prepare(`
        SELECT book_id, reader_id, updated_at FROM qc_reading_state
        WHERE reader_id = ?
        ORDER BY updated_at DESC
      `).all(readerId);

      console.log(`📚 开始批量同步 ${allStates.length} 条阅读状态...`);

      let successCount = 0;
      let failCount = 0;

      for (const state of allStates) {
        const result = await this.syncToTalebook(state.book_id, state.reader_id);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }

        // 避免过快，添加小延迟
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log(`✅ 批量同步完成: 成功 ${successCount} 条，失败 ${failCount} 条`);
      return {
        success: true,
        message: `批量同步完成: 成功 ${successCount} 条，失败 ${failCount} 条`,
        successCount,
        failCount
      };
    } catch (error) {
      console.error(`❌ 批量同步失败:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 同步缺失的阅读状态到 Talebook
   * 只同步 QCBookLog 有但 Talebook 没有的记录
   */
  async syncMissingToTalebook(readerId = 0) {
    if (!this.isQcBooklogAvailable()) {
      console.warn('⚠️ QCBookLog 数据库不可用，跳过同步');
      return { success: false, message: 'QCBookLog 数据库不可用' };
    }

    if (!this.isTalebookAvailable()) {
      console.warn('⚠️ Talebook 数据库不可用，跳过同步');
      return { success: false, message: 'Talebook 数据库不可用' };
    }

    try {
      const qcDb = this.getQcBooklogDb();
      const talebookDb = this.getTalebookDb();

      const qcStates = qcDb.prepare(`
        SELECT book_id, reader_id, read_state, favorite, wants, online_read, download
        FROM qc_reading_state
        WHERE reader_id = ?
      `).all(readerId);

      console.log(`📚 检查 ${qcStates.length} 条 QCBookLog 阅读状态...`);

      let syncCount = 0;
      let skipCount = 0;

      for (const qcState of qcStates) {
        const talebookState = talebookDb.prepare(`
          SELECT * FROM reading_state WHERE book_id = ? AND reader_id = ?
        `).get(qcState.book_id, qcState.reader_id);

        if (!talebookState) {
          console.log(`⚠️ 书籍 ${qcState.book_id} 在 Talebook 中缺失，正在补充...`);
          
          talebookDb.prepare(`
            INSERT INTO reading_state (book_id, reader_id, favorite, wants, read_state, online_read, download)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            qcState.book_id,
            qcState.reader_id,
            qcState.favorite || 0,
            qcState.wants || 0,
            qcState.read_state || 0,
            qcState.online_read || 0,
            qcState.download || 0
          );
          
          syncCount++;
        } else {
          skipCount++;
        }
      }

      console.log(`✅ 同步缺失记录完成: 补充 ${syncCount} 条，跳过 ${skipCount} 条（已存在）`);
      return {
        success: true,
        message: `同步完成: 补充 ${syncCount} 条缺失记录，跳过 ${skipCount} 条已存在记录`,
        syncCount,
        skipCount
      };
    } catch (error) {
      console.error(`❌ 同步缺失记录失败:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取同步失败的记录
   */
  getFailedSyncs(limit = 100) {
    if (!this.isQcBooklogAvailable()) {
      return [];
    }

    try {
      const db = this.getQcBooklogDb();
      const failedSyncs = db.prepare(`
        SELECT * FROM qc_reading_state
        WHERE sync_status = ?
        ORDER BY last_sync_time DESC
        LIMIT ?
      `).all(SyncStatus.SYNC_FAILED, limit);

      return failedSyncs;
    } catch (error) {
      console.error(`❌ 获取同步失败记录失败:`, error.message);
      return [];
    }
  }

  /**
   * 重试失败的同步
   */
  async retryFailedSyncs(limit = 10) {
    const failedSyncs = this.getFailedSyncs(limit);

    if (failedSyncs.length === 0) {
      console.log('ℹ️ 没有需要重试的同步记录');
      return { success: true, message: '没有需要重试的同步记录' };
    }

    console.log(`🔄 开始重试 ${failedSyncs.length} 条失败的同步记录...`);

    let successCount = 0;
    let failCount = 0;

    for (const sync of failedSyncs) {
      const result = await this.syncToTalebook(sync.book_id, sync.reader_id);
      if (result) {
        successCount++;
      } else {
        failCount++;
      }

      // 避免过快，添加小延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ 重试完成: 成功 ${successCount} 条，失败 ${failCount} 条`);
    return {
      success: true,
      message: `重试完成: 成功 ${successCount} 条，失败 ${failCount} 条`,
      successCount,
      failCount
    };
  }

  /**
   * 清理旧的同步错误
   */
  cleanupOldSyncErrors(daysOld = 30) {
    if (!this.isQcBooklogAvailable()) {
      return;
    }

    try {
      const db = this.getQcBooklogDb();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = db.prepare(`
        DELETE FROM qc_reading_state
        WHERE sync_status = ? AND last_sync_time < ?
      `).run(SyncStatus.SYNC_FAILED, cutoffDate.toISOString());

      console.log(`🧹 已清理 ${result.changes} 条旧的同步错误记录`);
      return result.changes;
    } catch (error) {
      console.error(`❌ 清理旧同步错误失败:`, error.message);
      return 0;
    }
  }

  /**
   * 获取同步统计信息
   */
  getSyncStats() {
    if (!this.isQcBooklogAvailable()) {
      return null;
    }

    try {
      const db = this.getQcBooklogDb();

      const totalResult = db.prepare('SELECT COUNT(*) as count FROM qc_reading_state').get();
      const syncedResult = db.prepare('SELECT COUNT(*) as count FROM qc_reading_state WHERE sync_status = ?').get(SyncStatus.SYNCED);
      const failedResult = db.prepare('SELECT COUNT(*) as count FROM qc_reading_state WHERE sync_status = ?').get(SyncStatus.SYNC_FAILED);
      const syncingResult = db.prepare('SELECT COUNT(*) as count FROM qc_reading_state WHERE sync_status = ?').get(SyncStatus.SYNCING);

      return {
        total: totalResult.count,
        synced: syncedResult.count,
        failed: failedResult.count,
        syncing: syncingResult.count,
        notSynced: totalResult.count - syncedResult.count - failedResult.count - syncingResult.count,
        lastSyncTime: this.lastSyncTime
      };
    } catch (error) {
      console.error(`❌ 获取同步统计失败:`, error.message);
      return null;
    }
  }
}

export default new ReadingStateSyncService();