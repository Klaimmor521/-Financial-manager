import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TransactionList = ({ setEditTransaction, fetchTransactionsTrigger }) => {
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/transactions', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Transactions fetched:', response.data);
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Ошибка при загрузке транзакций:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactionsTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту транзакцию?')) return;
    try {
      await axios.delete(`/api/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchTransactions();
    } catch (err) {
      console.error('Ошибка при удалении транзакции:', err);
    }
  };

  return (
    <div className="transaction-list">
      <h2>Список транзакций</h2>
      {transactions.length === 0 ? (
        <p>Нет транзакций</p>
      ) : (
        <ul>
          {transactions.map((txn) => (
            <li key={txn.id}>
              <strong>{txn.amount}</strong> {txn.type === 'income' ? '+' : '-'} | {txn.category} | {new Date(txn.date).toLocaleDateString()}
              <button className = "edit" onClick={() => setEditTransaction(txn)}>✏️</button>
              <button className = "delete" onClick={() => handleDelete(txn.id)}>🗑️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionList;
