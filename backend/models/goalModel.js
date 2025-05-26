const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Goal {
  static async create(goalData) {
    const { userId, name, targetAmount, currentAmount = 0, startDate = new Date(), targetDate, description = '' } = goalData;
    
    const query = `
      INSERT INTO goals (
        id, user_id, name, target_amount, current_amount, 
        start_date, target_date, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const goalId = uuidv4();
    const result = await pool.query(query, [
      goalId, userId, name, targetAmount, 
      currentAmount, startDate, targetDate, description
    ]);
    
    return result.rows[0];
  }
  
  static async findById(id, userId) {
    const query = 'SELECT * FROM goals WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
  
  static async findAll(userId) {
    const query = 'SELECT * FROM goals WHERE user_id = $1 ORDER BY target_date';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  static async update(id, goalData, userId) {
    const { name, targetAmount, currentAmount, targetDate, description, isCompleted } = goalData;
    
    // Если targetDate существует и это строка, преобразуем в объект Date
    let formattedTargetDate = targetDate;
    if (targetDate && typeof targetDate === 'string') {
      // Убедимся, что дата сохраняется в том же формате, что и при создании
      formattedTargetDate = new Date(targetDate);
    }
    
    const query = `
      UPDATE goals
      SET name = COALESCE($1, name),
          target_amount = COALESCE($2, target_amount),
          current_amount = COALESCE($3, current_amount),
          target_date = COALESCE($4, target_date),
          description = COALESCE($5, description),
          is_completed = COALESCE($6, is_completed),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, targetAmount, currentAmount, formattedTargetDate, 
      description, isCompleted, id, userId
    ]);
    
    return result.rows[0];
  }
  
  static async delete(id, userId) {
    const query = 'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
  
  static async calculateProgress(id, userId) {
    const query = `
      SELECT 
        id, name, target_amount, current_amount, description,
        ROUND((current_amount / target_amount * 100)::numeric, 2) as percentage,
        start_date, target_date,
        (target_date::date - CURRENT_DATE) as days_remaining,
        (current_amount >= target_amount) as is_completed
      FROM goals
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
  
  static async calculateAllProgress(userId) {
    const query = `
      SELECT 
        id, name, target_amount, current_amount, description,
        ROUND((current_amount / target_amount * 100)::numeric, 2) as percentage,
        start_date, target_date,
        (target_date::date - CURRENT_DATE) as days_remaining,
        (current_amount >= target_amount) as is_completed
      FROM goals
      WHERE user_id = $1
      ORDER BY target_date ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  static async updateAmount(id, amount, userId) {
    const goal = await this.findById(id, userId);
    if (!goal) return null;
    
    const newAmount = parseFloat(goal.current_amount) + parseFloat(amount);
    const isCompleted = newAmount >= goal.target_amount;
    
    const query = `
      UPDATE goals
      SET current_amount = $1,
          is_completed = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [newAmount, isCompleted, id, userId]);
    return result.rows[0];
  }
}

module.exports = Goal;