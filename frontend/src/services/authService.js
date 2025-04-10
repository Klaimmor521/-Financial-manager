import axios from 'axios';
const API_URL = 'http://localhost:5000/api/users';

export const authService = {
  async register(username, email, password) {
    try {
      const response = await axios.post(`${API_URL}/register`, {
        username,
        email,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Ошибка регистрации';
      throw new Error(message);
    }
  },

  async login(email, password) 
  {
    try 
    {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });
      
      if (response.data.token) 
      {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
      }
      
      return response.data;
    } 
    catch (error) 
    {
      const message = error.response?.data?.error || 'Ошибка входа';
      throw new Error(message);
    }
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
  }
};