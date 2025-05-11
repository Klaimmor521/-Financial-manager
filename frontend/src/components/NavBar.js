import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';
import axios from 'axios'

const NavBar = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(''); 
  const [avatar, setAvatar] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUserData = async () => {
      if(token) {
        try{
          const response = await axios.get('/api/users/profile',{
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setUsername(response.data.username)
          setAvatar(response.data.avatar)
        } catch(error) {
          console.error('Failed to fetch user data:', error);
        }
      }
    };

    fetchUserData();
  },[token])

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/'); // Redirect to main page instead of login
  };

  if (!token) {
    return null;
  }

  return (
    <nav className="navbar">
      <ul className="navbar-menu">
        <li><Link to="/dashboard">Dashboard</Link></li>
        <div className="user-info">
        <img src={avatar} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%' }} onClick={() => navigate('/profile')}/> {/* Make avatar clickable */}
        <span onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>{username}</span> {/* Make username clickable */}
      </div>
        <li><Link to="/transactions">Transactions</Link></li>
        <li><Link to="/goals">Goals</Link></li>
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