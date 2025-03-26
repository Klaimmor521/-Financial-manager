const UserModel = require('../models/userModel');
const { generateToken } = require('../utils/tokenUtils');

class UserController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Базовая валидация
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
      }

      const user = await UserModel.createUser(username, email, password);
      const token = generateToken(user);

      res.status(201).json({ 
        user, 
        token 
      });
    } catch (error) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }
      res.status(500).json({ error: 'Ошибка при регистрации' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.validateUser(email, password);

      if (!user) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const token = generateToken(user);

      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        }, 
        token 
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при входе' });
    }
  }
}

module.exports = UserController;