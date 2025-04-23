import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService';

const IncomeExpenseRatio = ({ dateRange }) => {
  const [ratio, setRatio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsService.getIncomeExpenseRatio(dateRange)
      .then(res => {
        setRatio(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить соотношение доходов и расходов');
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!ratio) return null;

  return (
    <div>
      <h5>Соотношение доходов к расходам</h5>
      <div>
        Доходы: <b>{(ratio.total_income ?? 0).toLocaleString()} ₽</b><br />
        Расходы: <b>{(ratio.total_expense ?? 0).toLocaleString()} ₽</b><br />
        {ratio.ratio !== undefined && isFinite(ratio.ratio) && ratio.total_expense > 0 ? (
          <span>
            Соотношение: <b>{ratio.ratio.toFixed(2)}</b>
          </span>
        ) : (
          <span>Соотношение: <b>-</b></span>
        )}
      </div>
    </div>
  );
};

export default IncomeExpenseRatio;