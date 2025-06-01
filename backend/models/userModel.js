// Файл: backend/models/userModel.js
const { pool } = require('../config/database'); // <--- ИЗМЕНЕНИЕ ИМПОРТА
const { hashPassword, comparePassword } = require('../utils/passwordUtils');

class UserModel {
  static async createUser(username, email, password) {
    const hashedPassword = await hashPassword(password);
    const query = `
      INSERT INTO users (username, email, password, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING id, username, email, created_at
    `;
    const values = [username, email, hashedPassword];
    try {
      const result = await pool.query(query, values); // <--- ИЗМЕНЕНИЕ db на pool
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]); // <--- ИЗМЕНЕНИЕ db на pool
    return result.rows[0];
  }

  static async validateUser(email, password) {
    const user = await this.findUserByEmail(email); // findUserByEmail уже использует pool
    // ... (остальная логика без изменений)
    if (!user) { /* ... */ return null; }
    const isValid = await comparePassword(password, user.password);
    return isValid ? user : null;
  }

  static async updateUser(userId, updatedData) {
    try {
        const allowedFields = ['username', 'email', 'avatar'];
        const setClauses = [];
        const values = [];
        let valueIndex = 1;

        const currentUser = await this.getUserById(userId); // getUserById тоже будет использовать pool
        if (!currentUser) throw new Error('User not found for update');

        for (const key of allowedFields) {
            if (updatedData.hasOwnProperty(key) && 
                (updatedData[key] !== currentUser[key] || (key === 'avatar' && updatedData[key] === null && currentUser[key] !== null))) {
                if ((key === 'email' || key === 'username') && (updatedData[key] === null || String(updatedData[key]).trim() === '')) {
                    console.warn(`Attempt to set empty ${key} for user ${userId}. Skipping update for this field.`);
                    continue; 
                }
                setClauses.push(`${key} = $${valueIndex++}`);
                values.push(updatedData[key]);
            }
        }

        if (setClauses.length === 0) {
            return currentUser; 
        }

        values.push(userId);
        const query = `
            UPDATE users 
            SET ${setClauses.join(', ')}, updated_at = NOW() 
            WHERE id = $${values.length} 
            RETURNING id, username, email, created_at, updated_at, avatar`;
        
        // Используем pool.query, так как мы это импортировали
        const result = await pool.query(query, values); // <--- УЖЕ БЫЛО pool, теперь соответствует импорту
        
        if (result.rows.length === 0) {
            throw new Error('User update affected 0 rows, possible issue with ID or concurrent deletion.');
        }
        return result.rows[0];
    } catch (error) {
        // ... (обработка ошибок уникальности остается)
        if (error.code === '23505') { 
             if (error.constraint && (error.constraint.includes('email'))) { 
                 throw new Error('Email already in use');
             } else if (error.constraint && (error.constraint.includes('username'))) {
                 throw new Error('Username already in use');
             } else {
                 throw new Error('Unique constraint violation');
             }
         }
         console.error('Error updating user in DB:', error);
         throw error;
    }
  }

  static async getUserById(userId) {
    try {
      console.log('Fetching user data for id:', userId);
      const query = 'SELECT id, username, email, created_at, updated_at, avatar FROM users WHERE id = $1'; 
      const result = await pool.query(query, [userId]); // <--- ИЗМЕНЕНИЕ db на pool
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching user by id:', error);
      throw error;
    }
  }

  static async deleteUserById(userId) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [userId]); // <--- ИЗМЕНЕНИЕ db на pool
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting user from DB:', error);
      throw error;
    }
  }
  
  static async getGoalCount(userId) {
      try {
        const query = 'SELECT COUNT(*) FROM goals WHERE user_id = $1';
        const result = await pool.query(query, [userId]); // <--- ИЗМЕНЕНИЕ db на pool
        return parseInt(result.rows[0].count, 10);
      } catch (error) {
        console.error('Error fetching goal count:', error);
        throw error;
      }
  }
  
  static async getIncomeSum(userId) {
      try {
        const query = 'SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = \'income\'';
        const result = await pool.query(query, [userId]); // <--- ИЗМЕНЕНИЕ db на pool
        return parseFloat(result.rows[0].sum) || 0;
      } catch (error) {
        console.error('Error fetching income sum:', error);
        throw error;
      }
  }
  
  static async getExpenseSum(userId) {
      try {
        const query = 'SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = \'expense\'';
        const result = await pool.query(query, [userId]); // <--- ИЗМЕНЕНИЕ db на pool
        return parseFloat(result.rows[0].sum) || 0;
      } catch (error) {
        console.error('Error fetching expense sum:', error);
        throw error;
      }
  }
}

module.exports = UserModel;