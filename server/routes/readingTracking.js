import express from 'express';
import readingTrackingService from '../services/readingTrackingService.js';

const router = express.Router();

router.post('/record', async (req, res) => {
  try {
    const { bookId, readerId, startTime, endTime, duration, startPage, endPage, pagesRead } = req.body;

    console.log('📤 收到创建阅读记录请求:', req.body);

    // 检查必要参数（使用更严格的检查）
    if (bookId == null || bookId === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: bookId'
      });
    }
    if (readerId == null || readerId === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: readerId'
      });
    }
    if (!startTime || typeof startTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: startTime'
      });
    }
    if (!endTime || typeof endTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: endTime'
      });
    }
    if (duration == null || duration === undefined || duration < 0) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: duration (必须 >= 0)'
      });
    }

    const record = await readingTrackingService.createReadingRecord({
      bookId,
      readerId,
      startTime,
      endTime,
      duration,
      startPage: startPage || 0,
      endPage: endPage || 0,
      pagesRead: pagesRead || 0
    });

    res.json({
      success: true,
      message: '阅读记录创建成功',
      data: record
    });
  } catch (error) {
    console.error('创建阅读记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建阅读记录失败',
      error: error.message
    });
  }
});

router.get('/records/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { readerId, limit = 10 } = req.query;

    const records = await readingTrackingService.getBookReadingRecords(
      parseInt(bookId),
      readerId ? parseInt(readerId) : undefined,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取书籍阅读记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取书籍阅读记录失败',
      error: error.message
    });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { readerId, startDate, endDate } = req.query;

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: '缺少 readerId 参数'
      });
    }

    const records = await readingTrackingService.getReaderReadingRecords(
      parseInt(readerId),
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取读者阅读记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取读者阅读记录失败',
      error: error.message
    });
  }
});

router.get('/stats/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { readerId } = req.query;

    const stats = await readingTrackingService.getBookReadingStats(
      parseInt(bookId),
      readerId ? parseInt(readerId) : undefined
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取书籍统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取书籍统计失败',
      error: error.message
    });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const { readerId } = req.query;

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: '缺少 readerId 参数'
      });
    }

    const summary = await readingTrackingService.getReaderSummary(parseInt(readerId));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('获取读者汇总统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取读者汇总统计失败',
      error: error.message
    });
  }
});

router.get('/stats/daily', async (req, res) => {
  try {
    const { readerId, startDate, endDate } = req.query;

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: '缺少 readerId 参数'
      });
    }

    const stats = await readingTrackingService.getDailyReadingStats(
      parseInt(readerId),
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取每日统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取每日统计失败',
      error: error.message
    });
  }
});

router.get('/details/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { readerId } = req.query;

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: '缺少 readerId 参数'
      });
    }

    const details = await readingTrackingService.getDailyReadingDetails(
      date,
      parseInt(readerId)
    );

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('获取每日详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取每日详情失败',
      error: error.message
    });
  }
});

router.get('/heatmap/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { readerId } = req.query;

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: '缺少 readerId 参数'
      });
    }

    const heatmapData = await readingTrackingService.getHeatmapData(
      parseInt(year),
      parseInt(readerId)
    );

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (error) {
    console.error('获取热力图数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热力图数据失败',
      error: error.message
    });
  }
});

export default router;
