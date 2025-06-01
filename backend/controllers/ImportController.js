const papaparse = require('papaparse');
const TransactionModel = require('../models/transactionModel');
const CategoryModel = require('../models/categoryModel');
const { pool } = require('../config/database');
const chardet = require('chardet');
const iconv = require('iconv-lite');
const { v4: uuidv4 } = require('uuid');

// Ожидаемые заголовки из нашего экспорта (в нижнем регистре)
const EXPECTED_NORMALIZED_HEADERS = ['date', 'type', 'category', 'description', 'amount'];

// HEADER_MAPPINGS можно оставить, если хочешь быть гибкой к другим названиям заголовков при импорте
const HEADER_MAPPINGS = {
    'дата': 'date', 'тип': 'type', 'категория': 'category',
    'описание': 'description', 'сумма': 'amount',
};

class ImportController {
    static async importTransactionsFromCSV(req, res) {
        if (!req.file) { /* ... */ }
        const userId = req.user.id;
        const fileBuffer = req.file.buffer;
        let csvFileContent = "";

        console.log(`[ImportController] Starting CSV import for user: ${userId}. File size: ${fileBuffer.length} bytes.`);

        // 1. Определение и конвертация кодировки (твой рабочий блок)
        try {
            const detectedEncoding = chardet.detect(fileBuffer);
            console.log(`[ImportController] Encoding initially detected by chardet: ${detectedEncoding}`);
            if (detectedEncoding && detectedEncoding.toUpperCase() === 'UTF-8') {
                csvFileContent = fileBuffer.toString('utf-8');
                console.log('[ImportController] File is likely UTF-8, decoded as UTF-8.');
            } else if (detectedEncoding && iconv.encodingExists(detectedEncoding.toLowerCase())) {
                csvFileContent = iconv.decode(fileBuffer, detectedEncoding);
                console.log(`[ImportController] Decoded from ${detectedEncoding}.`);
                if (csvFileContent.includes('Ïðîäóêòû') && detectedEncoding.toUpperCase().startsWith('ISO-8859')) {
                    console.warn(`[ImportController] Content after ${detectedEncoding} decode looks like misidentified Windows-1251. Trying Windows-1251.`);
                    csvFileContent = iconv.decode(fileBuffer, 'windows-1251');
                    console.log('[ImportController] Re-decoded using Windows-1251.');
                }
            } else {
                console.log('[ImportController] Chardet inconclusive or unknown. Trying UTF-8 then Windows-1251.');
                csvFileContent = fileBuffer.toString('utf-8');
                if (csvFileContent.includes('�') || csvFileContent.includes('Ïðîäóêòû')) {
                    console.warn('[ImportController] UTF-8 resulted in issues. Attempting Windows-1251.');
                    csvFileContent = iconv.decode(fileBuffer, 'windows-1251');
                    console.log('[ImportController] Decoded using forced Windows-1251.');
                } else {
                    console.log('[ImportController] Decoded using fallback UTF-8.');
                }
            }
        } catch (e) {
            console.error(`[ImportController] Critical error during encoding: ${e.message}.`);
            csvFileContent = fileBuffer.toString('utf-8'); // Fallback
            console.warn('[ImportController] Falling back to default UTF-8 due to encoding error.');
        }
        console.log('[ImportController] CSV Content AFTER encoding (first 500 chars):\n', csvFileContent.substring(0, 500));

        // 2. Подготовка контента для PapaParse: Убираем "глобальные" кавычки со строк данных
        let contentForPapaParse = "";
        const lines = csvFileContent.split(/\r?\n/);

        if (lines.length > 0) {
            contentForPapaParse += lines[0]; // Заголовки как есть

            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line.length === 0) continue; // Пропускаем пустые строки между данными

                // Удаляем внешние кавычки, только если вся строка в них и это не просто ""
                if (line.startsWith('"') && line.endsWith('"') && line.length > 1) { 
                    // Проверка, чтобы не удалить кавычки у поля, которое само является просто "" (пустое текстовое поле)
                    // Если после удаления внешних кавычек строка станет пустой, и это было единственное поле, то не трогаем.
                    // Но для нашего случая с 5 колонками, это безопасно.
                    line = line.substring(1, line.length - 1);
                }
                contentForPapaParse += '\n' + line; // Добавляем перенос строки перед каждой строкой данных
            }
            console.log('[ImportController] CSV Content for PapaParse (first 500 chars):\n', contentForPapaParse.substring(0, 500));
        } else {
            contentForPapaParse = csvFileContent; // Если только заголовки или пустой файл
        }
        console.log('[ImportController] --- End of Processed CSV Content Sample ---');

        const linesForFinalParse = contentForPapaParse.split(/\r?\n/);
        let finalCsvToParse = "";
        if (linesForFinalParse.length > 0) {
            finalCsvToParse += linesForFinalParse[0] + '\n'; // Заголовки
            for (let i = 1; i < linesForFinalParse.length; i++) {
                let line = linesForFinalParse[i];
                // Заменяем ""Слово"" на "Слово" (но только если это не часть """, что маловероятно)
                // Эта замена может быть слишком агрессивной, если "" используется для экранирования одиночной " внутри поля
                // НО, если Excel всегда так делает для обычных текстовых полей, это может сработать.
                line = line.replace(/""([^"]+)""/g, '"$1"'); 
                finalCsvToParse += line + (linesForFinalParse[i+1] !== undefined && linesForFinalParse[i+1].trim().length > 0 ? '\n' : '');
            }
            finalCsvToParse = finalCsvToParse.trimEnd();
            console.log('[ImportController] CSV Content AFTER simplifying double quotes (first 500 chars):\n', finalCsvToParse.substring(0, 500));
        } else {
            finalCsvToParse = contentForPapaParse;
        }

        const parseConfig = {
            header: true,
            skipEmptyLines: 'greedy',
            delimiter: ",",
            quoteChar: '"',
            escapeChar: '"', // Это для экранирования quoteChar внутри поля (например, "" означает ")
            dynamicTyping: false,
            transformHeader: header => {
                const normalized = header.trim().toLowerCase();
                return HEADER_MAPPINGS[normalized] || normalized.replace(/\s+/g, '_');
            },
        };
        console.log('[ImportController] PapaParse config:', parseConfig);

        const parseResult = papaparse.parse(finalCsvToParse, parseConfig);

        console.log('[ImportController] PapaParse meta:', parseResult.meta);
        console.log('[ImportController] PapaParse errors (first 5):', parseResult.errors ? parseResult.errors.slice(0,5) : 'No errors');
        console.log('[ImportController] PapaParse data (first row if exists):', parseResult.data && parseResult.data.length > 0 ? parseResult.data[0] : 'No data rows parsed');
        console.log('[ImportController] Number of data rows parsed by PapaParse:', parseResult.data ? parseResult.data.length : 0);

        // ... остальной код (проверка parseResult, nonEmptyRows, вызов validateAndMapRows и saveTransactions)
        // ... как в предыдущем твоем рабочем варианте ImportController.js

        const parsedRows = parseResult.data || [];
        const actualHeaders = parseResult.meta.fields || []; 

        console.log('[ImportController] Actual CSV headers after transform from PapaParse meta:', actualHeaders);

        if (parseResult.meta.aborted || (parseResult.errors.length > 0 && parsedRows.length === 0 && actualHeaders.length === 0) ) {
            console.error('[ImportController] CSV critical parsing errors: No data or headers parsed.', parseResult.errors);
            return res.status(400).json({ success: false, message: 'Ошибка при разборе CSV-файла. Не удалось извлечь данные или заголовки.', errors: parseResult.errors });
        }
        
        // Проверка, что заголовки были успешно распознаны (сравнение с EXPECTED_NORMALIZED_HEADERS)
        const essentialHeadersPresent = EXPECTED_NORMALIZED_HEADERS.every(expectedHeader => actualHeaders.includes(expectedHeader));
        if (!essentialHeadersPresent) {
            console.error('[ImportController] Essential headers missing after parsing. Expected:', EXPECTED_NORMALIZED_HEADERS, 'Got:', actualHeaders);
            return res.status(400).json({ success: false, message: `В CSV-файле отсутствует один или несколько обязательных заголовков. Ожидалось: ${EXPECTED_NORMALIZED_HEADERS.join(', ')}. Найдено: ${actualHeaders.join(', ')}.` });
        }

        const nonEmptyRows = parsedRows.filter(row => 
            EXPECTED_NORMALIZED_HEADERS.some(header => row && row[header] !== undefined && String(row[header]).trim() !== '')
        );
        console.log('[ImportController] Non-empty rows count after filter:', nonEmptyRows.length);


        if (nonEmptyRows.length === 0) {
            return res.status(200).json({ 
                success: true, // Технически ошибки нет, просто нет данных для импорта
                message: 'CSV-файл не содержит строк данных для импорта после фильтрации.', 
                summary: { imported: 0, failedValidation: 0, totalRowsProcessed: 0 } 
            });
        }

        const { validTransactions, errors: validationMappingErrors } = await ImportController.validateAndMapRows(nonEmptyRows, actualHeaders, userId);

        if (validationMappingErrors.length > 0 && validTransactions.length === 0) {
             return res.status(400).json({
                success: false,
                message: 'Не удалось выполнить проверку и сопоставление данных CSV. Не удалось подготовить транзакции для импорта.',
                errors: validationMappingErrors,
                summary: { imported: 0, failedValidation: nonEmptyRows.length, totalRowsProcessed: nonEmptyRows.length }
            });
       }
        
        if (validTransactions.length > 0) {
            const saveResult = await ImportController.saveTransactions(validTransactions, userId);
             return res.status(saveResult.success ? 200 : 500).json({
                ...saveResult,
                validationErrors: validationMappingErrors.length > 0 ? validationMappingErrors : undefined,
                summary: { 
                    imported: saveResult.importedCount || 0, 
                    failedOnSave: saveResult.failedOnSaveCount || 0,
                    failedValidation: validationMappingErrors.length,
                    totalRowsProcessed: nonEmptyRows.length
                }
            });
        } else {
            return res.status(200).json({
               success: true, 
               message: 'В CSV-файле не найдено допустимых транзакций для импорта после проверки и сопоставления.',
               errors: validationMappingErrors,
               summary: { imported: 0, failedValidation: validationMappingErrors.length, totalRowsProcessed: nonEmptyRows.length } 
           });
       }
    }

    static async validateAndMapRows(rows, actualHeaders, userId) {
        const validTransactions = [];
        const errors = [];

        const missingHeaders = EXPECTED_NORMALIZED_HEADERS.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            errors.push({ rowIndex: 'N/A', field: 'Headers', message: `Отсутствуют необходимые заголовки CSV: ${missingHeaders.join(', ')}. Ожидалось: ${EXPECTED_NORMALIZED_HEADERS.join(', ')}` });
            return { validTransactions, errors };
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowIndex = i + 2; // CSV строки обычно нумеруются с 1, плюс строка заголовков
            let rowIsValid = true;
            const currentTransaction = { userId }; // Сразу добавляем userId

            // Date (ожидаем YYYY-MM-DD из нашего экспорта)
            const dateStr = row.date ? String(row.date).trim() : null;
            if (!dateStr) {
                errors.push({ rowIndex, field: 'date', message: 'Обязательна дата.' });
                rowIsValid = false;
            } else {
                const parsedDate = new Date(dateStr + 'T00:00:00Z'); // Указываем UTC, чтобы избежать смещения дат
                if (isNaN(parsedDate.getTime())) {
                    errors.push({ rowIndex, field: 'date', message: `Недопустимый формат даты: "${dateStr}". Ожидаемый ГГГГ-ММ-ДД.` });
                    rowIsValid = false;
                } else {
                    currentTransaction.date = parsedDate.toISOString().split('T')[0];
                }
            }

            // Amount
            const amountStr = row.amount ? String(row.amount).trim().replace(',', '.') : null;
            if (!amountStr) {
                errors.push({ rowIndex, field: 'amount', message: 'Требуемая сумма.' });
                rowIsValid = false;
            } else {
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) { // Сумма должна быть положительной
                    errors.push({ rowIndex, field: 'amount', message: `Недопустимая сумма: "${row.amount}". Должно быть положительное число.` });
                    rowIsValid = false;
                } else {
                    currentTransaction.amount = amount;
                }
            }

            // Type (ожидаем 'income' или 'expense' из нашего экспорта)
            const typeStr = row.type ? String(row.type).trim().toLowerCase() : null;
            if (!typeStr) {
                errors.push({ rowIndex, field: 'type', message: 'Требуется ввести нужный тип.' });
                rowIsValid = false;
            } else if (typeStr === 'income' || typeStr === 'доход') { // Добавим русский вариант для гибкости
                currentTransaction.type = 'income';
            } else if (typeStr === 'expense' || typeStr === 'расход') { // Добавим русский вариант
                currentTransaction.type = 'expense';
            } else {
                errors.push({ rowIndex, field: 'type', message: `Недопустимый тип: "${row.type}". Ожидается 'income' или 'expense'.` });
                rowIsValid = false;
            }

            // Category (ожидаем имя категории из нашего экспорта)
            const categoryNameStr = row.category ? String(row.category).trim() : null;
            if (!categoryNameStr || categoryNameStr.toLowerCase() === 'uncategorized') {
                // Если категория "Uncategorized" или пустая, можно оставить categoryId = null
                currentTransaction.categoryId = null;
            } else {
                try {
                    let category = await CategoryModel.findUserCategoryByName(userId, categoryNameStr);
                    if (!category) {
                        category = await CategoryModel.findSystemCategoryByName(categoryNameStr);
                    }

                    if (!category) {

                        errors.push({ rowIndex, field: 'category', message: `Категория "${categoryNameStr}" не найдена. Если вы это сделаете, транзакция будет пропущена.` });
                        rowIsValid = false; // Пропускаем эту транзакцию
                    } else {
                        currentTransaction.categoryId = category.id;
                    }
                } catch (e) {
                    errors.push({ rowIndex, field: 'category', message: `Ошибка при обработки категории "${categoryNameStr}": ${e.message}` });
                    rowIsValid = false;
                }
            }

            // Description
            currentTransaction.description = row.description ? String(row.description).trim() : null;

            if (rowIsValid) {
                validTransactions.push(currentTransaction);
            }
        }
        return { validTransactions, errors };
    }

    // Метод saveTransactions остается таким же, как в предыдущем ответе
    static async saveTransactions(transactionsToSave, userId) {
        const client = await pool.connect();
        let importedCount = 0;
        let failedOnSaveCount = 0;
        const detailedErrors = [];

        try {
            await client.query('BEGIN');
            console.log(`[ImportController] Attempting to save ${transactionsToSave.length} transactions for user ${userId}`);

            for (const txData of transactionsToSave) {
                try {
                    const query = `
                        INSERT INTO transactions (id, user_id, amount, type, category_id, description, date, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                        RETURNING id
                    `;
                    const transactionId = uuidv4();
                    const values = [
                        transactionId,
                        txData.userId,
                        txData.amount,
                        txData.type,
                        txData.categoryId, // Может быть null, если категория "Uncategorized" или не найдена и так решено
                        txData.description,
                        txData.date
                    ];
                    await client.query(query, values);
                    importedCount++;
                } catch (dbError) {
                    failedOnSaveCount++;
                    console.error(`[ImportController] DB error saving transaction: ${JSON.stringify(txData)}`, dbError);
                    detailedErrors.push({ 
                        message: `Не удалось сохранить транзакцию (Date: ${txData.date}, Amount: ${txData.amount}). БД причина: ${dbError.detail || dbError.message}`,
                        data: txData 
                    });
                }
            }

            if (failedOnSaveCount > 0 && transactionsToSave.length > 0) {
                // Если хотим строгую атомарность (все или ничего), то здесь должен быть throw, чтобы откатить транзакцию
                // throw new Error(`${failedOnSaveCount} out of ${transactionsToSave.length} transactions failed to save during batch import. Rolling back.`);
                // Но если мы хотим сохранить то, что можно, а ошибки показать, то COMMIT все равно делаем.
                // Сейчас наша логика такая, что мы пытаемся сохранить все, что можем, и сообщаем об ошибках.
                // COMMIT все равно выполнится. Если нужно "все или ничего", то при первой же ошибке в цикле надо делать throw.
            }

            await client.query('COMMIT');
            console.log(`[ImportController] Successfully imported ${importedCount} transactions. Failed to save: ${failedOnSaveCount}`);
            return { 
                success: true, 
                message: `Процесс импорта завершен. Импортирован успешно: ${importedCount}. Не удалось сохранить в БД: ${failedOnSaveCount}.`,
                importedCount,
                failedOnSaveCount,
                errorsOnSave: failedOnSaveCount > 0 ? detailedErrors : undefined
            };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('[ImportController] Transaction rolled back due to critical error during save:', e);
            return { 
                success: false, 
                message: `Произошел критический сбой импорта: ${e.message}. Все действительные транзакции были отменены.`,
                importedCount: 0,
                failedOnSaveCount: transactionsToSave.length - importedCount, // Все, что не успели закоммитить
                errorsOnSave: [{ message: e.message, data: "All valid transactions in this batch" }, ...detailedErrors]
            };
        } finally {
            client.release();
        }
    }
}

module.exports = ImportController;