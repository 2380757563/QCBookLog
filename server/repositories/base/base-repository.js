/**
 * 基础仓储类
 * 提供通用的数据库操作方法
 */

/**
 * 基础仓储类
 */
class BaseRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * 准备 SQL 语句
   */
  prepare(sql) {
    return this.db.prepare(sql);
  }

  /**
   * 执行查询（单条）
   */
  queryOne(sql, params = []) {
    const stmt = this.prepare(sql);
    return stmt.get(...params);
  }

  /**
   * 执行查询（多条）
   */
  queryAll(sql, params = []) {
    const stmt = this.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * 执行修改操作（插入、更新、删除）
   */
  execute(sql, params = []) {
    const stmt = this.prepare(sql);
    return stmt.run(...params);
  }

  /**
   * 执行事务
   */
  transaction(fn) {
    return this.db.transaction(fn);
  }

  /**
   * 插入数据并返回 ID
   */
  insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = this.execute(sql, values);
    
    return result.lastInsertRowid;
  }

  /**
   * 批量插入数据
   */
  batchInsert(table, dataArray) {
    if (!dataArray || dataArray.length === 0) return [];

    const columns = Object.keys(dataArray[0]).join(', ');
    const placeholders = Object.keys(dataArray[0]).map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

    const insertMany = this.transaction((rows) => {
      return rows.map(row => {
        const values = Object.values(row);
        const result = this.execute(sql, values);
        return result.lastInsertRowid;
      });
    });

    return insertMany(dataArray);
  }

  /**
   * 更新数据
   */
  update(table, data, whereClause, whereParams = []) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    
    return this.execute(sql, values);
  }

  /**
   * 删除数据
   */
  delete(table, whereClause, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return this.execute(sql, whereParams);
  }

  /**
   * 检查记录是否存在
   */
  exists(table, whereClause, whereParams = []) {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    const result = this.queryOne(sql, whereParams);
    return result.count > 0;
  }

  /**
   * 获取记录总数
   */
  count(table, whereClause = '1=1', whereParams = []) {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    const result = this.queryOne(sql, whereParams);
    return result.count;
  }

  /**
   * 检查表是否存在
   */
  tableExists(tableName) {
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`;
    const result = this.queryOne(sql, [tableName]);
    return !!result;
  }

  /**
   * 获取表结构信息
   */
  getTableInfo(tableName) {
    return this.queryAll(`PRAGMA table_info(${tableName})`);
  }

  /**
   * 获取表索引信息
   */
  getTableIndexes(tableName) {
    return this.queryAll(`PRAGMA index_list(${tableName})`);
  }

  /**
   * 开启事务
   */
  beginTransaction() {
    return this.transaction(() => {});
  }

  /**
   * 执行原始 SQL
   */
  exec(sql) {
    return this.db.exec(sql);
  }
}

export default BaseRepository;
