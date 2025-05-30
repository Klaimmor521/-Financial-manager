const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware'); 
const ReportController = require('../controllers/ReportController');

// Получить данные для отчета
router.get('/', authMiddleware, ReportController.getReportData);

// Экспортировать отчет в CSV
router.get('/export', authMiddleware, ReportController.exportReportToCSV);

module.exports = router;