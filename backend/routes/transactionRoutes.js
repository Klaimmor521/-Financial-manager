const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// Защита всех маршрутов с аутентификацией
router.use(authMiddleware);

// Маршруты для транзакций
router.post('/', TransactionController.createTransaction);
router.get('/', TransactionController.getAllTransactions);
router.get('/summary', TransactionController.getTransactionSummary);
router.post('/filter', TransactionController.getFilteredTransactions);
router.get('/category/:categoryId', TransactionController.getTransactionsByCategory);
router.get('/:id', TransactionController.getTransactionById);
router.put('/:id', TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

module.exports = router;