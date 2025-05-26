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
  
  
  static async updateUserProfile(req, res) 
  {
    try {
        const userId = req.user.id;
        // Текстовые поля из req.body (FormData или обычный JSON)
        // avatar_url_action - это наше специальное поле, которое клиент может прислать,
        // если он хочет удалить аватар (в этом случае avatar_url_action будет null или 'DELETE')
        const { username, email, avatar: avatarUrlAction } = req.body;

        let updatedData = {}; // Объект для данных, которые пойдут в UserModel.updateUser

        // Получаем текущего пользователя, чтобы знать его текущие данные и старый avatar_url
        const currentUser = await UserModel.getUserById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found to update." });
        }

        // 1. Обновляем текстовые поля, если они пришли и отличаются от текущих
        if (username && username !== currentUser.username) {
            updatedData.username = username;
        }
        if (email && email !== currentUser.email) {
            // Здесь можно добавить проверку на уникальность email, если UserModel.updateUser этого не делает
            updatedData.email = email;
        }

        // 2. Логика обработки аватара
        if (req.file) { // Если был загружен новый файл (multer добавил его в req.file)
            console.log('New avatar file uploaded:', req.file.filename);
            // Удаляем старый аватар, если он был
            if (currentUser.avatar) {
                // currentUser.avatar_url хранит относительный путь типа '/uploads/avatars/file.jpg'
                // path.join строит корректный путь к файлу на сервере
                // __dirname - это папка, где находится userController.js (backend/controllers)
                // '../' - поднимаемся на уровень выше (в backend/)
                // '../' - еще раз (в корень проекта, где лежит папка uploads)
                const oldAvatarPath = path.join(__dirname, '..', '..', currentUser.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    try {
                        fs.unlinkSync(oldAvatarPath);
                        console.log('Successfully deleted old avatar:', oldAvatarPath);
                    } catch (unlinkErr) {
                        console.error('Error deleting old avatar file:', unlinkErr);
                        // Не прерываем операцию, если старый файл не удалился
                    }
                }
            }
            // Сохраняем относительный путь к новому файлу для доступа через URL
            // req.file.path от multer это 'uploads/avatars/filename.jpg'
            updatedData.avatar = `/${req.file.path.replace(/\\/g, '/')}`; // Добавляем слэш в начало и нормализуем слэши
        } else if (avatarUrlAction === null && currentUser.avatar) {
            // Если клиент прислал avatar_url: null (сигнал на удаление) И у пользователя есть аватар
            console.log('Action to delete avatar received.');
            const oldAvatarPath = path.join(__dirname, '..', '..', currentUser.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                try {
                    fs.unlinkSync(oldAvatarPath);
                    console.log('Successfully deleted avatar on request:', oldAvatarPath);
                } catch (unlinkErr) {
                    console.error('Error deleting avatar file on request:', unlinkErr);
                }
            }
            updatedData.avatar = null; // Устанавливаем null в БД
        }
        // Если ни req.file, ни avatarUrlAction === null, то аватар не трогаем,
        // и updatedData.avatar_url не будет определено, UserModel.updateUser его не изменит.

        // Если нет никаких данных для обновления (ни текстовых полей, ни аватара)
        if (Object.keys(updatedData).length === 0) {
            console.log('No changes to profile data.');
            // Возвращаем текущие данные пользователя (включая avatar_url, если он есть)
            return res.json({
                id: currentUser.id,
                username: currentUser.username,
                email: currentUser.email,
                avatar: currentUser.avatar // Убедись, что это поле есть
            });
        }

        // Обновляем пользователя в БД
        const updatedUserFromDB = await UserModel.updateUser(userId, updatedData);

        // Формируем ответ клиенту
        const responseUser = {
            id: updatedUserFromDB.id,
            username: updatedUserFromDB.username,
            email: updatedUserFromDB.email,
            avatar: updatedUserFromDB.avatar // Это поле должно быть в ответе UserModel.updateUser
        };
        res.json(responseUser);

    } catch (error) {
        console.error('Error updating user profile:', error);
        // Обработка ошибок от multer (например, файл слишком большой или не тот тип)
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: `Multer error: ${error.message}` });
        } else if (error.message === 'Only image files are allowed!') { // Ошибка из нашего fileFilter
            return res.status(400).json({ error: error.message });
        }
        // Обработка других специфических ошибок
        if (error.message === 'Email already in use' || (error.code === '23505' && error.constraint && error.constraint.includes('email'))) { // Более надежная проверка ошибки уникальности email
            return res.status(409).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Server error while updating profile' });
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