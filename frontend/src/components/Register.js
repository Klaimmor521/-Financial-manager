import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

export function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await authService.register(username, email, password);
      toast.success('Регистрация прошла успешно! Пожалуйста, войдите.'); // Добавим уведомление
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Ошибка регистрации. Попробуйте еще раз.'); // Более общее сообщение
    }
  };

  return (
    <div className="auth-page-wrapper"> {/* <--- НОВАЯ ОБЕРТКА */}
      <div className="register-container auth-form-container"> {/* Добавим общий класс auth-form-container */}
        <h2>Регистрация</h2>
        {error && <div className="error-message">{error}</div>} {/* Используем класс для ошибок */}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              type="text"
              id="username"
              placeholder="Придумайте имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label> {/* id должен быть уникальным */}
            <input
              type="email"
              id="reg-email"
              placeholder="Введите ваш email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Пароль</label> {/* id должен быть уникальным */}
            <input
              type="password"
              id="reg-password"
              placeholder="Придумайте пароль (мин. 6 символов)" // Можно добавить подсказку
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6} // Добавим валидацию минимальной длины
            />
          </div>
          <button type="submit" className="auth-button">Зарегистрироваться</button>
          <p className="auth-switch-link">
            Уже есть аккаунт? <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Войти</a>
          </p>
        </form>
      </div>
    </div>
  );
}