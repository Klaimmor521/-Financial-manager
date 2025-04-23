import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService';

const SavingsRate = ({ dateRange }) => {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsService.getSavingsRate(dateRange)
      .then(res => {
        setRate(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить норму сбережений');
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!rate) return null;

  return (
    <div>
      <h5>Норма сбережений</h5>
      <div>
        Сбережения: <b>{(rate.savings ?? 0).toLocaleString()} ₽</b><br />
        Доходы: <b>{(rate.income ?? 0).toLocaleString()} ₽</b><br />
        {rate.savingsRate !== undefined && isFinite(rate.savingsRate) && rate.income > 0 ? (
          <span>Норма сбережений: <b>{rate.savingsRate.toFixed(2)}%</b></span>
        ) : (
          <span>Норма сбережений: <b>-</b></span>
        )}
      </div>
    </div>
  );
};

export default SavingsRate;