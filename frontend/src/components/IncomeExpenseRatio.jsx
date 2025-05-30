// Файл: frontend/src/components/IncomeExpenseRatio.jsx
import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService'; // Убедись, что путь верный

const IncomeExpenseRatio = ({ dateRange }) => {
  const [data, setData] = useState(null); // Переименовали ratio в data для ясности
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    analyticsService.getIncomeExpenseRatio(dateRange)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching income/expense ratio:", err);
        setError('Не удалось загрузить данные о доходах и расходах');
        setLoading(false);
      });
  }, [dateRange]); // dateRange должен быть стабильным объектом или сериализованной строкой,
                  // иначе useEffect будет срабатывать на каждый рендер, если dateRange создается заново.
                  // Для простоты пока оставим так, но в сложных случаях это оптимизируют.

  if (loading) return <div>Загрузка соотношения...</div>;
  if (error) return <div className="text-danger" style={{color: 'red'}}>{error}</div>;
  if (!data) return <div>Нет данных для отображения.</div>;

  return (
    <div className="income-expense-ratio-widget" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
      <h5 style={{marginBottom: '10px'}}>Баланс доходов и расходов</h5>
      <p>Общий доход: <strong style={{color: 'green'}}>{(data.income || 0).toLocaleString()} ₽</strong></p>
      <p>Общий расход: <strong style={{color: 'red'}}>{(data.expense || 0).toLocaleString()} ₽</strong></p>
      <p>Чистый баланс: 
        <strong style={{ color: data.difference >= 0 ? 'green' : 'red' }}>
          {(data.difference || 0).toLocaleString()} ₽
        </strong>
      </p>
      {data.ratioDescription && <p><i>{data.ratioDescription}</i></p>}
    </div>
  );
};

export default IncomeExpenseRatio;