const TransactionModel = require('../models/transactionModel');

function getDatesForPeriod(type, year, month, quarter) {
    let startDate, endDate;
    year = parseInt(year);
    month = parseInt(month); // 1-12
    quarter = parseInt(quarter); // 1-4

    switch (type) {
        case 'monthly':
            if (!month || month < 1 || month > 12) throw new Error('Invalid month for monthly report.');
            startDate = new Date(Date.UTC(year, month - 1, 1));
            endDate = new Date(Date.UTC(year, month, 0));
            break;
        case 'quarterly':
            if (!quarter || quarter < 1 || quarter > 4) throw new Error('Invalid quarter for quarterly report.');
            const startMonth = (quarter - 1) * 3;
            startDate = new Date(Date.UTC(year, startMonth, 1));
            endDate = new Date(Date.UTC(year, startMonth + 3, 0));
            break;
        case 'yearly':
            startDate = new Date(Date.UTC(year, 0, 1));
            endDate = new Date(Date.UTC(year, 11, 31));
            break;
        default:
            throw new Error('Invalid report type.');
    }
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

// Вспомогательная функция для агрегации данных (если она здесь)
async function aggregateReportData(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory = {};
    const expenseByCategory = {};

    for (const t of transactions) {
        const amount = parseFloat(t.amount);
        const categoryName = t.category_name || 'Uncategorized';

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
        transactions: transactions
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
            console.log(`[ReportController] Generating report for user ${userId}, type: ${type}, period: ${startDate} to ${endDate}`);

            const transactions = await TransactionModel.getTransactionsForReport(userId, startDate, endDate);
            
            if (!transactions || transactions.length === 0) { // Добавлена проверка на transactions.length === 0
                 console.log(`No transactions found for user ${userId} in period ${startDate} to ${endDate}`);
                 return res.json({ 
                    message: `No data for ${type} report, year ${year}`, 
                    period: { startDate, endDate },
                    data: {
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
            console.error('[ReportController] Error generating report data:', error);
            if (error.message.startsWith('Invalid')) {
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
            console.log(`[ReportController] Exporting transactions for user ${userId}, type: ${type}, period: ${startDate} to ${endDate}`);

            const transactions = await TransactionModel.getTransactionsForReport(userId, startDate, endDate);
            
            let csvString = "";
            csvString += "Date,Type,Category,Description,Amount\n";

            if (!transactions || transactions.length === 0) {
                console.log('[ReportController] No transactions to export for the selected period.');
            } else {
                transactions.forEach(t => {
                    const description = t.description ? `"${t.description.replace(/"/g, '""')}"` : '';
                    let formattedDate;
                    if (t.date instanceof Date) {
                        formattedDate = t.date.toISOString().split('T')[0];
                    } else if (typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t.date)) {
                        formattedDate = t.date.split('T')[0];
                    } else {
                        try {
                             formattedDate = new Date(t.date).toISOString().split('T')[0];
                        } catch (e) {
                            console.warn(`Could not format date for export: ${t.date}, using original or empty.`);
                            formattedDate = t.date || '';
                        }
                    }
                    const categoryName = t.category_name || 'Uncategorized';
                    const amount = parseFloat(t.amount).toFixed(2);
                    csvString += `${formattedDate},${t.type},"${categoryName.replace(/"/g, '""')}",${description},${amount}\n`;
                });
            }

            let filename = `transactions-report-${type}-${year}`;
            if (month) filename += `-${String(month).padStart(2, '0')}`;
            if (quarter) filename += `-Q${quarter}`;
            filename += '.csv';

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
            res.status(200).send('\ufeff' + csvString);

        } catch (error) {
            console.error('[ReportController] Error exporting report to CSV:', error);
            if (error.message.startsWith('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to export report.' });
        }
    }
}

module.exports = ReportController; // Не забудь это!