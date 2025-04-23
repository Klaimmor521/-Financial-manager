import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import analyticsService from '../services/analyticsService';

// Регистрируем нужные компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Генерируем цвета для диаграммы
const generateColors = (count) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 137.5) % 360; // Золотое сечение для хорошего разброса цветов
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  return colors;
};

const CategoryChart = ({ type, dateRange }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 1
    }]
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getCategoryAnalytics(dateRange);
        
        // Выбираем данные в зависимости от типа (доходы или расходы)
        const categories = response.data[type] || [];
        
        // Фильтруем категории с нулевыми суммами
        const filteredCategories = categories.filter(cat => parseFloat(cat.total_amount) > 0);
        
        // Подготавливаем данные для диаграммы
        const labels = filteredCategories.map(cat => cat.category_name);
        const amounts = filteredCategories.map(cat => parseFloat(cat.total_amount));
        const colors = generateColors(filteredCategories.length);
        
        setChartData({
          labels,
          datasets: [{
            data: amounts,
            backgroundColor: colors,
            borderWidth: 1
          }]
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError('Не удалось загрузить данные по категориям');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [type, dateRange]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            return `${context.label}: ${value.toLocaleString()} ₽`;
          }
        }
      }
    }
  };
  
  if (loading) {
    return <div className="text-center my-5">Загрузка данных...</div>;
  }
  
  if (error) {
    return <div className="text-center text-danger my-5">{error}</div>;
  }
  
  if (chartData.labels.length === 0) {
    return (
      <div className="text-center my-5">
        Нет данных по категориям {type === 'income' ? 'доходов' : 'расходов'} за выбранный период
      </div>
    );
  }
  
  return (
    <div style={{ height: '300px' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default CategoryChart;