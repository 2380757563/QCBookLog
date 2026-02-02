/**
 * 标签服务测试脚本
 * 用于测试标签的规范化、去重、中文处理等功能
 */

import TagService from '../services/tagService.js';
import databaseService from '../services/databaseService.js';

console.log('🧪 开始标签服务测试\n');

// 等待数据库初始化
setTimeout(async () => {
  try {
    // 1. 测试标签规范化
    console.log('📋 测试1: 标签规范化');
    console.log('=====================================');

    const testTags = [
      '  小说  ',
      '科幻',
      '  科幻  ',
      '文学',
      '  历史',
      '传记',
      '  ',
      '',
      null,
      undefined,
      '中国文学',
      '中国文学  ',
      '  中国文学',
      '外国文学',
      '  外国文学  '
    ];

    console.log('原始标签:', testTags);
    console.log('');

    const tagService = new TagService(databaseService);

    const normalizedTags = tagService.normalizeAndDeduplicateTags(testTags);
    console.log('规范化后标签:', normalizedTags);
    console.log(`去重后数量: ${normalizedTags.length}/${testTags.length}\n`);

    // 2. 测试中文标签处理
    console.log('📋 测试2: 中文标签处理');
    console.log('=====================================');

    const chineseTags = [
      '小说',
      '散文',
      '诗歌',
      '历史',
      '哲学',
      '心理学',
      '计算机科学',
      '人工智能',
      '深度学习',
      '机器学习'
    ];

    console.log('中文标签:', chineseTags);
    const normalizedChineseTags = tagService.normalizeAndDeduplicateTags(chineseTags);
    console.log('规范化后:', normalizedChineseTags);
    console.log('');

    // 3. 测试特殊字符和空格处理
    console.log('📋 测试3: 特殊字符和空格处理');
    console.log('=====================================');

    const specialTags = [
      '  科幻  小说  ',
      '文学  作品',
      '  历史  传记  ',
      '计算机  科学',
      '人工智能  技术'
    ];

    console.log('包含多个空格的标签:', specialTags);
    const normalizedSpecialTags = tagService.normalizeAndDeduplicateTags(specialTags);
    console.log('规范化后:', normalizedSpecialTags);
    console.log('');

    // 4. 测试大小写不敏感去重
    console.log('📋 测试4: 大小写不敏感去重');
    console.log('=====================================');

    const caseTags = [
      '小说',
      '小说',
      'NOVEL',
      'Novel',
      '文学',
      'LITERATURE',
      'literature'
    ];

    console.log('不同大小写的标签:', caseTags);
    const normalizedCaseTags = tagService.normalizeAndDeduplicateTags(caseTags);
    console.log('规范化后:', normalizedCaseTags);
    console.log('');

    // 5. 测试批量添加标签到数据库
    console.log('📋 测试5: 批量添加标签到数据库');
    console.log('=====================================');

    if (databaseService.isCalibreAvailable()) {
      const tagsToAdd = ['测试标签1', '测试标签2', '测试标签3'];
      console.log('要添加的标签:', tagsToAdd);

      const tagIdMap = tagService.batchAddTags(tagsToAdd);
      console.log('标签ID映射:', Object.fromEntries(tagIdMap));
      console.log('');

      // 6. 测试为书籍添加标签
      console.log('📋 测试6: 为书籍添加标签');
      console.log('=====================================');

      // 获取第一本书籍ID（如果存在）
      const books = databaseService.getAllBooksFromCalibre();
      if (books.length > 0) {
        const testBookId = books[0].id;
        const bookTags = ['小说', '科幻', '文学', '测试标签1', '测试标签2'];

        console.log(`书籍ID: ${testBookId}`);
        console.log(`要添加的标签: ${bookTags}`);

        const addResult = tagService.addTagsToBook(testBookId, bookTags);
        console.log('添加结果:', addResult);
        console.log('');

        // 7. 测试获取书籍标签
        console.log('📋 测试7: 获取书籍标签');
        console.log('=====================================');

        const bookTagsResult = tagService.getBookTags(testBookId);
        console.log(`书籍 ${testBookId} 的标签:`, bookTagsResult);
        console.log('');

        // 8. 测试更新书籍标签
        console.log('📋 测试8: 更新书籍标签');
        console.log('=====================================');

        const newBookTags = ['小说', '历史', '传记', '测试标签3'];
        console.log(`新的标签: ${newBookTags}`);

        const updateResult = tagService.updateBookTags(testBookId, newBookTags);
        console.log('更新结果:', updateResult);
        console.log('');

        // 9. 验证更新后的标签
        console.log('📋 测试9: 验证更新后的标签');
        console.log('=====================================');

        const updatedBookTags = tagService.getBookTags(testBookId);
        console.log(`更新后书籍 ${testBookId} 的标签:`, updatedBookTags);
        console.log('');
      } else {
        console.log('⚠️ 数据库中没有书籍，跳过书籍标签测试\n');
      }

      // 10. 测试获取所有标签
      console.log('📋 测试10: 获取所有标签');
      console.log('=====================================');

      const allTags = tagService.getAllTags();
      console.log(`数据库中所有标签数量: ${allTags.length}`);
      console.log('前10个标签:', allTags.slice(0, 10));
      console.log('');
    } else {
      console.log('⚠️ Calibre数据库不可用，跳过数据库测试\n');
    }

    console.log('✅ 所有测试完成');
    console.log('=====================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    process.exit(1);
  }
}, 2000);
