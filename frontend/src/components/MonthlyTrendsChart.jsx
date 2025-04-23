import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import analyticsService from '../services/analyticsService';

// Регистрируем нужные компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MonthlyTrendsChart = ({ months = 6 }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getMonthlyTrends(months);
        const trends = response.data;
        
        // Подготавливаем данные для графика
        const labels = trends.map(item => item.month_name);
        const incomeData = trends.map(item => parseFloat(item.income));
        const expenseData = trends.map(item => parseFloat(item.expense));
        const savingsData = trends.map(item => parseFloat(item.savings));
        
        setChartData({
          labels,
          datasets: [
            {
              label: 'Доходы',
              data: incomeData,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1
            },
            {
              label: 'Расходы',
              data: expenseData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.1
            },
            {
              label: 'Сбережения',
              data: savingsData,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.1
            }
          ]
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching monthly trends:', err);
        setError('Не удалось загрузить данные по месячным трендам');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [months]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value.toLocaleString() + ' ₽';
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value.toLocaleString()} ₽`;
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
  
  return (
    <div style={{ height: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MonthlyTrendsChart;