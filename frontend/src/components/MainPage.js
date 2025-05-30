// MainPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function MainPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token'); // Проверяем, есть ли токен

  if (!token) { // Если токена нет (пользователь не вошел)
    return (
      <div className="auth-container"> {/* Используй стили для этого контейнера */}
        <h1>Добро пожаловать в Финансовый Менеджер!</h1> {/* Текст приветствия */}
        <p style={{ marginBottom: '20px' }}>Управляйте своими финансами легко и эффективно.</p> {/* Дополнительный текст */}
        <div className="button-group" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}> {/* Контейнер для кнопок */}
          <button onClick={() => navigate('/login')} style={{ padding: '10px 20px', fontSize: '16px' }}>Войти</button>
          <button onClick={() => navigate('/register')} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#28a745' }}>Зарегистрироваться</button>
        </div>
      </div>
    );
  } else { // Если токен есть (пользователь уже вошел)
    navigate('/dashboard'); // Автоматически перенаправляем на дашборд
    return null; // Ничего не рендерим, так как происходит редирект
  }
}

export default MainPage;