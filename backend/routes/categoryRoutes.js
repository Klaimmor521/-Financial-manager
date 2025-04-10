const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Защита всех маршрутов с аутентификацией
router.use(authMiddleware);

// Маршруты для категорий
//router.post('/', CategoryController.createCategory);
router.get('/', CategoryController.getAllCategories);
router.get('/type/:type', CategoryController.getCategoriesByType);
router.get('/summary/:type', CategoryController.getCategorySummary);
//router.get('/:id', CategoryController.getCategoryById);
//router.put('/:id', CategoryController.updateCategory);
//router.delete('/:id', CategoryController.deleteCategory);

module.exports = router;