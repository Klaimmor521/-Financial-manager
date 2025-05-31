const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ImportController = require('../controllers/ImportController');
const multer = require('multer');

// Настройка multer для приема файла в память (можно и на диск, если файлы большие)
const storage = multer.memoryStorage(); // Файл будет в req.file.buffer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Лимит 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only .csv files are allowed!'), false);
        }
    }
});

router.post(
    '/transactions/csv',
    authMiddleware,
    upload.single('csvFile'), // 'csvFile' - имя поля из FormData на фронтенде
    ImportController.importTransactionsFromCSV
);

module.exports = router;