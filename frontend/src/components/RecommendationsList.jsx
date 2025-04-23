import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService';
const LARGE_EXPENSE_THRESHOLD = 1000;
const RecommendationsList = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsService.getRecommendations()
      .then(res => {
        setRecommendations(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Не удалось загрузить рекомендации');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!recommendations.length) return <div>Нет рекомендаций</div>;

  return (
    <div>
      <h5>Рекомендации</h5>
      <ul>
        {recommendations
          .filter(rec => {
            // Filter out "large expense" if value is not large
            if (rec.type === 'large_expense' && rec.value < LARGE_EXPENSE_THRESHOLD) return false;
            // Filter out 100% warnings for small totals
            if (rec.type === 'category_budget' && rec.value < LARGE_EXPENSE_THRESHOLD) return false;
            return true;
          })
          .map((rec, idx) => (
            <li key={idx}>
              {typeof rec === 'object' && rec !== null ? rec.message : rec}
            </li>
          ))}
      </ul>
    </div>
  );
};

export default RecommendationsList;