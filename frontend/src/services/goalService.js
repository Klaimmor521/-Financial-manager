import axios from 'axios';
const API_URL = 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const GoalService = {
  async createGoal(goalData) {
    try {
      const response = await axios.post(`${API_URL}/goals`, goalData, getAuthHeader());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка при создании цели';
      throw new Error(message);
    }
  },

  async getGoals() {
    try {
      const response = await axios.get(`${API_URL}/goals`, getAuthHeader());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка при выборе целей';
      throw new Error(message);
    }
  },

  async getGoal(goalId) {
    try {
      const response = await axios.get(`${API_URL}/goals/${goalId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Цель получения ошибки';
      throw new Error(message);
    }
  },

  async updateGoal(goalId, goalData) {
    try {
      const response = await axios.put(`${API_URL}/goals/${goalId}`, goalData, getAuthHeader());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Цель обновления ошибок';
      throw new Error(message);
    }
  },

  async updateGoalAmount(goalId, amount) {
    try {
      const response = await axios.patch(
        `${API_URL}/goals/${goalId}/amount`, 
        { amount }, 
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка при обновлении суммы цели';
      throw new Error(message);
    }
  },

  async deleteGoal(goalId) {
    try {
      const response = await axios.delete(`${API_URL}/goals/${goalId}`, getAuthHeader());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка при удалении цели';
      throw new Error(message);
    }
  }
};