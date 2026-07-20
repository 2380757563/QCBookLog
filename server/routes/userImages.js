import express from 'express';
import multer from 'multer';
import userImagesService from '../services/legacy/userImagesService.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

/**
 * 获取用户图片列表
 * GET /api/user-images
 * Query: userId, imageType
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;
    const imageType = req.query.imageType || null;

    const images = await userImagesService.getImages(userId, imageType);

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('❌ 获取用户图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个用户图片
 * GET /api/user-images/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;

    const image = await userImagesService.getImage(userId, parseInt(id));

    if (!image) {
      return res.status(404).json({
        success: false,
        error: '图片不存在'
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('❌ 获取用户图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 上传用户图片
 * POST /api/user-images
 * Body: FormData { file, imageType, userId }
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    const { imageType, userId } = req.body;
    const userIdNum = userId ? parseInt(userId) : 0;

    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imageData = `data:${mimeType};base64,${base64Data}`;
    const imageName = req.file.originalname;

    const result = await userImagesService.uploadImage(
      userIdNum,
      imageType,
      imageData,
      imageName
    );

    res.json({
      success: true,
      data: result,
      message: '图片上传成功'
    });
  } catch (error) {
    console.error('❌ 上传用户图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除用户图片
 * DELETE /api/user-images/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;

    await userImagesService.deleteImage(userId, parseInt(id));

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('❌ 删除用户图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 更新图片排序
 * PUT /api/user-images/reorder
 * Body: { userId, imageType, imageIds }
 */
router.put('/reorder', async (req, res) => {
  try {
    const { userId, imageType, imageIds } = req.body;
    const userIdNum = userId ? parseInt(userId) : 0;

    await userImagesService.updateSortOrder(userIdNum, imageIds);

    res.json({
      success: true,
      message: '图片排序更新成功'
    });
  } catch (error) {
    console.error('❌ 更新图片排序失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取图片数量
 * GET /api/user-images/count
 * Query: userId, imageType
 */
router.get('/count', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;
    const imageType = req.query.imageType || null;

    const count = await userImagesService.getImageCount(userId, imageType);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('❌ 获取图片数量失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 删除所有图片
 * DELETE /api/user-images
 * Query: userId, imageType
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 0;
    const imageType = req.query.imageType || null;

    await userImagesService.deleteAllImages(userId, imageType);

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('❌ 删除所有图片失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
