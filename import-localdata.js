/**
 * LocalStorage 数据导入工具
 * 从 JSON 文件导入数据到数据库
 */

import fs from 'fs/promises';
import path from 'path';
import databaseService from '../services/databaseService.js';

class LocalDataImporter {
  constructor() {
    this.dataDir = path.join(process.cwd(), '../data');
  }

  /**
   * 读取 JSON 文件
   */
  async readJsonFile(filePath) {
    try {
      const fullPath = path.join(this.dataDir, filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ 读取 JSON 文件 ${filePath} 失败:`, error.message);
      return null;
    }
  }

  /**
   * 导入阅读目标
   */
  async importReadingGoal(goalData) {
    if (!goalData) {
      console.log('⚠️ 没有阅读目标数据，跳过');
      return { success: false, message: '没有数据' };
    }

    try {
      const db = databaseService.talebookDb;
      const year = goalData.year || new Date().getFullYear();
      const target = goalData.target || 12;
      const completed = goalData.completed || 0;

      console.log(`📊 导入阅读目标: ${year}年, 目标${target}本, 已完成${completed}本`);

      // 检查是否已存在
      const existing = db.prepare(`
        SELECT id FROM reading_goals
        WHERE reader_id = 0 AND year = ?
      `).get(year);

      if (existing) {
        // 更新现有目标
        db.prepare(`
          UPDATE reading_goals
          SET target = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(target, completed, existing.id);
        console.log('✅ 阅读目标已更新');
      } else {
        // 插入新目标
        db.prepare(`
          INSERT INTO reading_goals (reader_id, year, target, completed)
          VALUES (0, ?, ?, ?)
        `).run(year, target, completed);
        console.log('✅ 阅读目标已插入');
      }

      return { success: true, year, target, completed };
    } catch (error) {
      console.error('❌ 导入阅读目标失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 导入热力图数据
   */
  async importHeatmapData(heatmapData) {
    if (!heatmapData) {
      console.log('⚠️ 没有热力图数据，跳过');
      return { success: false, message: '没有数据' };
    }

    try {
      const db = databaseService.talebookDb;
      let totalDays = 0;

      // 遍历每一年的热力图数据
      for (const [year, dataset] of Object.entries(heatmapData)) {
        const yearNum = parseInt(year);
        if (isNaN(yearNum)) continue;

        console.log(`📊 导入 ${yearNum}年热力图数据`);

        // 遍历每一天的数据
        if (dataset.data && Array.isArray(dataset.data)) {
          for (const day of dataset.data) {
            if (day.date && day.count > 0) {
              // 检查是否已存在
              const existing = db.prepare(`
                SELECT id FROM reading_heatmap
                WHERE reader_id = 0 AND date = ?
              `).get(day.date);

              if (existing) {
                // 更新现有数据
                db.prepare(`
                  UPDATE reading_heatmap
                  SET bookmark_count = ?
                  WHERE id = ?
                `).run(day.count, existing.id);
              } else {
                // 插入新数据
                db.prepare(`
                  INSERT INTO reading_heatmap (reader_id, date, bookmark_count)
                  VALUES (0, ?, ?)
                `).run(day.date, day.count);
              }
              totalDays++;
            }
          }
        }
      }

      console.log(`✅ 热力图数据导入完成，共导入 ${totalDays} 天的数据`);
      return { success: true, totalDays };
    } catch (error) {
      console.error('❌ 导入热力图数据失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 导入愿望清单
   */
  async importWishlist(wishlistData) {
    if (!wishlistData || !Array.isArray(wishlistData)) {
      console.log('⚠️ 没有愿望清单数据，跳过');
      return { success: false, message: '没有数据' };
    }

    try {
      const db = databaseService.talebookDb;
      let totalCount = 0;
      let successCount = 0;
      let skippedCount = 0;

      for (const item of wishlistData) {
        totalCount++;

        // 兼容旧格式，将 id 转换为 isbn
        const isbn = item.isbn || item.id;
        if (!isbn) {
          console.warn(`⚠️ 愿望清单项缺少ISBN，跳过:`, item);
          skippedCount++;
          continue;
        }

        try {
          // 检查是否已存在
          const existing = db.prepare(`
            SELECT id FROM wishlist
            WHERE reader_id = 0 AND isbn = ?
          `).get(isbn);

          if (existing) {
            // 更新现有数据
            db.prepare(`
              UPDATE wishlist
              SET title = ?, author = ?, notes = ?
              WHERE id = ?
            `).run(item.title || null, item.author || null, item.notes || null, existing.id);
            console.log(`✅ 愿望清单项已更新: ${item.title}`);
          } else {
            // 插入新数据
            db.prepare(`
              INSERT INTO wishlist (reader_id, isbn, title, author, notes)
              VALUES (0, ?, ?, ?, ?)
            `).run(isbn, item.title || null, item.author || null, item.notes || null);
            console.log(`✅ 愿望清单项已插入: ${item.title}`);
          }
          successCount++;
        } catch (error) {
          console.warn(`⚠️ 导入愿望清单项失败:`, item, error.message);
        }
      }

      console.log(`✅ 愿望清单导入完成，成功 ${successCount}/${totalCount} 项，跳过 ${skippedCount} 项`);
      return { success: true, totalCount, successCount, skippedCount };
    } catch (error) {
      console.error('❌ 导入愿望清单失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 从 JSON 文件导入所有数据
   */
  async importFromFile(filePath) {
    console.log('🚀 开始从文件导入数据...');
    console.log(`📄 文件路径: ${filePath}`);

    const data = await this.readJsonFile(filePath);
    if (!data) {
      console.error('❌ 无法读取文件或文件格式不正确');
      return { success: false };
    }

    const results = {
      readingGoal: await this.importReadingGoal(data.readingGoal),
      heatmap: await this.importHeatmapData(data.heatmap),
      wishlist: await this.importWishlist(data.wishlist)
    };

    console.log('🎉 数据导入完成！');
    console.log('📊 导入结果:');
    console.log(`   阅读目标: ${results.readingGoal.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   热力图: ${results.heatmap.success ? `✅ 成功 (${results.heatmap.totalDays} 天)` : '❌ 失败'}`);
    console.log(`   愿望清单: ${results.wishlist.success ? `✅ 成功 (${results.wishlist.successCount} 项)` : '❌ 失败'}`);

    return results;
  }
}

// 从命令行参数读取文件路径
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ 请提供 JSON 文件路径');
  console.log('用法: node import-localdata.js <文件路径>');
  process.exit(1);
}

const importer = new LocalDataImporter();
importer.importFromFile(filePath)
  .then(() => {
    console.log('✅ 导入完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  });
