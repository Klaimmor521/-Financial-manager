import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter'; // Убедись, что путь верный
import axios from 'axios';

const NavBar = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null); // Переименуем для ясности в avatarUrl
  const token = localStorage.getItem('token');

  const API_SERVER_URL = 'http://localhost:5000'; // URL твоего API и сервера статики

  useEffect(() => {
    const fetchUserData = async () => {
      if (token) {
        try {
          // Решение 1: Если настроен proxy в package.json фронтенда на "http://localhost:5000"
          // const response = await axios.get('/api/users/profile', {

          // Решение 2: Использовать полный URL (если proxy не настроен)
          const response = await axios.get(`${API_SERVER_URL}/api/users/profile`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          console.log('NavBar - User data from server:', response.data); // Для отладки

          setUsername(response.data.username || 'User');
          if (response.data.avatar) { // Бэкенд возвращает поле 'avatar' с относительным путем
            setAvatarUrl(`${API_SERVER_URL}${response.data.avatar}`); // Формируем полный URL для src
          } else {
            setAvatarUrl(null); // Если аватара нет
          }
        } catch (error) {
          console.error('NavBar - Failed to fetch user data:', error);
          if (error.response && error.response.status === 401) {
            // Токен невалиден или истек, можно разлогинить
            // localStorage.removeItem('token');
            // navigate('/login');
          }
        }
      } else {
        // Если токена нет, сбрасываем данные
        setUsername('');
        setAvatarUrl(null);
      }
    };

    fetchUserData();
  }, [token, navigate]); // Добавил navigate в зависимости, хотя он тут не меняет запрос

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsername(''); // Очищаем состояние при выходе
    setAvatarUrl(null);
    navigate('/');
  };

  if (!token) {
    return null; // Не отображаем NavBar, если пользователь не залогинен
  }

  return (
    <nav className="navbar">
      <ul className="navbar-menu">
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/transactions">Transactions</Link></li>
        <li><Link to="/goals">Goals</Link></li>
        <li><Link to="/reports">Reports</Link></li> { }
        <li><Link to="/import">Import Data</Link></li>
        <div className="user-info" onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }} />
          ) : (
            // Можно добавить заглушку или инициалы, если аватара нет
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px',
              backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 'bold', color: '#fff'
            }}>
              {username ? username.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <span>{username}</span>
        </div>
        <li>
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
            Logout
          </button>
        </li>
        <li>
          <NotificationCenter />
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;