import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Ошибка входа. Проверьте данные.'); // Более общее сообщение
    }
  };

  return (
    <div className="auth-page-wrapper"> {/* <--- НОВАЯ ОБЕРТКА */}
      <div className="login-container auth-form-container"> {/* Добавим общий класс auth-form-container */}
        <h2>Вход</h2>
        {error && <div className="error-message">{error}</div>} {/* Используем класс для ошибок */}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email" // Связь с label
              placeholder="Введите ваш email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password" // Связь с label
              placeholder="Введите ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button">Войти</button>
          <p className="auth-switch-link">
            Нет аккаунта? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Зарегистрироваться</a>
          </p>
        </form>
      </div>
    </div>
  );
}