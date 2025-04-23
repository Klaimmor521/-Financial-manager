import axios from 'axios';

const API_URL = 'http://localhost:5000/api/analytics';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

class AnalyticsService {
  getCategoryAnalytics(dateRange) {
    let url = `${API_URL}/categories`;
    
    if (dateRange) {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return axios.get(url, { headers: getAuthHeader() });
  }
  
  getMonthlyTrends(months) {
    let url = `${API_URL}/monthly-trends`;
    if (months) {
      url += `?months=${months}`;
    }
    
    return axios.get(url, { headers: getAuthHeader() });
  }
  
  getIncomeExpenseRatio(dateRange) {
    let url = `${API_URL}/income-expense-ratio`;
    
    if (dateRange) {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return axios.get(url, { headers: getAuthHeader() });
  }
  
  getSavingsRate(dateRange) {
    let url = `${API_URL}/savings-rate`;
    
    if (dateRange) {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return axios.get(url, { headers: getAuthHeader() });
  }
  
  getRecommendations() {
    return axios.get(`${API_URL}/recommendations`, { headers: getAuthHeader() });
  }
  
  getDashboardAnalytics() {
    return axios.get(`${API_URL}/dashboard`, { headers: getAuthHeader() });
  }
}

export default new AnalyticsService();