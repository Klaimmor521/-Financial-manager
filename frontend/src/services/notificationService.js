import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const NotificationService = {
  async fetchNotifications() {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  async getUnreadCount() {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.count;
  },

  async markAsRead(notificationId) {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  async markAllAsRead() {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/notifications/mark-all-read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  async deleteNotification(notificationId) {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/notifications/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};