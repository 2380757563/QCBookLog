import { EventEmitter } from 'events';

const ENV_MAPPING = {
  calibrePath: 'CALIBRE_DB_PATH',
  talebookPath: 'TALEBOOK_DB_PATH',
  qcBooklogPath: 'QCBOOKLOG_DB_PATH',
  calibreDir: 'CALIBRE_DIR',
  talebookDir: 'TALEBOOK_DIR',
  tanshuApiKey: 'TANSHU_API_KEY',
  doubanApiKey: 'DOUBAN_API_KEY',
  isbnWorkApiKey: 'ISBN_WORK_API_KEY',
  syncInterval: 'SYNC_INTERVAL',
  port: 'PORT',
  nodeEnv: 'NODE_ENV'
};

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this._config = null;
  }

  loadConfig() {
    this._config = {
      calibrePath: process.env.CALIBRE_DB_PATH || null,
      talebookPath: process.env.TALEBOOK_DB_PATH || null,
      qcBooklogPath: process.env.QCBOOKLOG_DB_PATH || null,
      calibreDir: process.env.CALIBRE_DIR || null,
      talebookDir: process.env.TALEBOOK_DIR || null,
      tanshuApiKey: process.env.TANSHU_API_KEY || '',
      doubanApiKey: process.env.DOUBAN_API_KEY || '',
      isbnWorkApiKey: process.env.ISBN_WORK_API_KEY || '',
      syncInterval: parseInt(process.env.SYNC_INTERVAL) || 300000,
      port: parseInt(process.env.PORT) || 7401,
      nodeEnv: process.env.NODE_ENV || 'production'
    };
    
    return this._config;
  }

  loadConfigSync() {
    return this.loadConfig();
  }

  async saveConfig(newConfig) {
    const oldConfig = { ...this._config };
    
    this._config = { ...this._config, ...newConfig };
    
    this.emit('configChanged', {
      oldConfig,
      newConfig: this._config,
      changes: this._getChanges(oldConfig, newConfig)
    });
    
    console.log('✅ 配置已更新（运行时）');
    return this._config;
  }

  _getChanges(oldConfig, newConfig) {
    const changes = [];
    for (const key of Object.keys(newConfig)) {
      if (oldConfig[key] !== newConfig[key]) {
        changes.push({ key, oldValue: oldConfig[key], newValue: newConfig[key] });
      }
    }
    return changes;
  }

  get config() {
    return this._config || this.loadConfigSync();
  }

  getCalibrePath() {
    return this.config?.calibrePath || process.env.CALIBRE_DB_PATH || null;
  }

  getTalebookPath() {
    return this.config?.talebookPath || process.env.TALEBOOK_DB_PATH || null;
  }

  getQcBooklogPath() {
    return this.config?.qcBooklogPath || process.env.QCBOOKLOG_DB_PATH || null;
  }

  getApiKey(type) {
    const keyMap = { tanshu: 'tanshuApiKey', douban: 'doubanApiKey', isbnWork: 'isbnWorkApiKey' };
    return this.config?.[keyMap[type]] || '';
  }
}

export const configManager = new ConfigManager();
export default configManager;
