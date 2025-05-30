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
    
    // Формируем параметры для запросов
    const params = [userId];
    let dateParamIndex = 2; // Начинаем нумерацию параметров для дат с $2
    
    let incomeSumQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM transactions
      WHERE user_id = $1 AND type = 'income'
    `;
    if (startDate) {
        incomeSumQuery += ` AND created_at >= $${dateParamIndex}`;
        params.push(startDate); // Добавляем startDate в общий массив params
        dateParamIndex++;
    }
    if (endDate) {
        incomeSumQuery += ` AND created_at <= $${dateParamIndex}`;
        // Если startDate тоже был, то params уже содержит его.
        // Если startDate не было, то params будет [userId, endDate]
        // Поэтому нужно добавлять endDate в params только если он еще не там
        // Проще всего - строить массив params параллельно с запросом
        if (params.length < dateParamIndex) params.push(endDate); 
        else if (params.length === dateParamIndex && !params.includes(endDate)) params.push(endDate);
        // Более простой способ - создать отдельный массив params для каждого запроса или передавать их по-разному
    }

    // Пересоздаем params для expense_query, чтобы индексы были правильными
    const expenseParams = [userId];
    let expenseDateParamIndex = 2;
    let expenseSumQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expense
      FROM transactions
      WHERE user_id = $1 AND type = 'expense'
    `;
    if (startDate) {
        expenseSumQuery += ` AND created_at >= $${expenseDateParamIndex}`;
        expenseParams.push(startDate);
        expenseDateParamIndex++;
    }
    if (endDate) {
        expenseSumQuery += ` AND created_at <= $${expenseDateParamIndex}`;
        expenseParams.push(endDate);
    }
    
    console.log('[AnalyticsModel] getIncomeExpenseRatio - Income Query:', incomeSumQuery, 'Params:', params.slice(0, dateParamIndex)); // Лог для income
    console.log('[AnalyticsModel] getIncomeExpenseRatio - Expense Query:', expenseSumQuery, 'Params:', expenseParams); // Лог для expense

    try {
      // Выполняем запросы
      const incomeResult = await pool.query(incomeSumQuery, params.slice(0, dateParamIndex)); // Используем только нужные параметры для этого запроса
      const expenseResult = await pool.query(expenseSumQuery, expenseParams);
      
      const totalIncome = parseFloat(incomeResult.rows[0].total_income);
      const totalExpense = parseFloat(expenseResult.rows[0].total_expense);
      
      let ratioDescription = "Не определено";
      let ratioValue = null;

      if (totalExpense > 0) {
          ratioValue = totalIncome / totalExpense;
          if (ratioValue >= 1) {
              ratioDescription = `Доходы покрывают расходы (в ${ratioValue.toFixed(2)} раз)`;
          } else {
              ratioDescription = `Расходы превышают доходы (доходы составляют ${ (ratioValue * 100).toFixed(1) }% от расходов)`;
          }
      } else if (totalIncome > 0 && totalExpense === 0) {
          ratioValue = Infinity;
          ratioDescription = "Все доходы сохранены (расходов нет)";
      } else { 
          ratioValue = 0; 
          ratioDescription = "Нет данных о доходах и расходах";
      }
      
      return {
        income: totalIncome,
        expense: totalExpense,
        ratio: ratioValue, 
        ratioDescription: ratioDescription, 
        difference: parseFloat((totalIncome - totalExpense).toFixed(2))
      };
    } catch (dbError) {
      console.error('[AnalyticsModel] DB Error in getIncomeExpenseRatio:', dbError);
      throw dbError; // Перебрасываем ошибку выше
    }
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
    const recommendations = [];
    const currentDate = new Date();
    
    // --- Периоды для анализа ---
    // Последний полный месяц
    const lastMonthEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // Последний день предыдущего месяца
    const lastMonthStartDate = new Date(lastMonthEndDate.getFullYear(), lastMonthEndDate.getMonth(), 1); // Первый день предыдущего месяца

    // Текущий месяц (с начала до текущей даты)
    const currentMonthStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Последние 3 месяца (для среднего)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsRange = { startDate: threeMonthsAgo, endDate: currentDate };


    // --- Получение данных ---
    const [
      categoryAnalyticsLast3Months, // Для анализа структуры расходов
      incomeExpenseRatioLastMonth,  // Для анализа баланса за прошлый месяц
      savingsRateLastMonth,         // Для анализа сбережений за прошлый месяц
      allTransactionsLast3Months    // Для поиска крупных и нерегулярных трат
    ] = await Promise.all([
      this.getCategoryAnalytics(userId, threeMonthsRange), // Берем категории за 3 месяца для стабильности
      this.getIncomeExpenseRatio(userId, { startDate: lastMonthStartDate, endDate: lastMonthEndDate }),
      this.getSavingsRate(userId, { startDate: lastMonthStartDate, endDate: lastMonthEndDate }),
      pool.query( // Прямой запрос для всех транзакций, чтобы не вызывать getCategoryAnalytics снова
        `SELECT t.amount, t.type, t.created_at, t.description, c.name as category_name, c.id as category_id
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1 AND t.created_at >= $2 AND t.created_at <= $3
         ORDER BY t.created_at DESC`,
        [userId, threeMonthsRange.startDate, threeMonthsRange.endDate]
      )
    ]);
    
    const transactions = allTransactionsLast3Months.rows;

    // --- Логика Рекомендаций ---

    // 1. Баланс доходов и расходов за прошлый полный месяц
    if (incomeExpenseRatioLastMonth.income > 0) { // Если были доходы
        if (incomeExpenseRatioLastMonth.expense > incomeExpenseRatioLastMonth.income) {
            recommendations.push({
                id: 'expense_exceeds_income',
                type: 'warning',
                title: 'Расходы превышают доходы!',
                message: `За прошлый месяц ваши расходы (${incomeExpenseRatioLastMonth.expense.toFixed(2)}) превысили доходы (${incomeExpenseRatioLastMonth.income.toFixed(2)}). Рекомендуем пересмотреть ваш бюджет и найти возможности для сокращения трат.`,
                metric: 'income_expense_balance',
                value: incomeExpenseRatioLastMonth.difference.toFixed(2)
            });
        } else if (incomeExpenseRatioLastMonth.expense > incomeExpenseRatioLastMonth.income * 0.9) { // Расходы > 90% доходов
             recommendations.push({
                id: 'high_expense_ratio',
                type: 'suggestion',
                title: 'Высокая доля расходов',
                message: `Ваши расходы за прошлый месяц составили более 90% от доходов. Это оставляет мало пространства для сбережений. Попробуйте проанализировать траты.`,
                metric: 'income_expense_ratio',
                value: (incomeExpenseRatioLastMonth.expense / incomeExpenseRatioLastMonth.income).toFixed(2)
            });
        }
    } else if (incomeExpenseRatioLastMonth.expense > 0) { // Доходов не было, но были расходы
        recommendations.push({
            id: 'expenses_with_no_income',
            type: 'warning',
            title: 'Расходы без доходов',
            message: `За прошлый месяц у вас были расходы (${incomeExpenseRatioLastMonth.expense.toFixed(2)}), но не зафиксировано доходов. Убедитесь, что все доходы учтены.`,
            metric: 'income_expense_balance',
            value: -incomeExpenseRatioLastMonth.expense.toFixed(2)
        });
    }


    // 2. Норма сбережений за прошлый полный месяц
    if (savingsRateLastMonth.income > 0) { // Анализируем, только если были доходы
        if (savingsRateLastMonth.savingsRate < 5) {
            recommendations.push({
                id: 'low_savings_rate',
                type: 'warning',
                title: 'Низкая норма сбережений',
                message: `Ваша норма сбережений за прошлый месяц составила всего ${savingsRateLastMonth.savingsRate.toFixed(1)}%. Рекомендуется откладывать хотя бы 10-20% от доходов.`,
                metric: 'savings_rate',
                value: savingsRateLastMonth.savingsRate.toFixed(1)
            });
        } else if (savingsRateLastMonth.savingsRate < 10) {
            recommendations.push({
                id: 'moderate_savings_rate',
                type: 'suggestion',
                title: 'Увеличьте норму сбережений',
                message: `Норма сбережений за прошлый месяц (${savingsRateLastMonth.savingsRate.toFixed(1)}%) может быть улучшена. Попробуйте найти способы увеличить сбережения.`,
                metric: 'savings_rate',
                value: savingsRateLastMonth.savingsRate.toFixed(1)
            });
        } else if (savingsRateLastMonth.savingsRate >= 20) {
             recommendations.push({
                id: 'good_savings_rate',
                type: 'positive',
                title: 'Отличная норма сбережений!',
                message: `Поздравляем! Ваша норма сбережений за прошлый месяц (${savingsRateLastMonth.savingsRate.toFixed(1)}%) на высоком уровне. Продолжайте в том же духе!`,
                metric: 'savings_rate',
                value: savingsRateLastMonth.savingsRate.toFixed(1)
            });
        }
    }

    // 3. Анализ расходов по категориям (на основе данных за последние 3 месяца)
    const expenseCategories = categoryAnalyticsLast3Months.expense.filter(c => parseFloat(c.total_amount) > 0);
    const totalExpensesLast3Months = expenseCategories.reduce((sum, cat) => sum + parseFloat(cat.total_amount), 0);

    if (totalExpensesLast3Months > 0) {
        expenseCategories.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount)); // Сортируем по убыванию трат

        // Топ-3 категории расходов
        expenseCategories.slice(0, 3).forEach(cat => {
            const percentage = (parseFloat(cat.total_amount) / totalExpensesLast3Months * 100);
            if (percentage > 15) { // Если категория составляет более 15% от всех расходов
                 recommendations.push({
                    id: `high_spend_${cat.category_id}`,
                    type: 'insight',
                    title: `Значительные траты: ${cat.category_name}`,
                    message: `За последние 3 месяца вы потратили ${parseFloat(cat.total_amount).toFixed(2)} (${percentage.toFixed(1)}%) на категорию "${cat.category_name}". Проанализируйте, можно ли оптимизировать эти расходы.`,
                    metric: 'category_spending_share',
                    category: cat.category_name,
                    value: percentage.toFixed(1)
                });
            }
        });
    }
    
    // 4. Поиск необычно крупных трат за последние 3 месяца
    // Среднемесячный доход за последние 3 месяца
    const avgMonthlyIncomeLast3Months = (await this.getIncomeExpenseRatio(userId, threeMonthsRange)).income / 3;

    if (avgMonthlyIncomeLast3Months > 0) {
        const significantExpenseThreshold = avgMonthlyIncomeLast3Months * 0.25; // Например, 25% от среднемесячного дохода - это крупная трата

        const largeSingleExpenses = transactions.filter(
            t => t.type === 'expense' && parseFloat(t.amount) > significantExpenseThreshold
        ).sort((a,b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0,2); // Топ-2 самых крупных

        largeSingleExpenses.forEach(expense => {
            recommendations.push({
                id: `large_single_expense_${new Date(expense.created_at).getTime()}`, // Уникальный ID на основе времени
                type: 'insight',
                title: 'Зафиксирована крупная трата',
                message: `Обратите внимание на крупный расход ${parseFloat(expense.amount).toFixed(2)} в категории "${expense.category_name || 'Без категории'}" (${new Date(expense.created_at).toLocaleDateString()}). Планировали ли вы его?`,
                metric: 'large_single_expense',
                value: parseFloat(expense.amount).toFixed(2),
                details: { date: new Date(expense.created_at).toLocaleDateString(), description: expense.description }
            });
        });
    }

    // 5. Проверка на наличие подписок или регулярных платежей (очень упрощенно)
    // Ищем одинаковые суммы в одной и той же категории расходов в разные месяцы
    const potentialSubscriptions = {};
    transactions
        .filter(t => t.type === 'expense' && t.category_id)
        .forEach(t => {
            const key = `${t.category_id}_${parseFloat(t.amount).toFixed(2)}`;
            const monthYear = `${new Date(t.created_at).getFullYear()}-${new Date(t.created_at).getMonth()}`;
            if (!potentialSubscriptions[key]) {
                potentialSubscriptions[key] = { count: 0, months: new Set(), category_name: t.category_name, amount: parseFloat(t.amount).toFixed(2) };
            }
            if (!potentialSubscriptions[key].months.has(monthYear)) {
                 potentialSubscriptions[key].count++;
                 potentialSubscriptions[key].months.add(monthYear);
            }
        });
    
    for (const key in potentialSubscriptions) {
        if (potentialSubscriptions[key].count >= 2) { // Если нашли хотя бы 2 таких платежа в разные месяцы
            recommendations.push({
                id: `subscription_check_${key.replace(/[^a-zA-Z0-9]/g, '')}`,
                type: 'suggestion',
                title: 'Проверьте подписки/регулярные платежи',
                message: `Возможно, у вас есть регулярный платеж или подписка в категории "${potentialSubscriptions[key].category_name}" на сумму ${potentialSubscriptions[key].amount}. Актуальны ли эти траты?`,
                metric: 'potential_subscription',
                value: potentialSubscriptions[key].amount
            });
        }
    }
    
    // Если рекомендаций нет, дадим одну позитивную или общую
    if (recommendations.length === 0) {
        recommendations.push({
            id: 'all_good',
            type: 'positive',
            title: 'Все под контролем!',
            message: 'Ваши финансы выглядят сбалансированными за проанализированный период. Продолжайте следить за бюджетом!',
            metric: 'general_status',
            value: 'good'
        });
    }

    // Ограничим количество рекомендаций, чтобы не перегружать пользователя
    return recommendations.slice(0, 5); // Например, не более 5 рекомендаций
  }
}

module.exports = AnalyticsModel;