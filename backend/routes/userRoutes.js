const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);

// Защищенный маршрут - пример
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'Доступ к профилю разрешен' });
});

module.exports = router;