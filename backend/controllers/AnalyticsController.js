const AnalyticsModel = require('../models/analyticsModel');

class AnalyticsController 
{
  // Получить аналитику по категориям
  static async getCategoryAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);
      
      const analytics = await AnalyticsModel.getCategoryAnalytics(userId, dateRange);
      
      return res.status(200).json(analytics);
    } catch (error) {
      console.error('Error getting category analytics:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Получить месячные тренды
  static async getMonthlyTrends(req, res) {
    try {
      const userId = req.user.id;
      const { months } = req.query;
      
      const monthsCount = months ? parseInt(months) : 6;
      
      const trends = await AnalyticsModel.getMonthlyTrends(userId, monthsCount);
      
      return res.status(200).json(trends);
    } catch (error) {
      console.error('Error getting monthly trends:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Получить соотношение доходов к расходам
  static async getIncomeExpenseRatio(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);
      
      const ratio = await AnalyticsModel.getIncomeExpenseRatio(userId, dateRange);
      
      return res.status(200).json(ratio);
    } catch (error) {
      console.error('Error getting income expense ratio:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Получить норму сбережений
  static async getSavingsRate(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);
      
      const savingsRate = await AnalyticsModel.getSavingsRate(userId, dateRange);
      
      return res.status(200).json(savingsRate);
    } catch (error) {
      console.error('Error getting savings rate:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Генерация рекомендаций
  static async generateRecommendations(req, res) {
    try {
      const userId = req.user.id;
      
      const recommendations = await AnalyticsModel.generateRecommendations(userId);
      
      return res.status(200).json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
  
  // Получить общую аналитику (комбинация всех методов)
  static async getDashboardAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Данные за последние 3 месяца для некоторых метрик
      const dateRange = { startDate, endDate };
  
      console.log(`[AnalyticsController] Fetching dashboard analytics for user: ${userId}`);
  
      // --- ВОЗВРАЩАЕМ Promise.all ---
      const [
        categoryAnalytics,
        monthlyTrends,
        incomeExpenseRatio,
        savingsRate,
        recommendations
      ] = await Promise.all([
        AnalyticsModel.getCategoryAnalytics(userId, dateRange),      // Аналитика по категориям за 3 мес
        AnalyticsModel.getMonthlyTrends(userId, 6),                 // Тренды за 6 месяцев
        AnalyticsModel.getIncomeExpenseRatio(userId, dateRange),    // Соотношение Д/Р за 3 мес
        AnalyticsModel.getSavingsRate(userId, dateRange),           // Норма сбережений за 3 мес
        AnalyticsModel.generateRecommendations(userId)              // Рекомендации (внутри логика по периодам)
      ]);
      
      console.log("[AnalyticsController] All dashboard data fetched successfully.");

      return res.status(200).json({ // Возвращаем все данные
        categoryAnalytics,
        monthlyTrends,
        incomeExpenseRatio,
        savingsRate,
        recommendations // Убедись, что ключ 'recommendations' (не 'reccomendations')
      });
      
    } catch (error) {
      console.error('[AnalyticsController] Error getting dashboard analytics:', error);
      return res.status(500).json({ message: 'Internal server error in AnalyticsController' });
    }
  }
}

module.exports = AnalyticsController;

function generateRecommendations(transactions, categories, totalExpense) {
  const recommendations = [];

  // Example: Large expense threshold
  const LARGE_EXPENSE_THRESHOLD = 1000; // You can adjust this value

  // 1. Category budget warning
  categories.forEach(cat => {
    if (cat.total_amount && totalExpense > 0) {
      const percent = (cat.total_amount / totalExpense) * 100;
      if (percent > 70 && cat.total_amount > LARGE_EXPENSE_THRESHOLD) {
        recommendations.push({
          type: 'category_budget',
          message: `Вы тратите ${percent.toFixed(1)}% бюджета на категорию "${cat.category_name}". Попробуйте оптимизировать эти расходы.`
        });
      }
    }
  });

  // 2. Large single expense warning
  transactions.forEach(tx => {
    if (tx.amount > LARGE_EXPENSE_THRESHOLD) {
      recommendations.push({
        type: 'large_expense',
        message: `У вас был крупный расход в категории "${tx.category_name}" на сумму ${tx.amount.toLocaleString()}`
      });
    }
  });

  return recommendations;
}
