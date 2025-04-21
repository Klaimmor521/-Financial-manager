const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class NotificationModel {
  static async create(notificationData) {
    const { userId, type, message, relatedEntityId = null } = notificationData;
    
    const query = `
      INSERT INTO notifications (
        id, user_id, type, message, related_entity_id, 
        is_read, created_at
      )
      VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const notificationId = uuidv4();
    const result = await pool.query(query, [
      notificationId, userId, type, message, relatedEntityId
    ]);
    
    return result.rows[0];
  }

  static async findAllForUser(userId, limit = 50) {
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING *
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*)
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  static async delete(id, userId) {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }
}

module.exports = NotificationModel;