const { pool } = require('../config/database');

class AnalyticsModel 
{
  // Получить аналитику по категориям за определенный период
  static async getCategoryAnalytics(userId, dateRange = {}) 
  {
    const { startDate, endDate } = dateRange;
    
    let query = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.type as category_type,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
        AND t.user_id = $1
        ${startDate ? 'AND t.created_at >= $2' : ''}
        ${endDate ? `AND t.created_at <= $${startDate ? '3' : '2'}` : ''}
      WHERE (c.user_id = $1 OR c.user_id IS NULL)
      GROUP BY c.id, c.name, c.icon, c.type
      ORDER BY total_amount DESC
    `;
    
    const params = [userId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);
    
    const result = await pool.query(query, params);
    
    // Группировка результатов по типу категории (доход/расход)
    const grouped = {
      income: result.rows.filter(row => row.category_type === 'income'),
      expense: result.rows.filter(row => row.category_type === 'expense')
    };
    
    return grouped;
  }
  
  // Получить месячные тренды
  static async getMonthlyTrends(userId, monthsCount = 6) 
  {
    const query = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - interval '${monthsCount - 1} months'),
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) AS month
      ),
      monthly_income AS (
        SELECT 
          date_trunc('month', created_at) AS month,
          COALESCE(SUM(amount), 0) AS income
        FROM transactions
        WHERE user_id = $1 AND type = 'income'
        GROUP BY month
      ),
      monthly_expense AS (
        SELECT 
          date_trunc('month', created_at) AS month,
          COALESCE(SUM(amount), 0) AS expense
        FROM transactions
        WHERE user_id = $1 AND type = 'expense'
        GROUP BY month
      )
      SELECT 
        to_char(m.month, 'Mon YYYY') AS month_name,
        m.month AS month_date,
        COALESCE(mi.income, 0) AS income,
        COALESCE(me.expense, 0) AS expense,
        COALESCE(mi.income, 0) - COALESCE(me.expense, 0) AS savings
      FROM months m
      LEFT JOIN monthly_income mi ON m.month = mi.month
      LEFT JOIN monthly_expense me ON m.month = me.month
      ORDER BY m.month
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  // Получить соотношение доходов к расходам
  static async getIncomeExpenseRatio(userId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    let incomeSumQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM transactions
      WHERE user_id = $1 AND type = 'income'
      ${startDate ? 'AND created_at >= $2' : ''}
      ${endDate ? `AND created_at <= $${startDate ? '3' : '2'}` : ''}
    `;
    
    let expenseSumQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expense
      FROM transactions
      WHERE user_id = $1 AND type = 'expense'
      ${startDate ? 'AND created_at >= $2' : ''}
      ${endDate ? `AND created_at <= $${startDate ? '3' : '2'}` : ''}
    `;
    
    const params = [userId];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);
    
    const incomeResult = await pool.query(incomeSumQuery, params);
    const expenseResult = await pool.query(expenseSumQuery, params);
    
    const totalIncome = parseFloat(incomeResult.rows[0].total_income);
    const totalExpense = parseFloat(expenseResult.rows[0].total_expense);
    
    // Вычисляем соотношение (если расходов нет, чтобы избежать деления на ноль)
    const ratio = totalExpense === 0 ? 
      totalIncome > 0 ? Infinity : 0 : 
      totalIncome / totalExpense;
    
    return {
      income: totalIncome,
      expense: totalExpense,
      ratio,
      difference: totalIncome - totalExpense
    };
  }
  
  // Получить норму сбережений (сбережения / доходы)
  static async getSavingsRate(userId, dateRange = {}) {
    const { startDate, endDate } = dateRange;
    
    const result = await this.getIncomeExpenseRatio(userId, dateRange);
    const { income, expense, difference } = result;
    
    // Вычисляем норму сбережений (если доходов нет, чтобы избежать деления на ноль)
    const savingsRate = income === 0 ? 0 : (difference / income) * 100;
    
    return {
      income,
      expense,
      savings: difference,
      savingsRate
    };
  }
  
  // Генерация рекомендаций на основе анализа трат
  static async generateRecommendations(userId) {
    // Получаем данные о категориях расходов за последние 3 месяца
    const dateRange = {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
      endDate: new Date()
    };
    
    const categoryData = await this.getCategoryAnalytics(userId, dateRange);
    const ratioData = await this.getIncomeExpenseRatio(userId, dateRange);
    const savingsData = await this.getSavingsRate(userId, dateRange);
    
    // Анализируем данные и формируем рекомендации
    const recommendations = [];
    
    // 1. Проверяем общее соотношение доходов к расходам
    if (ratioData.ratio < 1) {
      recommendations.push({
        type: 'warning',
        message: 'Ваши расходы превышают доходы. Рекомендуем пересмотреть бюджет.',
        metric: 'income_expense_ratio',
        value: ratioData.ratio
      });
    }
    
    // 2. Проверяем норму сбережений
    if (savingsData.savingsRate < 10) {
      recommendations.push({
        type: 'suggestion',
        message: 'Ваша норма сбережений ниже рекомендуемых 10%. Попробуйте сократить необязательные расходы.',
        metric: 'savings_rate',
        value: savingsData.savingsRate
      });
    }
    
    // 3. Анализируем расходы по категориям
    const expenseCategories = categoryData.expense.filter(c => c.total_amount > 0);
    
    // Если у нас есть категории с расходами
    if (expenseCategories.length > 0) {
      // Считаем общую сумму расходов
      const totalExpense = expenseCategories.reduce((sum, cat) => sum + parseFloat(cat.total_amount), 0);
      
      // Находим категории с высокой долей расходов (более 30% от общих расходов)
      const highExpenseCategories = expenseCategories.filter(cat => 
        (parseFloat(cat.total_amount) / totalExpense) > 0.3
      );
      
      highExpenseCategories.forEach(cat => {
        const percentage = (parseFloat(cat.total_amount) / totalExpense * 100).toFixed(1);
        recommendations.push({
          type: 'insight',
          message: `Вы тратите ${percentage}% бюджета на категорию "${cat.category_name}". Попробуйте оптимизировать эти расходы.`,
          metric: 'category_percentage',
          category: cat.category_name,
          value: parseFloat(percentage)
        });
      });
    }
    
    // 4. Проверяем, есть ли нерегулярные крупные расходы
    const query = `
      SELECT 
        t.amount,
        t.created_at,
        c.name as category_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = 'expense'
        AND t.created_at >= $2
      ORDER BY t.amount DESC
      LIMIT 3
    `;
    
    const largeExpenses = await pool.query(query, [userId, dateRange.startDate]);
    
    // Получаем среднемесячные расходы
    const avgMonthlyExpense = ratioData.expense / 3; // За 3 месяца
    
    // Проверяем, есть ли крупные расходы (более 15% от среднемесячных расходов)
    largeExpenses.rows.forEach(expense => {
      if (parseFloat(expense.amount) > (avgMonthlyExpense * 0.15)) {
        const percentage = (parseFloat(expense.amount) / avgMonthlyExpense * 100).toFixed(1);
        recommendations.push({
          type: 'insight',
          message: `У вас был крупный расход в категории "${expense.category_name}" на сумму ${expense.amount}`,
          metric: 'large_expense',
          value: parseFloat(expense.amount)
        });
      }
    });
    
    return recommendations;
  }
}

module.exports = AnalyticsModel;