import databaseService from '../legacy/database-service.js';

class UserSettingsService {
  constructor() {
    this.db = null;
  }

  ensureDb() {
    if (!this.db) {
      this.db = databaseService.getQcBooklogDb();
    }
    if (!this.db) {
      throw new Error('数据库不可用');
    }
  }

  async getSettings(userId = 0, priority = null) {
    this.ensureDb();

    let query = 'SELECT setting_key, setting_value, setting_type FROM qc_user_settings WHERE user_id = ?';
    const params = [userId];

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    const rows = this.db.prepare(query).all(...params);

    const settings = {};
    rows.forEach(row => {
      let value = row.setting_value;
      
      switch (row.setting_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error('解析JSON设置失败:', row.setting_key, e);
            value = null;
          }
          break;
      }
      
      settings[row.setting_key] = value;
    });

    return settings;
  }

  async getSetting(userId, key) {
    this.ensureDb();

    const row = this.db.prepare(
      'SELECT setting_value, setting_type FROM qc_user_settings WHERE user_id = ? AND setting_key = ?'
    ).get(userId, key);

    if (!row) {
      return null;
    }

    let value = row.setting_value;
    
    switch (row.setting_type) {
      case 'number':
        value = parseFloat(value);
        break;
      case 'boolean':
        value = value === 'true';
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('解析JSON设置失败:', key, e);
          value = null;
        }
        break;
    }

    return value;
  }

  async saveSetting(userId, key, value, priority = 'high', type = null) {
    this.ensureDb();

    if (!type) {
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (typeof value === 'object') {
        type = 'json';
      } else {
        type = 'string';
      }
    }

    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    const existing = this.db.prepare(
      'SELECT id FROM qc_user_settings WHERE user_id = ? AND setting_key = ?'
    ).get(userId, key);

    if (existing) {
      this.db.prepare(`
        UPDATE qc_user_settings 
        SET setting_value = ?, setting_type = ?, priority = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND setting_key = ?
      `).run(stringValue, type, priority, userId, key);
    } else {
      this.db.prepare(`
        INSERT INTO qc_user_settings (user_id, setting_key, setting_value, setting_type, priority)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, key, stringValue, type, priority);
    }

    return true;
  }

  async saveSettings(userId, settings, priority = 'high') {
    this.ensureDb();

    const stmt = this.db.prepare(`
      INSERT INTO qc_user_settings (user_id, setting_key, setting_value, setting_type, priority)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        setting_type = excluded.setting_type,
        priority = excluded.priority,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      let type = 'string';
      if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (typeof value === 'object') {
        type = 'json';
      }

      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      stmt.run(userId, key, stringValue, type, priority);
    }

    return true;
  }

  async deleteSetting(userId, key) {
    this.ensureDb();

    this.db.prepare(
      'DELETE FROM qc_user_settings WHERE user_id = ? AND setting_key = ?'
    ).run(userId, key);

    return true;
  }

  async deleteSettings(userId, priority = null) {
    this.ensureDb();

    let query = 'DELETE FROM qc_user_settings WHERE user_id = ?';
    const params = [userId];

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    this.db.prepare(query).run(...params);

    return true;
  }
}

export default new UserSettingsService();
