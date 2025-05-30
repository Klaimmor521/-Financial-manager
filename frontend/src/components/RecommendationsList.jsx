// Файл: frontend/src/components/RecommendationsList.jsx
import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService'; // Убедись, что путь верный

// Можно добавить иконки или цвета для разных типов рекомендаций
const getRecommendationStyle = (type) => {
    switch (type) {
        case 'warning':
            return { color: '#856404', backgroundColor: '#fff3cd', borderColor: '#ffeeba', icon: '⚠️' };
        case 'suggestion':
            return { color: '#0c5460', backgroundColor: '#d1ecf1', borderColor: '#bee5eb', icon: '💡' };
        case 'insight':
            return { color: '#155724', backgroundColor: '#d4edda', borderColor: '#c3e6cb', icon: '📊' };
        case 'positive':
            return { color: '#004085', backgroundColor: '#cce5ff', borderColor: '#b8daff', icon: '👍' };
        default:
            return { color: '#383d41', backgroundColor: '#e2e3e5', borderColor: '#d6d8db', icon: 'ℹ️' };
    }
};

const RecommendationsList = ({ data }) => { // Принимаем data как проп
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Если данные передаются через props, useEffect для загрузки не нужен здесь
  // Если же этот компонент все еще должен сам загружать рекомендации:
  useEffect(() => {
    // Если data передается, используем его
    if (data) {
        setRecommendations(data);
        setLoading(false);
    } else { 
        // Иначе загружаем (если это предусмотрено логикой)
        setLoading(true);
        analyticsService.getRecommendations()
          .then(res => {
            setRecommendations(res.data || []); // Убедимся, что это массив
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching recommendations:", err);
            setError('Не удалось загрузить рекомендации');
            setLoading(false);
          });
    }
  }, [data]); // Зависимость от data

  if (loading) return <div style={{ padding: '15px', textAlign: 'center' }}>Загрузка рекомендаций...</div>;
  if (error) return <div className="text-danger" style={{ color: 'red', padding: '15px' }}>{error}</div>;
  if (!recommendations || recommendations.length === 0) {
    return <div style={{ padding: '15px', textAlign: 'center', color: '#777' }}>Пока нет персональных рекомендаций.</div>;
  }

  return (
    <div className="recommendations-widget" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
      <h5 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Персональные рекомендации</h5>
      <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
        {recommendations.map((rec) => {
          // Убираем старую жесткую фильтрацию, так как бэкенд теперь умнее.
          // Можно добавить более гибкую фильтрацию здесь, если очень нужно,
          // но лучше, если бэкенд отдает уже релевантный набор.
          
          const styleProps = getRecommendationStyle(rec.type);

          return (
            <li 
              key={rec.id || rec.title} // Используем rec.id, который мы добавили на бэкенде, или title как fallback
              style={{ 
                marginBottom: '12px', 
                padding: '12px', 
                borderRadius: '6px', 
                backgroundColor: styleProps.backgroundColor,
                border: `1px solid ${styleProps.borderColor}`,
                color: styleProps.color,
                fontSize: '0.95em'
              }}
            >
              <strong style={{ display: 'block', marginBottom: '5px', fontSize: '1.05em' }}>
                {styleProps.icon} {rec.title}
              </strong>
              {rec.message}
              {/* Можно добавить детали, если они есть */}
              {rec.details && (
                <div style={{ fontSize: '0.85em', marginTop: '5px', opacity: 0.8 }}>
                    Детали: {rec.details.description ? `Описание: ${rec.details.description}, ` : ''}
                    Дата: {rec.details.date}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecommendationsList;