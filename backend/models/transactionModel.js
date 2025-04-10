const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Transaction {
  static async create({ userId, amount, type, categoryId, description, date }) {
    const query = `
      INSERT INTO transactions (id, user_id, amount, type, category_id, description, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      uuidv4(),
      userId,
      amount,
      type,
      categoryId,
      description,
      date
    ]);
    return result.rows[0];
  }

  static async findById(id, userId) {
    const query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1 AND t.user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  static async findAll(userId, filters = {}) {
    let query = `
      SELECT t.*, c.name as category_name, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    const queryParams = [userId];
    let paramCounter = 2;

    if (filters.type) {
      query += ` AND t.type = $${paramCounter}`;
      queryParams.push(filters.type);
      paramCounter++;
    }

    if (filters.categoryId) {
      query += ` AND t.category_id = $${paramCounter}`;
      queryParams.push(filters.categoryId);
      paramCounter++;
    }

    if (filters.startDate) {
      query += ` AND t.created_at >= $${paramCounter}`;
      queryParams.push(filters.startDate);
      paramCounter++;
    }

    if (filters.endDate) {
      query += ` AND t.created_at <= $${paramCounter}`;
      queryParams.push(filters.endDate);
      paramCounter++;
    }

    query += ' ORDER BY t.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCounter}`;
      queryParams.push(filters.limit);
      paramCounter++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCounter}`;
      queryParams.push(filters.offset);
    }

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async update(id, { amount, type, categoryId, description }, userId) {
    const query = `
      UPDATE transactions
      SET amount = $1,
          type = $2,
          category_id = $3,
          description = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `;
    const result = await pool.query(query, [amount, type, categoryId, description, id, userId]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    return result.rows[0];
  }

  static async getTransactionsByCategory(userId, categoryId, dateRange = {}) {
    let query = `SELECT * FROM transactions WHERE user_id = $1 AND category_id = $2`;
    const queryParams = [userId, categoryId];
    let paramCounter = 3;

    if (dateRange.startDate) {
      query += ` AND created_at >= $${paramCounter}`;
      queryParams.push(dateRange.startDate);
      paramCounter++;
    }

    if (dateRange.endDate) {
      query += ` AND created_at <= $${paramCounter}`;
      queryParams.push(dateRange.endDate);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async getSumByType(userId, type, dateRange = {}) {
    let query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1 AND type = $2
    `;
    const queryParams = [userId, type];
    let paramCounter = 3;

    if (dateRange.startDate) {
      query += ` AND created_at >= $${paramCounter}`;
      queryParams.push(dateRange.startDate);
      paramCounter++;
    }

    if (dateRange.endDate) {
      query += ` AND created_at <= $${paramCounter}`;
      queryParams.push(dateRange.endDate);
    }

    const result = await pool.query(query, queryParams);
    return parseFloat(result.rows[0].total);
  }

  static async getTransactionsByFilters(userId, filters = {}) {
    return this.findAll(userId, filters);
  }
}

module.exports = Transaction;