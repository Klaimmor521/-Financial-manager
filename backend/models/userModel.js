const db = require('../config/database');
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
      const result = await db.query(query, values);
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
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async validateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const isValid = await comparePassword(password, user.password);
    return isValid ? user : null;
  }
}

module.exports = UserModel;