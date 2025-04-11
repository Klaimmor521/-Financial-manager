import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import Dashboard from './components/Dashboard';
import Main from './components/MainPage';
import TransactionEditPage from './components/TransactionEditPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/" element={<Main />} />
      <Route path="/transactions" element={<TransactionEditPage />} /> 
    </Routes>

  );
}

export default App;