import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';

const NavBar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

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