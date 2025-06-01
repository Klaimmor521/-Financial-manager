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
    static async updateUser(userId, updatedData) {
      try {
          const allowedFields = ['username', 'email', 'avatar'];
          const setClauses = [];
          const values = [];
          let valueIndex = 1;
  
          const currentUser = await this.getUserById(userId); // this.getUserById уже использует db.query
          if (!currentUser) {
              // Эта ошибка должна была быть поймана в контроллере, но дублирование проверки не повредит
              throw new Error('User not found for update, cannot proceed.'); 
          }
  
          for (const key of allowedFields) {
              // Проверяем, есть ли поле в updatedData И оно отличается от текущего значения в БД
              // ИЛИ если это поле 'avatar' и оно пришло как null (сигнал на удаление)
              if (updatedData.hasOwnProperty(key) && 
                  (updatedData[key] !== currentUser[key] || (key === 'avatar' && updatedData[key] === null && currentUser[key] !== null))) {
                  
                  if ((key === 'email' || key === 'username') && (updatedData[key] === null || String(updatedData[key]).trim() === '')) {
                      console.warn(`Attempt to set empty ${key} for user ${userId}. Skipping update for this field.`);
                      continue; 
                  }
                  setClauses.push(`${key} = $${valueIndex++}`);
                  values.push(updatedData[key]); // updatedData[key] может быть null для avatar
              }
          }
  
          if (setClauses.length === 0) {
              console.log('[UserModel.updateUser] No fields to update for user:', userId);
              return currentUser; // Ничего не изменилось, возвращаем текущие данные
          }
  
          values.push(userId); // Добавляем userId для WHERE клаузы
          const query = `
              UPDATE users 
              SET ${setClauses.join(', ')}, updated_at = NOW() 
              WHERE id = $${values.length}  /* userId будет последним параметром в массиве values */
              RETURNING id, username, email, created_at, updated_at, avatar`;
  
          console.log('[UserModel.updateUser] Executing query:', query);
          console.log('[UserModel.updateUser] With values:', values);
          
          // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
          const result = await db.query(query, values); 
          // -------------------------
          
          if (result.rows.length === 0) {
              // Это не должно произойти, если currentUser был найден и id верный
              throw new Error('User update affected 0 rows, possible issue with ID or concurrent deletion.');
          }
          return result.rows[0];
  
      } catch (error) {
          if (error.code === '23505') { 
              // Проверяем имена ограничений из твоей БД
              if (error.constraint && (error.constraint === 'users_email_key' || error.constraint.includes('email'))) { // Пример: users_email_key
                  throw new Error('Email already in use');
              } else if (error.constraint && (error.constraint === 'users_username_key' || error.constraint.includes('username'))) { // Пример: users_username_key
                  throw new Error('Username already in use');
              } else {
                  console.error('Unknown unique constraint violation in updateUser:', error.constraint, error.detail);
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