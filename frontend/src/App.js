import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Register } from './components/Register';
import Main from './components/MainPage';
import TransactionEditPage from './components/TransactionEditPage';
import GoalPage from './components/GoalPage';
import NavBar from './components/NavBar';
import { GoalProvider } from './context/GoalContext';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <div>
      <NavBar />
      <div className="container">
        <GoalProvider>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
          </Routes>
        </GoalProvider>
      </div>
    </div>
  );
}

export default App;