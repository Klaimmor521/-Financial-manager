import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <h1>Добро пожаловать, {user.username}!</h1>
      <p>Это ваша персональная финансовая панель</p>
      <button onClick={handleLogout}>Выйти</button>
    </div>
  );
}