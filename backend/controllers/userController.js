const UserModel = require('../models/userModel');
const fs = require('fs'); 
const path = require('path');
const multer = require('multer');
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
  
  
  static async updateUserProfile(req, res) {
    try {
        const userId = req.user.id;
        // Получаем данные из тела запроса. Файл аватара (если есть) будет в req.file.
        const { username, email, avatar: avatarAction } = req.body; 
        // avatarAction может быть null, если клиент хочет удалить аватар.
        // Если клиент просто не прислал поле avatar, avatarAction будет undefined.

        console.log(`[UserController] Attempting to update profile for user: ${userId}`);
        console.log('[UserController] Received body:', req.body);
        if(req.file) console.log('[UserController] Received file:', req.file.filename);

        let dataToUpdateInDB = {}; // Данные, которые реально пойдут в UserModel.updateUser

        // --- Валидация и подготовка текстовых полей ---
        if (username !== undefined) { // Если поле username пришло в запросе
            if (typeof username !== 'string' || username.trim().length < 3) {
                return res.status(400).json({ error: 'Имя пользователя должно содержать не менее 3 символов.' });
            }
            dataToUpdateInDB.username = username.trim();
        }

        if (email !== undefined) { // Если поле email пришло в запросе
            if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)) {
                return res.status(400).json({ error: 'Некорректный формат email.' });
            }
            dataToUpdateInDB.email = email.trim().toLowerCase(); // Приводим email к нижнему регистру для консистентности
        }

        // --- Логика обработки аватара ---
        const currentUser = await UserModel.getUserById(userId); // Нужен для получения старого пути аватара
        if (!currentUser) {
            // Эта ситуация маловероятна, если authMiddleware работает, но для полноты
            return res.status(404).json({ message: "Пользователь для обновления не найден." });
        }

        if (req.file) { // Если был загружен новый файл аватара
            console.log('[UserController] New avatar file uploaded:', req.file.filename);
            // Удаляем старый аватар, если он был
            if (currentUser.avatar) { // currentUser.avatar должен хранить путь типа '/uploads/avatars/file.jpg'
                const oldAvatarPath = path.join(__dirname, '..', '..', currentUser.avatar); // Путь от корня проекта
                if (fs.existsSync(oldAvatarPath)) {
                    try {
                        fs.unlinkSync(oldAvatarPath);
                        console.log('[UserController] Successfully deleted old avatar:', oldAvatarPath);
                    } catch (unlinkErr) {
                        console.error('[UserController] Error deleting old avatar file:', unlinkErr);
                    }
                }
            }
            // Сохраняем относительный путь к новому файлу (multer сохраняет в req.file.path)
            dataToUpdateInDB.avatar = `/${req.file.path.replace(/\\/g, '/')}`;
        } else if (avatarAction === null && currentUser.avatar) { 
            // Если клиент явно прислал avatar: null (сигнал на удаление) И у пользователя есть аватар
            console.log('[UserController] Action to delete avatar received.');
            const oldAvatarPath = path.join(__dirname, '..', '..', currentUser.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                    console.log('[UserController] Successfully deleted avatar on request:', oldAvatarPath);
                } catch (unlinkErr) {
                    console.error('[UserController] Error deleting avatar file on request:', unlinkErr);
                }
            }
            dataToUpdateInDB.avatar = null; // Устанавливаем null в БД
        }
        // Если req.file нет и avatarAction не null, то поле avatar не меняется в dataToUpdateInDB,
        // и UserModel.updateUser не будет его обновлять, если оно не передано в updatedData.

        // Проверяем, есть ли вообще что обновлять (кроме updated_at, которое модель добавит)
        if (Object.keys(dataToUpdateInDB).length === 0) {
            console.log('[UserController] No actual data changes to update profile.');
            // Возвращаем текущие данные пользователя, так как ничего не изменилось
            // (Модель UserModel.updateUser также должна это обрабатывать и возвращать текущего пользователя)
            return res.json({
                id: currentUser.id,
                username: currentUser.username,
                email: currentUser.email,
                avatar: currentUser.avatar,
                created_at: currentUser.created_at // Добавим для полноты, если фронт ожидает
            });
        }
        
        console.log('[UserController] Data to update in DB:', dataToUpdateInDB);
        const updatedUserFromDB = await UserModel.updateUser(userId, dataToUpdateInDB);

        // Формируем ответ клиенту (без пароля и других чувствительных данных)
        const responseUser = {
            id: updatedUserFromDB.id,
            username: updatedUserFromDB.username,
            email: updatedUserFromDB.email,
            avatar: updatedUserFromDB.avatar,
            created_at: updatedUserFromDB.created_at // Если нужно на фронте
        };
        res.json(responseUser);

    } catch (error) {
        console.error('[UserController] Error updating user profile:', error);
        
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: `Ошибка загрузки файла: ${error.message}` });
        } else if (error.message === 'Only image files are allowed!') {
            return res.status(400).json({ error: "Разрешены только файлы изображений!" });
        } else if (error.message === 'Email already in use') {
            return res.status(409).json({ error: 'Эта электронная почта уже используется.' });
        } else if (error.message === 'Username already in use') {
            return res.status(409).json({ error: 'Это имя пользователя уже используется.' });
        } else if (error.message === 'Unique constraint violation') {
             return res.status(409).json({ error: 'Имя пользователя или email уже существуют.' });
        }
        
        res.status(500).json({ error: 'Ошибка сервера при обновлении профиля.' });
    }
  }
  
  static deleteUserProfile = async (req, res) => {
    try {
          const userId = req.user.id;
          console.log('Deleting user profile for userId:', userId);

          // Перед удалением пользователя из БД, получим его данные, чтобы узнать avatar_url
          const currentUser = await UserModel.getUserById(userId);
          if (currentUser && currentUser.avatar) {
              const avatarPath = path.join(__dirname, '..', '..', currentUser.avatar);
              if (fs.existsSync(avatarPath)) {
                  try {
                      fs.unlinkSync(avatarPath);
                      console.log('Successfully deleted avatar file for user:', avatarPath);
                  } catch (unlinkErr) {
                      console.error('Error deleting avatar file for user:', unlinkErr);
                  }
              }
          }

          const deletedInfo = await UserModel.deleteUserById(userId);
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