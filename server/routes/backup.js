/**
 * 备份恢复路由模块
 * 处理数据备份和恢复相关的API请求
 */

import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { readJsonFile, writeJsonFile, fileExists, updateVersionInfo } from '../services/dataService.js';
import archiver from 'archiver';
import unzipper from 'unzipper';
import databaseService from '../services/databaseService.js';

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), '../data');
const BACKUP_DIR = path.join(DATA_DIR, 'metadata/backup');

/**
 * 获取所有备份列表
 */
router.get('/', async (req, res) => {
  try {
    const backupFiles = await fs.readdir(BACKUP_DIR);
    
    // 获取每个备份文件的详细信息
    const backups = await Promise.all(backupFiles.map(async (filename) => {
      const stats = await fs.stat(path.join(BACKUP_DIR, filename));
      return {
        filename: filename,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    }));
    
    // 按创建时间降序排序
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 创建备份
 */
router.post('/', async (req, res) => {
  try {
    // 创建备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `backup-${timestamp}.zip`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // 创建写入流
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });
    
    // 监听事件
    output.on('close', () => {
      res.json({
        message: `备份成功，文件大小: ${archive.pointer()} 字节`,
        filename: backupFilename
      });
    });
    
    archive.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
    
    // 管道连接
    archive.pipe(output);
    
    // 添加数据目录到压缩包
    archive.directory(DATA_DIR, false);
    
    // 完成压缩
    await archive.finalize();
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 恢复备份
 */
router.post('/restore/:filename', async (req, res) => {
  try {
    const backupFilename = req.params.filename;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // 检查备份文件是否存在
    if (!(await fileExists(`metadata/backup/${backupFilename}`))) {
      return res.status(404).json({ error: '备份文件不存在' });
    }
    
    // 创建临时目录
    const tempDir = path.join(DATA_DIR, `temp-${Date.now()}`);
    await fs.mkdir(tempDir);
    
    try {
      // 解压备份文件到临时目录
      await fs.createReadStream(backupPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();
      
      // 复制临时目录中的数据到数据目录
      const tempDataDir = path.join(tempDir, 'data');
      if (await fileExists(tempDataDir, true)) {
        // 清空当前数据目录
        const currentFiles = await fs.readdir(DATA_DIR);
        for (const file of currentFiles) {
          if (file !== 'metadata') {
            const filePath = path.join(DATA_DIR, file);
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
              await fs.rm(filePath, { recursive: true });
            } else {
              await fs.unlink(filePath);
            }
          }
        }
        
        // 复制备份数据到数据目录
        const backupFiles = await fs.readdir(tempDataDir);
        for (const file of backupFiles) {
          const srcPath = path.join(tempDataDir, file);
          const destPath = path.join(DATA_DIR, file);
          await fs.cp(srcPath, destPath, { recursive: true });
        }
        
        await updateVersionInfo();
        res.json({ message: '备份恢复成功' });
      } else {
        throw new Error('备份文件格式不正确');
      }
    } finally {
      // 删除临时目录
      await fs.rm(tempDir, { recursive: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 删除备份
 */
router.delete('/:filename', async (req, res) => {
  try {
    const backupFilename = req.params.filename;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // 检查备份文件是否存在
    if (!(await fileExists(`metadata/backup/${backupFilename}`))) {
      return res.status(404).json({ error: '备份文件不存在' });
    }
    
    // 删除备份文件
    await fs.unlink(backupPath);
    res.json({ message: '备份文件删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 下载备份文件
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const backupFilename = req.params.filename;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // 检查备份文件是否存在
    if (!(await fileExists(`metadata/backup/${backupFilename}`))) {
      return res.status(404).json({ error: '备份文件不存在' });
    }

    // 发送文件
    res.download(backupPath, backupFilename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 导出整库备份（Calibre书库 + Talebook数据库）
 * 用于完整备份书籍数据和数据库
 */
router.get('/library', async (req, res) => {
  try {
    console.log('📦 开始导出整库备份...');

    // 获取 Calibre 书库目录
    const calibreDbPath = databaseService.getDbPath();
    const calibreLibraryDir = path.dirname(calibreDbPath);
    console.log('📁 Calibre 数据库路径:', calibreDbPath);
    console.log('📁 Calibre 书库目录:', calibreLibraryDir);

    // 获取 Talebook 数据库路径
    const talebookDbPath = databaseService.getTalebookDbPath();
    console.log('📁 Talebook 数据库路径:', talebookDbPath);

    // 检查路径是否存在（直接使用 fs.access 检查绝对路径）
    try {
      await fs.access(calibreLibraryDir, fsSync.constants.R_OK | fsSync.constants.W_OK);
      console.log('✅ Calibre 书库目录存在且可访问');
    } catch (error) {
      console.error('❌ Calibre 书库目录不存在或无法访问:', error);
      return res.status(404).json({ error: `Calibre 书库目录不存在或无法访问: ${calibreLibraryDir}` });
    }

    try {
      await fs.access(talebookDbPath, fsSync.constants.R_OK);
      console.log('✅ Talebook 数据库存在且可访问');
    } catch (error) {
      console.error('❌ Talebook 数据库不存在或无法访问:', error);
      return res.status(404).json({ error: `Talebook 数据库文件不存在或无法访问: ${talebookDbPath}` });
    }

    // 创建压缩流
    const archive = archiver('zip', {
      zlib: { level: 6 } // 压缩级别 6，平衡速度和压缩率
    });

    // 监听错误
    archive.on('error', (err) => {
      console.error('❌ 压缩失败:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.on('progress', (progress) => {
      if (progress.entries.processed % 50 === 0) {
        console.log(`📦 压缩进度: 已处理 ${progress.entries.processed} 个条目`);
      }
    });

    // 监听压缩完成事件
    archive.on('end', () => {
      console.log('✅ 压缩完成，总字节数:', archive.pointer());
    });

    // 设置响应头（在 pipe 之前）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `library-backup-${timestamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log('📦 响应头已设置，文件名:', filename);

    // 将压缩流管道到响应
    archive.pipe(res);

    // 添加 Calibre 书库目录（重命名为 'calibre-library'）
    console.log('📦 正在添加 Calibre 书库目录...');
    archive.directory(calibreLibraryDir, 'calibre-library');

    // 添加 Talebook 数据库文件（重命名为 'talebook.db'）
    console.log('📦 正在添加 Talebook 数据库文件...');
    const talebookBuffer = await fs.readFile(talebookDbPath);
    archive.append(talebookBuffer, { name: 'talebook.db' });
    console.log('📦 Talebook 数据库文件已添加，大小:', talebookBuffer.length, '字节');

    // 创建备份元数据文件
    const metadata = {
      version: '2.0',
      type: 'full-library-backup',
      exportTime: new Date().toISOString(),
      calibreLibraryPath: calibreLibraryDir,
      talebookDbPath: talebookDbPath,
      appName: 'QC-booklog'
    };
    const metadataJson = JSON.stringify(metadata, null, 2);
    archive.append(metadataJson, { name: 'backup-metadata.json' });
    console.log('📦 备份元数据文件已添加');

    // 完成压缩
    console.log('📦 开始 finalize...');
    await archive.finalize();
    console.log('✅ 整库备份导出完成:', filename);
  } catch (error) {
    console.error('❌ 导出整库备份失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;