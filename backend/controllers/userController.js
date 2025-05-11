const UserModel = require('../models/userModel');
const { generateToken } = require('../utils/tokenUtils');

class UserController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
      }

      const user = await UserModel.createUser(username, email, password);
      const token = generateToken(user);

      res.status(201).json({ user, token });
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

      const foundUser = await UserModel.findUserByEmail(email);
      if (!foundUser) {
        return res.status(401).json({ error: 'Пользователь с таким email не найден' });
      }

      const isValid = await UserModel.validateUser(email, password);
      if (!isValid) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }

      const token = generateToken(foundUser);

      res.json({
        user: {
          id: foundUser.id,
          username: foundUser.username,
          email: foundUser.email
        },
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка при входе' });
    }
  }

  static async getUserProfile(req, res) 
  {
    try 
    {
      // ИСПРАВЛЕНИЕ 1: Используем req.user.id
      const userId = req.user.id;
      if (!userId) { // Дополнительная проверка
          console.error('Error getting user profile: userId is missing from token');
          return res.status(401).json({ error: 'Unauthorized: User ID not found in token' });
      }

      console.log('Fetching user profile for userId:', userId);

      // ИСПРАВЛЕНИЕ 2: Вызываем метод модели UserModel
      const user = await UserModel.getUserById(userId); // Используем UserModel
      console.log("User from getUserById:", user);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const goalCount = await UserModel.getGoalCount(userId);
      const incomeSum = await UserModel.getIncomeSum(userId);
      const expenseSum = await UserModel.getExpenseSum(userId);

      const profileData = {
        id: user.id, // Явно указываем поля, чтобы случайно не отправить лишнего
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        avatar: user.avatar, // Если добавишь поле аватара
        goalCount,
        incomeSum,
        expenseSum
      };
      
      res.json(profileData);

    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
  
  
  static updateUserProfile = async (req, res) => {
    try {
      // ИСПРАВЛЕНИЕ 1: Используем req.user.id
      const userId = req.user.id;
      const updatedData = req.body;
      console.log('Updating user profile for userId:', userId, 'with data:', updatedData);

      if (!updatedData.username || !updatedData.email) {
        return res.status(400).json({ error: 'Username and email are required.' });
      }

      // ИСПРАВЛЕНИЕ 2: Вызываем метод модели UserModel
      const updatedUser = await UserModel.updateUser(userId, updatedData);
      // Возвращаем только необходимые данные, не пароль
      const responseUser = {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar_url: updatedUser.avatar_url // Если есть
      }
      res.json(responseUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      if (error.message === 'Email already in use') {
          return res.status(409).json({ error: 'Email already in use' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  };
  
  static deleteUserProfile = async (req, res) => {
    try {
      // ИСПРАВЛЕНИЕ 1: Используем req.user.id
      const userId = req.user.id;
      // ИСПРАВЛЕНИЕ 7: Опечатка
      console.log('Deleting user profile for userId:', userId);

      // ИСПРАВЛЕНИЕ 2 и 3: Вызываем метод модели UserModel (который нужно создать)
      const deletedInfo = await UserModel.deleteUserById(userId); // Предполагаемое имя нового метода
      if (!deletedInfo) {
          return res.status(404).json({ message: 'User not found for deletion' });
      }
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = UserController;