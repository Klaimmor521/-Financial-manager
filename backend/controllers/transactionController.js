const Transaction = require('../models/transactionModel');
const Category = require('../models/categoryModel');

class TransactionController {
  static async createTransaction(req, res) {
    try {
      const { amount, type, categoryId, description, date } = req.body;
      const userId = req.user.id;

      if (!amount || !type || !categoryId) {
        return res.status(400).json({ message: 'Amount, type and category are required' });
      }

      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Type must be either income or expense' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const transaction = await Transaction.create({ userId, amount: parseFloat(amount), type, categoryId, description, date });

      res.status(201).json({ success: true, message: 'Transaction created successfully', data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating transaction', error: error.message });
    }
  }

  static async getAllTransactions(req, res) {
    try {
      const userId = req.user.id;
      const transactions = await Transaction.findAll(userId, req.query);
      res.status(200).json({ success: true, count: transactions.length, data: transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching transactions', error: error.message });
    }
  }

  static async getTransactionById(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const transaction = await Transaction.findById(id, userId);

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching transaction', error: error.message });
    }
  }

  static async updateTransaction(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { amount, type, categoryId, description } = req.body;

      const existingTransaction = await Transaction.findById(id, userId);
      if (!existingTransaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (type && type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Type must be either income or expense' });
      }

      if (categoryId) {
        const category = await Category.findById(categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }
      }

      const updated = await Transaction.update(id, {
        amount: amount ? parseFloat(amount) : existingTransaction.amount,
        type: type || existingTransaction.type,
        categoryId: categoryId || existingTransaction.category_id,
        description: description !== undefined ? description : existingTransaction.description
      }, userId);

      res.status(200).json({ success: true, message: 'Transaction updated successfully', data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating transaction', error: error.message });
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