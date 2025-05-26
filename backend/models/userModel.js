const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');

class UserModel 
{
  static async createUser(username, email, password) 
  {
    const hashedPassword = await hashPassword(password);
    const query = `
      INSERT INTO users (username, email, password, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), NOW()) 
      RETURNING id, username, email, created_at
    `;
    const values = [username, email, hashedPassword];
    
    try 
    {
      const result = await db.query(query, values);
      return result.rows[0];
    } 
    catch (error) 
    {
      if (error.code === '23505') 
      {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findUserByEmail(email) 
  {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async validateUser(email, password) 
  {
    const user = await this.findUserByEmail(email);
  console.log('Найден пользователь:', user);

  if (!user) {
    console.log('Пользователь не найден по email:', email);
    return null;
  }

  const isValid = await comparePassword(password, user.password);
  console.log('Пароль совпадает?', isValid);

  return isValid ? user : null;
  }
  static async updateUser(userId, updatedData) { // Изменено с updateUser = async ...
    try {
        const allowedFields = ['username', 'email', 'avatar'];
        const setClauses = [];
        const values = [];
        let valueIndex = 1;

        for (const key of allowedFields) {
            if (updatedData.hasOwnProperty(key)) {
                setClauses.push(`${key} = $${valueIndex++}`);
                values.push(updatedData[key]);
            }
        }

        if (setClauses.length === 0) {
            // Можно вернуть текущего пользователя или сообщение
            const currentUser = await this.getUserById(userId);
            return currentUser;
            // return { message: 'Nothing to update' };
        }

        values.push(userId); // userId будет последним параметром для WHERE
        const query = `
            UPDATE users 
            SET ${setClauses.join(', ')}, updated_at = NOW() 
            WHERE id = $${valueIndex} 
            RETURNING id, username, email, created_at, updated_at, avatar`; // Выбираем нужные поля

        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('User not found or nothing to update.');
        }
        return result.rows[0];

    } catch (error) {
        if (error.code === '23505' && error.constraint === 'users_email_key') { // Убедись, что имя ограничения верное
            throw new Error('Email already in use');
        }
        console.error('Error updating user in DB:', error);
        throw error;
    }
  }

  static async getUserById(userId) {
    try {
      console.log('Fetching user data for id:', userId);
      // Явно указываем поля, чтобы не тащить пароль и иметь контроль над данными
      const query = 'SELECT id, username, email, created_at, updated_at, avatar FROM users WHERE id = $1'; 
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  static async deleteUserById(userId) {
    try {
      // ВАЖНО: Подумай о связанных данных!
      // Возможно, тебе нужно каскадное удаление в БД или удаление связанных записей здесь.
      // Например, транзакции, цели и т.д.
      // await db.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      // await db.query('DELETE FROM goals WHERE user_id = $1', [userId]);

      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await db.query(query, [userId]);
      return result.rows[0]; // Вернет { id: удаленного_пользователя } или undefined
    } catch (error) {
      console.error('Error deleting user from DB:', error);
      throw error;
    }
  }
  
  static async getGoalCount(userId) {
      try 
      {
        console.log('Fetching goal count for userId:', userId);
          const query = 'SELECT COUNT(*) FROM goals WHERE user_id = $1'; // Adjust table/column names as needed
          const result = await db.query(query, [userId]);
          return parseInt(result.rows[0].count, 10);
      } catch (error) {
          console.error('Error fetching goal count:', error);
          throw error;
      }
  }
  
  static async getIncomeSum(userId) {
      try {
          const query = 'SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = \'income\''; // Adjust table/column names
          const result = await db.query(query, [userId]);
          return parseFloat(result.rows[0].sum) || 0; // Handle possible null values
      } catch (error) {
          console.error('Error fetching income sum:', error);
          throw error;
      }
  }
  
  static async getExpenseSum(userId) {
      try {
          const query = 'SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = \'expense\''; // Adjust table/column names
          const result = await db.query(query, [userId]);
          return parseFloat(result.rows[0].sum) || 0; // Handle possible null values
      } catch (error) {
          console.error('Error fetching expense sum:', error);
          throw error;
      }
  }
}

module.exports = UserModel;