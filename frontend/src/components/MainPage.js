import React from 'react';
import { useNavigate } from 'react-router-dom';

function MainPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <div className="auth-container">
        <h1>Добро пожаловать!</h1>
        <button onClick={() => navigate('/login')}>Войти</button>
        <button onClick={() => navigate('/register')}>Зарегистрироваться</button>
      </div>
    );
  }

  else {
    navigate('/dashboard');
    return null;
  }
}

export default MainPage;
