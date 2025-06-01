const Transaction = require('../models/transactionModel');
const Category = require('../models/categoryModel');
const NotificationService = require('../../frontend/src/services/notificationService');

class TransactionController {
  static async createTransaction(req, res) {
    try {
      const { amount, type, categoryId, description, date } = req.body;
      const userId = req.user.id;
  
      if (!amount || !type || !categoryId) {
        return res.status(400).json({ message: 'Требуется указать количество, тип и категорию' });
      }
  
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Типом должен быть либо доход, либо расход' });
      }
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Категория не найдена' });
      }

      const transactionDate = new Date(date); // date из req.body
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Сравниваем с концом сегодняшнего дня

      if (transactionDate > today) {
        return res.status(400).json({ message: 'Дата транзакции не может быть перенесена в будущее.' });
      }
  
      // Создаем транзакцию
      const newTransaction = await Transaction.create({ userId, amount: parseFloat(amount), type, categoryId, description, date });
  
      // Создание уведомления (предполагаем, что NotificationService - это бэкенд сервис)
      // И УБЕДИСЬ, ЧТО ЭТОТ ВЫЗОВ НЕ АСИНХРОННЫЙ БЕЗ AWAIT, ЕСЛИ ОН ВОЗВРАЩАЕТ PROMISE И ВАЖЕН ДЛЯ ОТВЕТА
      try {
          // Замени NotificationService на твой реальный сервис уведомлений на бэкенде
          // Например, NotificationModel.create(...)
          // await NotificationModel.create({
          //   userId: userId,
          //   type: 'transaction_created',
          //   message: `New transaction of ${newTransaction.amount} was added.`,
          //   relatedEntityId: newTransaction.id
          // });
          console.log('Уведомление о транзакции (пока не реализовано полностью или проверь импорт)');
      } catch (notificationError) {
          console.error('Ошибка при создании уведомления о транзакции:', notificationError);
          // Не прерываем основной ответ из-за ошибки уведомления, но логируем
      }
      
      // Отправляем ОДИН ответ клиенту
      return res.status(201).json({ success: true, message: 'Транзакция успешно создана', data: newTransaction });
  
    } catch (error) {
      // Логируем ошибку на сервере
      console.error('Error creating transaction:', error);
      // Отправляем общий ответ об ошибке клиенту
      return res.status(500).json({ success: false, message: 'Ошибка при создании транзакции', error: error.message });
    }
  }

  static async getAllTransactions(req, res) {
    try {
      const userId = req.user.id;
      const transactions = await Transaction.findAll(userId, req.query);
      res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Ошибка при выборке транзакций', error: error.message });
    }
  }

  static async getTransactionById(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const transaction = await Transaction.findById(id, userId);

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Транзакция не найдена' });
      }

      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Транзакция выборки ошибок', error: error.message });
    }
  }

  static async updateTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { amount, type, categoryId, description } = req.body;

      const existingTransaction = await Transaction.findById(id, userId);
      if (!existingTransaction) {
        return res.status(404).json({ success: false, message: 'Транзакция не найдена' });
      }

      if (type && type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Типом должен быть либо доход, либо расход' });
      }

      if (categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Категория не найдена' });
        }
      }

      const updated = await Transaction.update(id, {
        amount: amount ? parseFloat(amount) : existingTransaction.amount,
        type: type || existingTransaction.type,
        categoryId: categoryId || existingTransaction.category_id,
        description: description !== undefined ? description : existingTransaction.description
      }, userId);

      res.status(200).json({ success: true, message: 'Транзакция успешно обновлена', data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Ошибка при обновлении транзакции', error: error.message });
    }
  }

  static async deleteTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const existing = await Transaction.findById(id, userId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      await Transaction.delete(id, userId);
      res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting transaction', error: error.message });
    }
  }

  static async getTransactionSummary(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;

      const dateRange = { startDate, endDate };
      const incomeTotal = await Transaction.getSumByType(userId, 'income', dateRange);
      const expenseTotal = await Transaction.getSumByType(userId, 'expense', dateRange);
      const incomeCategories = await Category.getCategorySummary(userId, 'income', dateRange);
      const expenseCategories = await Category.getCategorySummary(userId, 'expense', dateRange);

      res.status(200).json({
        success: true,
        data: {
          incomeTotal,
          expenseTotal,
          balance: incomeTotal - expenseTotal,
          incomeCategories,
          expenseCategories
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching transaction summary', error: error.message });
    }
  }

  static async getFilteredTransactions(req, res) {
    try {
      const userId = req.user.id;
      const transactions = await Transaction.getTransactionsByFilters(userId, req.body);
      res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching filtered transactions', error: error.message });
    }
  }

  static async getTransactionsByCategory(req, res) {
    try {
      const userId = req.user.id;
      const { categoryId } = req.params;
      const { startDate, endDate } = req.query;

      const transactions = await Transaction.getTransactionsByCategory(userId, categoryId, { startDate, endDate });

      res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching transactions by category', error: error.message });
    }
  }
}

module.exports = TransactionController;