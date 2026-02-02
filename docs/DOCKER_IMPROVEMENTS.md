# QC Booklog Docker 改进方案

本文档提供了改进QC Booklog项目以更好地支持Docker部署的建议和方案。

## 目录

- [当前问题分析](#当前问题分析)
- [代码改进建议](#代码改进建议)
- [配置改进建议](#配置改进建议)
- [架构改进建议](#架构改进建议)
- [实施优先级](#实施优先级)

## 当前问题分析

### 1. 硬编码路径问题

**问题描述**:
- 后端代码中硬编码了数据库路径：`D:\anz\calibre`
- 日志路径硬编码：`../data/logs/app.log`
- 不支持跨平台部署

**影响**:
- 无法在不同环境（Linux/Mac）中部署
- 需要修改代码才能更改路径
- 违反12-Factor应用原则

### 2. 缺少配置管理

**问题描述**:
- 没有统一的配置管理方案
- 环境变量使用不统一
- 缺少配置验证

**影响**:
- 配置分散，难以维护
- 容易出现配置错误
- 不支持多环境配置

### 3. 数据持久化不完善

**问题描述**:
- 数据库文件直接在宿主机上
- 缺少数据备份机制
- 没有数据迁移方案

**影响**:
- 数据安全风险
- 升级困难
- 无法轻松迁移数据

### 4. 缺少健康检查

**问题描述**:
- 后端没有健康检查端点
- 前端没有健康检查
- 无法自动检测服务异常

**影响**:
- 需要手动检查服务状态
- 故障恢复时间长
- 监控困难

### 5. 日志管理不完善

**问题描述**:
- 日志文件直接写入文件系统
- 没有日志轮转
- 缺少结构化日志

**影响**:
- 日志文件可能过大
- 难以查询和分析日志
- 不符合最佳实践

## 代码改进建议

### 1. 创建配置管理模块

**目标**: 统一管理所有配置，支持环境变量和配置文件

**实施步骤**:

#### 1.1 创建配置文件结构

```typescript
// server/config/index.ts
export interface AppConfig {
  // 服务器配置
  port: number;
  host: string;
  nodeEnv: string;

  // 数据库配置
  calibreDbPath: string;
  talebookDbPath: string;

  // 日志配置
  logLevel: string;
  logPath: string;
  maxLogFiles: number;
  maxLogSize: string;

  // 文件上传配置
  maxFileSize: number;
  uploadDir: string;

  // CORS配置
  corsOrigin: string;
  corsMethods: string[];
  corsHeaders: string[];

  // 安全配置
  jwtSecret?: string;
  sessionSecret?: string;
}

export interface DatabaseConfig {
  calibre: {
    path: string;
    readonly: boolean;
  };
  talebook: {
    path: string;
    readonly: boolean;
  };
}
```

#### 1.2 实现配置加载器

```typescript
// server/config/loader.ts
import { AppConfig, DatabaseConfig } from './index';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const getEnv = (key: string, defaultValue: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    console.warn(`Environment variable ${key} is not set, using default: ${defaultValue}`);
    return defaultValue;
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    console.warn(`Environment variable ${key} is not a valid number, using default: ${defaultValue}`);
    return defaultValue;
  }
  return num;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const config: AppConfig = {
  // 服务器配置
  port: getEnvNumber('PORT', 7401),
  host: getEnv('HOST', '0.0.0.0'),
  nodeEnv: getEnv('NODE_ENV', 'production'),

  // 数据库配置
  calibreDbPath: getEnv('CALIBRE_DB_PATH', './data/calibre/metadata.db'),
  talebookDbPath: getEnv('TALEBOOK_DB_PATH', './data/calibre-webserver.db'),

  // 日志配置
  logLevel: getEnv('LOG_LEVEL', 'info'),
  logPath: getEnv('LOG_PATH', './data/logs'),
  maxLogFiles: getEnvNumber('MAX_LOG_FILES', 5),
  maxLogSize: getEnv('MAX_LOG_SIZE', '5m'),

  // 文件上传配置
  maxFileSize: getEnvNumber('MAX_FILE_SIZE', 20),
  uploadDir: getEnv('UPLOAD_DIR', './data/uploads'),

  // CORS配置
  corsOrigin: getEnv('CORS_ORIGIN', '*'),
  corsMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  corsHeaders: ['Content-Type', 'Authorization'],

  // 安全配置
  jwtSecret: getEnv('JWT_SECRET', ''),
  sessionSecret: getEnv('SESSION_SECRET', ''),
};

export const dbConfig: DatabaseConfig = {
  calibre: {
    path: config.calibreDbPath,
    readonly: true,
  },
  talebook: {
    path: config.talebookDbPath,
    readonly: false,
  },
};

// 验证必需的配置
export const validateConfig = (): boolean => {
  const requiredPaths = [
    { name: 'Calibre DB', path: config.calibreDbPath },
    { name: 'Talebook DB', path: config.talebookDbPath },
  ];

  for (const { name, path } of requiredPaths) {
    if (!path || path.trim() === '') {
      console.error(`❌ ${name} path is required`);
      return false;
    }
  }

  return true;
};
```

#### 1.3 更新app.js使用配置

```javascript
// server/app.js
import express from 'express';
import cors from 'cors';
import { config, dbConfig, validateConfig } from './config';
import calibreService from './services/calibreService.js';

// 验证配置
if (!validateConfig()) {
  console.error('❌ Configuration validation failed. Please check your environment variables.');
  process.exit(1);
}

// 创建Express应用
const app = express();

// 使用配置
const PORT = config.port;
const HOST = config.host;

// 中间件配置
app.use(cors({
  origin: config.corsOrigin,
  methods: config.corsMethods,
  allowedHeaders: config.corsHeaders,
}));

app.use(express.json({ limit: `${config.maxFileSize}mb` }));
app.use(express.urlencoded({ extended: true }));

// 初始化服务
calibreService.initialize(dbConfig);

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`📚 Calibre DB: ${config.calibreDbPath}`);
  console.log(`📚 Talebook DB: ${config.talebookDbPath}`);
});
```

### 2. 改进日志系统

**目标**: 实现结构化日志、日志轮转、多级别日志

**实施步骤**:

#### 2.1 创建日志配置

```typescript
// server/config/logger.ts
import winston from 'winston';
import path from 'path';
import { config } from './index';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'qc-booklog-backend' },
  transports: [
    // 文件传输（带轮转）
    new winston.transports.File({
      filename: path.join(config.logPath, 'app.log'),
      maxsize: config.maxLogSize,
      maxFiles: config.maxLogFiles,
      tailable: true,
    }),
    // 错误日志单独文件
    new winston.transports.File({
      filename: path.join(config.logPath, 'error.log'),
      level: 'error',
      maxsize: config.maxLogSize,
      maxFiles: config.maxLogFiles,
    }),
    // 控制台输出
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// 创建子日志记录器
export const createLogger = (module: string) => {
  return logger.child({ module });
};
```

#### 2.2 在服务中使用日志

```javascript
// server/services/calibreService.js
import { createLogger } from '../config/logger';

const logger = createLogger('CalibreService');

export const getAllBooks = async () => {
  logger.info('开始获取所有书籍');
  try {
    const books = await queryBooks();
    logger.info(`成功获取 ${books.length} 本书`);
    return books;
  } catch (error) {
    logger.error('获取书籍失败', { error: error.message, stack: error.stack });
    throw error;
  }
};
```

### 3. 添加健康检查端点

**目标**: 提供健康检查端点，支持Docker健康检查

**实施步骤**:

```javascript
// server/routes/health.js
import express from 'express';
import { createLogger } from '../config/logger';
import databaseService from '../services/databaseService.js';

const logger = createLogger('HealthCheck');
const router = express.Router();

// 基本健康检查
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    const dbStatus = await databaseService.checkConnection();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus ? 'up' : 'down',
      },
    };

    const statusCode = dbStatus ? 200 : 503;
    res.status(statusCode).json(health);

    logger.info('健康检查', { status: health.status, db: dbStatus });
  } catch (error) {
    logger.error('健康检查失败', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// 详细健康检查
router.get('/detailed', async (req, res) => {
  try {
    const dbStatus = await databaseService.checkConnection();
    const diskUsage = await getDiskUsage();
    const memoryUsage = process.memoryUsage();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus ? 'up' : 'down',
      },
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        disk: diskUsage,
      },
    };

    res.status(dbStatus ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
```

#### 3.2 在app.js中注册路由

```javascript
// server/app.js
import healthRouter from './routes/health';

app.use('/health', healthRouter);
```

### 4. 实现数据备份功能

**目标**: 提供自动数据备份和恢复功能

**实施步骤**:

```javascript
// server/services/backupService.js
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createLogger } from '../config/logger';
import { config } from '../config';

const logger = createLogger('BackupService');

export const createBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(config.logPath, 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.zip`);

  try {
    logger.info('开始创建备份', { backupFile });

    // 确保备份目录存在
    await fs.mkdir(backupDir, { recursive: true });

    // 创建备份
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logger.info('备份创建成功', { size: archive.pointer() });
    });

    archive.on('error', (err) => {
      logger.error('备份失败', { error: err.message });
      throw err;
    });

    archive.pipe(output);

    // 添加数据库文件
    archive.file(config.calibreDbPath, 'calibre/metadata.db');
    archive.file(config.talebookDbPath, 'talebook/calibre-webserver.db');

    // 添加数据目录
    archive.directory('./data', 'data');

    await archive.finalize();

    return backupFile;
  } catch (error) {
    logger.error('创建备份失败', { error: error.message });
    throw error;
  }
};

export const restoreBackup = async (backupFile: string) => {
  try {
    logger.info('开始恢复备份', { backupFile });

    // 验证备份文件
    await fs.access(backupFile, fs.constants.R_OK);

    // 解压备份
    const extract = require('extract-zip');
    await extract(backupFile, { dir: './data' });

    logger.info('备份恢复成功');
  } catch (error) {
    logger.error('恢复备份失败', { error: error.message });
    throw error;
  }
};

export const cleanupOldBackups = async (keepDays = 7) => {
  try {
    const backupDir = path.join(config.logPath, 'backups');
    const files = await fs.readdir(backupDir);
    const now = Date.now();
    const maxAge = keepDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        logger.info('删除旧备份', { file });
      }
    }
  } catch (error) {
    logger.error('清理旧备份失败', { error: error.message });
  }
};
```

### 5. 添加API文档

**目标**: 提供完整的API文档，方便开发和调试

**实施步骤**:

```javascript
// server/routes/docs.js
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QC Booklog API',
      version: '1.0.0',
      description: 'QC Booklog后端API文档',
    },
    servers: [
      {
        url: 'http://localhost:7401',
        description: '开发服务器',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

router.use('/', swaggerUi.serve);
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

export default router;
```

## 配置改进建议

### 1. 创建多环境配置

**目标**: 支持开发、测试、生产等多环境

**实施**:

```bash
# .env.development
NODE_ENV=development
PORT=7401
LOG_LEVEL=debug
CALIBRE_DB_PATH=./data/calibre/metadata.db

# .env.production
NODE_ENV=production
PORT=7401
LOG_LEVEL=warn
CALIBRE_DB_PATH=/app/data/calibre/metadata.db

# .env.test
NODE_ENV=test
PORT=7402
LOG_LEVEL=error
CALIBRE_DB_PATH=./test/data/calibre/metadata.db
```

### 2. 添加配置验证

**目标**: 启动时验证所有必需配置

**实施**:

```typescript
// server/config/validator.ts
import { config } from './index';
import fs from 'fs/promises';

export const validatePaths = async (): Promise<boolean> => {
  const paths = [
    { name: 'Calibre DB', path: config.calibreDbPath },
    { name: 'Talebook DB', path: config.talebookDbPath },
    { name: 'Log directory', path: config.logPath },
  ];

  for (const { name, path } of paths) {
    try {
      await fs.access(path, fs.constants.R_OK);
      console.log(`✅ ${name} path is accessible: ${path}`);
    } catch (error) {
      console.error(`❌ ${name} path is not accessible: ${path}`);
      return false;
    }
  }

  return true;
};

export const validatePorts = (): boolean => {
  const port = config.port;
  if (port < 1 || port > 65535) {
    console.error(`❌ Invalid port number: ${port}`);
    return false;
  }

  console.log(`✅ Port ${port} is valid`);
  return true;
};

export const validateAll = async (): Promise<boolean> => {
  const pathsValid = await validatePaths();
  const portsValid = validatePorts();

  return pathsValid && portsValid;
};
```

### 3. 添加配置热重载

**目标**: 支持不重启服务重新加载配置

**实施**:

```javascript
// server/config/hotReload.js
import chokidar from 'chokidar';
import { createLogger } from './logger';

const logger = createLogger('ConfigHotReload');

export const watchConfig = () => {
  const watcher = chokidar.watch('.env');

  watcher.on('change', async () => {
    logger.info('检测到配置文件变更，重新加载配置...');

    try {
      // 重新加载环境变量
      delete require.cache[require.resolve('dotenv')];
      require('dotenv').config();

      // 重新加载配置
      const { config } = await import('./index');

      logger.info('配置重新加载成功', {
        port: config.port,
        logLevel: config.logLevel,
      });
    } catch (error) {
      logger.error('配置重新加载失败', { error: error.message });
    }
  });
};
```

## 架构改进建议

### 1. 微服务化

**目标**: 将应用拆分为独立的微服务

**建议的微服务**:

```
qc-booklog/
├── frontend/          # 前端服务
├── api/              # API网关
├── book-service/      # 书籍服务
├── user-service/      # 用户服务
├── reading-service/  # 阅读服务
├── backup-service/    # 备份服务
└── monitoring/        # 监控服务
```

### 2. 添加消息队列

**目标**: 使用消息队列处理异步任务

**建议**:

```javascript
// 使用Redis或RabbitMQ
import { Queue } from 'bullmq';

const backupQueue = new Queue('backup', {
  connection: redisConfig,
});

backupQueue.process('create-backup', async (job) => {
  await createBackup(job.data);
});
```

### 3. 实现缓存层

**目标**: 减少数据库查询，提高性能

**建议**:

```javascript
// 使用Redis缓存
import Redis from 'ioredis';

const redis = new Redis();

export const getCachedBooks = async (key: string) => {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const books = await databaseService.getAllBooks();
  await redis.setex(key, 3600, JSON.stringify(books));
  return books;
};
```

### 4. 添加监控和告警

**目标**: 实时监控应用状态，异常告警

**建议**:

```javascript
// 使用Prometheus + Grafana
import promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route, res.statusCode)
      .observe(duration);
  });
  next();
});
```

## 实施优先级

### 高优先级（立即实施）

1. ✅ **配置管理模块** - 解决硬编码问题
2. ✅ **健康检查端点** - 支持Docker健康检查
3. ✅ **日志系统改进** - 结构化日志、日志轮转
4. ✅ **环境变量验证** - 启动时验证配置

### 中优先级（近期实施）

1. **数据备份功能** - 自动备份和恢复
2. **API文档** - Swagger/OpenAPI文档
3. **多环境配置** - 开发/测试/生产环境
4. **错误处理改进** - 统一错误处理和响应

### 低优先级（长期规划）

1. **微服务化** - 根据业务需求拆分服务
2. **消息队列** - 处理异步任务
3. **缓存层** - 提高性能
4. **监控告警** - 实时监控和告警

## 总结

通过实施以上改进建议，QC Booklog项目将获得：

1. **更好的可维护性** - 统一的配置管理
2. **更高的可靠性** - 健康检查、自动备份
3. **更强的可观测性** - 结构化日志、监控指标
4. **更好的部署体验** - Docker支持、多环境配置
5. **更高的性能** - 缓存、优化查询

建议按照优先级逐步实施，每次实施后进行充分测试。

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-23
