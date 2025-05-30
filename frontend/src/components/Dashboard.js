// Файл: frontend/src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService';
import MonthlyTrendsChart from './MonthlyTrendsChart';
import CategoryAnalyticsChart from './CategoryAnalyticsChart';
import IncomeExpenseRatio from './IncomeExpenseRatio';
import SavingsRate from './SavingsRate';
import RecommendationsList from './RecommendationsList';

export default function Dashboard() {
  // Шаг 1: Вызов всех хуков в начале
  const [user, setUser] = useState(null); // Лучше хранить user в состоянии
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true); // Изначально true, т.к. мы будем загружать данные
  const [error, setError] = useState(null); // Состояние для ошибки

  // useEffect для загрузки данных пользователя (если нужно, и если он не приходит из контекста/Redux)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        // Можно предпринять действия, например, разлогинить пользователя
      }
    }
  }, []);


  // useEffect для загрузки аналитических данных
  useEffect(() => {
    setLoading(true); // Устанавливаем loading в true перед началом запроса
    setError(null);   // Сбрасываем предыдущие ошибки
    
    analyticsService.getDashboardAnalytics()
      .then(res => {
        setDashboardData(res.data);
        // setLoading(false); // Уберем отсюда, так как есть finally
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard analytics:", err);
        setError("Не удалось загрузить аналитику. Пожалуйста, попробуйте позже.");
        // setLoading(false); // И отсюда тоже
      })
      .finally(() => {
        setLoading(false); // Устанавливаем loading в false после завершения запроса (успех или ошибка)
      });
  }, []); // Пустой массив зависимостей, чтобы выполнился один раз при монтировании

  // Шаг 2: Условные возвраты ПОСЛЕ вызова всех хуков
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2em' }}>Загрузка аналитики...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Ошибка: {error}</div>;
  }

  if (!dashboardData) {
    // Это состояние может возникнуть, если запрос завершился, но данные не пришли (хотя catch должен был сработать)
    // Или если начальное состояние dashboardData - null, и загрузка еще не началась (но loading бы это покрыл)
    return <div style={{ textAlign: 'center', padding: '50px' }}>Нет данных для отображения.</div>;
  }

  // Шаг 3: Основной рендер компонента, когда данные загружены
  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>Добро пожаловать, {user?.username || 'Гость'}!</h1> {/* Используем user из состояния */}
      </div>
      <div className="dashboard-content">
        <h2 style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Аналитика</h2>
        
        {dashboardData.monthlyTrends && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h4>Месячные тренды (Доходы, Расходы, Сбережения)</h4>
            <MonthlyTrendsChart data={dashboardData.monthlyTrends} />
          </div>
        )}
        
        {dashboardData.categoryAnalytics && (
          <div style={{ marginBottom: '2.5rem' }}>
             {/* CategoryAnalyticsChart должен сам решать, что рендерить, или принимать 'income' и 'expense' данные */}
            <CategoryAnalyticsChart data={dashboardData.categoryAnalytics} />
          </div>
        )}
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-around', marginBottom: '2.5rem' }}>
          {dashboardData.incomeExpenseRatio && (
            <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
              <IncomeExpenseRatio data={dashboardData.incomeExpenseRatio} />
            </div>
          )}
          
          {dashboardData.savingsRate && (
            <div style={{ flex: '1 1 300px', minWidth: '280px' }}>
              <SavingsRate data={dashboardData.savingsRate} />
            </div>
          )}
        </div>
        
        {dashboardData.recommendations && ( // Исправлено на recommendations
          <div style={{ marginTop: '2rem' }}> {/* Опечатка была reccomendations */}
            <RecommendationsList data={dashboardData.recommendations} />
          </div>
        )}
      </div>
    </div>
  );
}