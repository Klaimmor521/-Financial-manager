import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [editTransaction, setEditTransaction] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1); // This will trigger TransactionList to refresh
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {user.username}!</h1>
        <button onClick={handleLogout} className="btn btn-outline-danger">Выйти</button>
      </div>
      
      <div className="dashboard-content">
        <div className="row">
          <div className="col-md-4">
            <TransactionForm 
              onTransactionAdded={handleTransactionAdded}
              editTransaction={editTransaction}
              setEditTransaction={setEditTransaction}
            />
          </div>
          <div className="col-md-8">
            <TransactionList 
              key={refreshKey}
              onEditTransaction={setEditTransaction}
              onTransactionDeleted={handleTransactionAdded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}