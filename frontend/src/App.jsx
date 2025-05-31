import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import MainPage from './components/MainPage';
import TransactionEditPage from './components/TransactionEditPage';
import GoalPage from './components/GoalPage';
import NavBar from './components/NavBar';
import { GoalProvider } from './context/GoalContext';
import { NotificationProvider } from './context/NotificationContext';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './components/ProfilePage';
import ReportsPage from './components/ReportsPage';
import ImportPage from './components/ImportPage';

function App() {
  const token = localStorage.getItem('token');

  return (
    <NotificationProvider>
      <GoalProvider>
        <NavBar />
        <div className="container">
          <Routes>
            <Route path="/" element={
              token ? <Navigate to="/dashboard" replace /> : <MainPage /> 
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute>
                <TransactionEditPage />
              </ProtectedRoute>
            } />
            <Route path="/goals" element={
              <ProtectedRoute>
                <GoalPage />
              </ProtectedRoute>
            } />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
            <ProtectedRoute>
                <ReportsPage />
            </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }   
          />
          </Routes>
        </div>
      </GoalProvider>
    </NotificationProvider>
  );
}

export default App;