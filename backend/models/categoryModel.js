const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Category {
  // static async create(categoryData) {
  //   const { name, type, icon, userId } = categoryData;
    
  //   const query = `
  //     INSERT INTO categories (id, name, type, icon, user_id)
  //     VALUES ($1, $2, $3, $4, $5)
  //     RETURNING *
  //   `;
    
  //   const categoryId = uuidv4();
  //   const result = await pool.query(query, [categoryId, name, type, icon, userId]);
  //   return result.rows[0];
  // }
  
  static async findById(id) 
  {
    const query = 'SELECT * FROM categories WHERE id = $1 AND user_id IS NULL';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
  
  static async findAll() {
    const query = `
      SELECT * FROM categories 
      WHERE user_id IS NULL
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }
  
  static async findByType(type) {
    const query = `
      SELECT * FROM categories 
      WHERE type = $1 AND user_id IS NULL
      ORDER BY name
    `;
    const result = await pool.query(query, [type]);
    return result.rows;
  }
  
  // static async update(id, categoryData, userId) {
  //   const { name, icon } = categoryData;
    
  //   const query = `
  //     UPDATE categories
  //     SET name = $1,
  //         icon = $2,
  //         updated_at = CURRENT_TIMESTAMP
  //     WHERE id = $3 AND user_id = $4
  //     RETURNING *
  //   `;
    
  //   const result = await pool.query(query, [name, icon, id, userId]);
  //   return result.rows[0];
  // }
  
  static async delete(id, userId) {
    // Проверка, что категория принадлежит пользователю и не системная
    const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
  
  static async getCategorySummary(userId, type, dateRange = {}) {
    let query = `
      SELECT 
        c.id, c.name, c.icon, c.type, 
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = $1
    `;

    const queryParams = [userId];
    let paramCounter = 2;

    if (dateRange.startDate) {
      query += ` AND t.created_at >= $${paramCounter}`;
      queryParams.push(dateRange.startDate);
      paramCounter++;
    }

    if (dateRange.endDate) {
      query += ` AND t.created_at <= $${paramCounter}`;
      queryParams.push(dateRange.endDate);
      paramCounter++;
    }

    query += `
      WHERE c.type = $${paramCounter} AND c.user_id IS NULL
      GROUP BY c.id, c.name, c.icon, c.type
      ORDER BY total DESC
    `;

    queryParams.push(type);

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async findUserCategoryByName(userId, name) {
    const query = 'SELECT * FROM categories WHERE user_id = $1 AND lower(name) = lower($2) LIMIT 1';
    try {
        const result = await pool.query(query, [userId, name]); // name уже может быть в любом регистре, БД сама сравнит lower(name)
        return result.rows[0];
    } catch (error) {
        console.error(`Error finding user category by name "${name}" for user ${userId}:`, error);
        throw error;
    }
}

  static async findSystemCategoryByName(name) {
    const query = 'SELECT * FROM categories WHERE user_id IS NULL AND lower(name) = lower($1) LIMIT 1';
    try {
        const result = await pool.query(query, [name]); // name уже может быть в любом регистре
        return result.rows[0];
    } catch (error) {
        console.error(`Error finding system category by name "${name}":`, error);
        throw error;
    }
}
}

module.exports = Category;