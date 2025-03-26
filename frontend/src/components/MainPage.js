import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1>FinTrack</h1>
      <p>Добро пожаловать в ваш персональный финансовый менеджер!</p>
      <div className="button-group">
        <button onClick={() => navigate('/login')}>Войти</button>
        <button onClick={() => navigate('/register')}>Зарегистрироваться</button>
      </div>
    </div>
  );
}

export default Home;