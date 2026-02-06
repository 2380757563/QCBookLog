/**
 * 阅读数据服务
 * 已废弃：所有阅读数据现在通过 API 存储在数据库中
 * 保留此文件仅为了向后兼容，建议使用以下服务：
 * - readingGoalsService (阅读目标)
 * - readingHeatmapService (阅读热力图)
 * - wishlistService (愿望清单)
 *
 * @deprecated 请使用 readingGoalsService、readingHeatmapService、wishlistService 代替
 */

import type { HeatmapDataSet, AnnualReadingGoal } from './types';

class ReadingDataService {
  /**
   * @deprecated 请使用 readingGoalsService.setYearlyGoal()
   */
  saveAnnualReadingGoal(goal: AnnualReadingGoal): void {
    console.warn('⚠️ ReadingDataService.saveAnnualReadingGoal 已废弃，请使用 readingGoalsService');
  }

  /**
   * @deprecated 请使用 readingGoalsService.getReadingGoal()
   */
  getAnnualReadingGoal(year: number): number {
    console.warn('⚠️ ReadingDataService.getAnnualReadingGoal 已废弃，请使用 readingGoalsService');
    return 12; // 默认目标
  }

  /**
   * @deprecated 请使用 readingHeatmapService.getHeatmapData()
   */
  getHeatmapData(year: number): any[] {
    console.warn('⚠️ ReadingDataService.getHeatmapData 已废弃，请使用 readingHeatmapService');
    return [];
  }

  /**
   * @deprecated 请使用 readingHeatmapService.getHeatmapData()
   */
  getAllHeatmapData(): Record<number, any> {
    console.warn('⚠️ ReadingDataService.getAllHeatmapData 已废弃，请使用 readingHeatmapService');
    return {};
  }

  /**
   * @deprecated 热力图数据已迁移到数据库
   */
  saveHeatmapData(year: number, data: any[]): void {
    console.warn('⚠️ ReadingDataService.saveHeatmapData 已废弃，热力图数据现在存储在数据库中');
  }

  /**
   * @deprecated 阅读数据已迁移到数据库
   */
  exportReadingData(): { heatmap: Record<number, any>; goals: any[] } {
    console.warn('⚠️ ReadingDataService.exportReadingData 已废弃，阅读数据现在存储在数据库中');
    return { heatmap: {}, goals: [] };
  }

  /**
   * @deprecated 阅读数据已迁移到数据库
   */
  importReadingData(data: { heatmap: Record<number, any>; goals: any[] }): void {
    console.warn('⚠️ ReadingDataService.importReadingData 已废弃，阅读数据现在存储在数据库中');
  }

  /**
   * @deprecated LocalStorage 已不再使用
   */
  clearAllData(): void {
    console.warn('⚠️ ReadingDataService.clearAllData 已废弃，LocalStorage 已不再使用');
  }
}

export const readingDataService = new ReadingDataService();
