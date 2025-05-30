const TransactionModel = require('../models/transactionModel'); // Убедись, что путь правильный
const CategoryModel = require('../models/categoryModel'); // Предположим, что есть такая модель

// Вспомогательная функция для определения дат
function getDatesForPeriod(type, year, month, quarter) {
    let startDate, endDate;
    year = parseInt(year);
    month = parseInt(month); // 1-12
    quarter = parseInt(quarter); // 1-4

    switch (type) {
        case 'monthly':
            if (!month || month < 1 || month > 12) {
                throw new Error('Invalid month for monthly report.');
            }
            // Начало месяца: YYYY-MM-01
            startDate = new Date(Date.UTC(year, month - 1, 1)); // UTC, чтобы избежать проблем с часовыми поясами
            // Конец месяца: последний день месяца
            endDate = new Date(Date.UTC(year, month, 0)); // день 0 следующего месяца = последний день текущего
            break;
        case 'quarterly':
            if (!quarter || quarter < 1 || quarter > 4) {
                throw new Error('Invalid quarter for quarterly report.');
            }
            const startMonth = (quarter - 1) * 3; // Q1: 0, Q2: 3, Q3: 6, Q4: 9 (для new Date)
            startDate = new Date(Date.UTC(year, startMonth, 1));
            endDate = new Date(Date.UTC(year, startMonth + 3, 0));
            break;
        case 'yearly':
            startDate = new Date(Date.UTC(year, 0, 1)); // 1 января
            endDate = new Date(Date.UTC(year, 11, 31)); // 31 декабря
            break;
        default:
            throw new Error('Invalid report type.');
    }
    // Форматируем даты в 'YYYY-MM-DD' для SQL, т.к. поле 'date' в БД типа 'date'
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

// Вспомогательная функция для агрегации данных
async function aggregateReportData(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory = {};
    const expenseByCategory = {};

    // Получим все категории один раз, чтобы не делать много запросов в цикле (если нужно)
    // Либо предполагаем, что category_name уже есть в транзакциях благодаря JOIN
    // const categories = await CategoryModel.findAll(); // Если есть такой метод
    // const categoryMap = categories.reduce((map, cat) => {
    //     map[cat.id] = cat.name;
    //     return map;
    // }, {});

    for (const t of transactions) {
        const amount = parseFloat(t.amount);
        const categoryName = t.category_name || 'Uncategorized'; // Используем category_name из JOIN

        if (t.type === 'income') {
            totalIncome += amount;
            incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount;
        } else if (t.type === 'expense') {
            totalExpense += amount;
            expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount;
        }
    }

    return {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpense: parseFloat(totalExpense.toFixed(2)),
        netBalance: parseFloat((totalIncome - totalExpense).toFixed(2)),
        incomeByCategory: Object.fromEntries(
            Object.entries(incomeByCategory).map(([key, value]) => [key, parseFloat(value.toFixed(2))])
        ),
        expenseByCategory: Object.fromEntries(
            Object.entries(expenseByCategory).map(([key, value]) => [key, parseFloat(value.toFixed(2))])
        ),
        transactions: transactions // Можно решить, включать ли все транзакции в JSON ответа
    };
}

class ReportController {
    static async getReportData(req, res) {
        try {
            const userId = req.user.id;
            const { type, year, month, quarter } = req.query;

            if (!type || !year) {
                return res.status(400).json({ error: 'Report type and year are required.' });
            }

            const { startDate, endDate } = getDatesForPeriod(type, year, month, quarter);
            console.log(`Generating report for user ${userId}, type: ${type}, period: ${startDate} to ${endDate}`);

            const transactions = await TransactionModel.getTransactionsForReport(userId, startDate, endDate);
            
            if (!transactions) { // Добавим проверку, хотя модель должна вернуть [] если ничего нет
                 console.log(`No transactions found for user ${userId} in period ${startDate} to ${endDate}`);
                 return res.json({ 
                    message: `No data for ${type} report, year ${year}`, 
                    period: { startDate, endDate },
                    data: { // Возвращаем структуру с нулями
                        totalIncome: 0,
                        totalExpense: 0,
                        netBalance: 0,
                        incomeByCategory: {},
                        expenseByCategory: {},
                        transactions: []
                    } 
                });
            }

            const reportData = await aggregateReportData(transactions);

            res.json({
                message: `Report data for ${type}, year ${year}`,
                period: { startDate, endDate },
                data: reportData
            });

        } catch (error) {
            console.error('Error generating report data:', error);
            if (error.message.startsWith('Invalid')) { // Ошибки из getDatesForPeriod
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to generate report data.' });
        }
    }

    static async exportReportToCSV(req, res) {
        try {
            const userId = req.user.id;
            const { type, year, month, quarter } = req.query;

            if (!type || !year) {
                return res.status(400).json({ error: 'Report type and year are required for export.' });
            }

            const { startDate, endDate } = getDatesForPeriod(type, year, month, quarter);
            console.log(`Exporting report for user ${userId}, type: ${type}, period: ${startDate} to ${endDate}`);

            const transactions = await TransactionModel.getTransactionsForReport(userId, startDate, endDate);
            
            // Если транзакций нет, можно отправить пустой CSV или CSV с заголовками
            if (!transactions || transactions.length === 0) {
                const emptyCsvData = "Date,Type,Category,Description,Amount\n"; // Только заголовки
                res.setHeader('Content-Type', 'text/csv');
                const filename = `report-${type}-${year}${month ? '-'+month : ''}${quarter ? '-Q'+quarter : ''}.csv`;
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.status(200).send(emptyCsvData);
            }

            const reportData = await aggregateReportData(transactions); // Агрегируем для итогов (если нужны в CSV)

            // Формируем CSV строку
            // Можно использовать библиотеку типа 'papaparse' или 'csv-stringify' для более сложного CSV,
            // но для простого случая можно и вручную.

            let csvString = "";
            // Заголовки для транзакций
            csvString += "Date,Type,Category,Description,Amount\n";
            reportData.transactions.forEach(t => {
                const description = t.description ? `"${t.description.replace(/"/g, '""')}"` : ''; // Экранируем кавычки в описании
                csvString += `${t.date};${t.type},${t.category_name || 'Uncategorized'},${description},${t.amount}\n`;
            });

            // Добавляем итоговые суммы, если нужно
            csvString += "\n"; // Пустая строка для разделения
            csvString += "Summary\n";
            csvString += `Total Income,${reportData.totalIncome}\n`;
            csvString += `Total Expense,${reportData.totalExpense}\n`;
            csvString += `Net Balance,${reportData.netBalance}\n`;
            csvString += "\nIncome by Category\n";
            for (const [category, sum] of Object.entries(reportData.incomeByCategory)) {
                csvString += `"${category}",${sum}\n`;
            }
            csvString += "\nExpense by Category\n";
            for (const [category, sum] of Object.entries(reportData.expenseByCategory)) {
                csvString += `"${category}",${sum}\n`;
            }

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            const filename = `report-${type}-${year}${month ? '-'+month : ''}${quarter ? '-Q'+quarter : ''}.csv`;
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`); // Улучшенное имя файла для символов не из ASCII
            res.status(200).send('\ufeff' + csvString); // <--- ДОБАВЛЯЕМ BOM ПЕРЕД СТРОКОЙ CSV

        } catch (error) {
            console.error('Error exporting report to CSV:', error);
            if (error.message.startsWith('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to export report.' });
        }
    }
}

module.exports = ReportController;