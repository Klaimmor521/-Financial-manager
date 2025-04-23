const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Защита всех маршрутов с аутентификацией
router.use(authMiddleware);

// Маршруты аналитики
router.get('/categories', AnalyticsController.getCategoryAnalytics);
router.get('/monthly-trends', AnalyticsController.getMonthlyTrends);
router.get('/income-expense-ratio', AnalyticsController.getIncomeExpenseRatio);
router.get('/savings-rate', AnalyticsController.getSavingsRate);
router.get('/recommendations', AnalyticsController.generateRecommendations);
router.get('/dashboard', AnalyticsController.getDashboardAnalytics);

module.exports = router;