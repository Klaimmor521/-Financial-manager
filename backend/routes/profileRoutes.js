// Файл: backend/routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); // Убедись, что путь верный
const userController = require('../controllers/userController'); // Убедись, что путь верный
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- НАЧАЛО: Конфигурация Multer ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/avatars/'; // Папка для сохранения аватаров (относительно корня проекта)
        // Создаем директорию, если ее нет (важно для первого запуска или если папка удалена)
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла, чтобы избежать перезаписи
        // Используем ID пользователя (из req.user, который добавляет authMiddleware)
        const userId = req.user.id; // Убедись, что твой authMiddleware добавляет req.user.id
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname); // Получаем расширение файла (e.g., '.jpg')
        cb(null, `user-${userId}-avatar-${uniqueSuffix}${fileExtension}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Разрешаем только изображения
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Принять файл
    } else {
        // Отклонить файл с ошибкой, которую можно будет поймать в контроллере
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // Лимит на размер файла 5MB (5 * 1024 * 1024 байт)
    }
});
// --- КОНЕЦ: Конфигурация Multer ---

// Логгер запросов (если он у тебя был, оставь)
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] PROFILE_ROUTE: ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) console.log('Request Body:', req.body);
    if (req.file) console.log('Request File:', req.file);
    next();
});

// Роут для получения профиля
router.get('/profile', authMiddleware, userController.getUserProfile);

// Роут для обновления профиля
// Теперь он использует middleware upload.single('avatar')
// 'avatar' - это имя поля <input type="file" name="avatar"> на фронтенде
router.put(
    '/profile',
    authMiddleware,       // Сначала проверка токена
    upload.single('avatar'), // Затем обработка файла (если он есть)
    userController.updateUserProfile // Затем основной контроллер
);

// Роут для удаления профиля
router.delete('/profile', authMiddleware, userController.deleteUserProfile);

module.exports = router;