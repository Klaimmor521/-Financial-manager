import React, { useEffect, useState } from 'react';
import analyticsService from '../services/analyticsService';
import MonthlyTrendsChart from './MonthlyTrendsChart';
// Import or create these components as needed:
import CategoryAnalyticsChart from './CategoryAnalyticsChart';
import IncomeExpenseRatio from './IncomeExpenseRatio';
import SavingsRate from './SavingsRate';
import RecommendationsList from './RecommendationsList';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getDashboardAnalytics()
      .then(res => {
        setDashboardData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (!dashboardData) return <div>Failed to load analytics.</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {user?.username}!</h1>
      </div>
      <div className="dashboard-content">
        <h2>Аналитика</h2>
        <div style={{ marginBottom: '2rem' }}>
          <MonthlyTrendsChart data={dashboardData.monthlyTrends} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <CategoryAnalyticsChart data={dashboardData.categoryAnalytics} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <IncomeExpenseRatio data={dashboardData.incomeExpenseRatio} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <SavingsRate data={dashboardData.savingsRate} />
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <RecommendationsList data={dashboardData.recommendations} />
        </div>
      </div>
    </div>
  );
}