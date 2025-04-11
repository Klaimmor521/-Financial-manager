import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TransactionList = ({ setEditTransaction, fetchTransactionsTrigger, onEditTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({});

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Преобразуем массив категорий в объект для быстрого доступа по ID
      const categoriesMap = {};
      response.data.forEach(category => {
        categoriesMap[category.id] = category;
      });
      
      setCategories(categoriesMap);
    } catch (error) {
      console.error('Ошибка при загрузке категорий:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  };

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
    fetchCategories();
    fetchTransactions();
  }, [fetchTransactionsTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту транзакцию?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchTransactions();
      console.log('Deleted!');
    } catch (err) {
      console.error('Ошибка при удалении транзакции:', err);
    }
  };

  const handleEdit = (txn) => {
    if (onEditTransaction) {
      onEditTransaction(txn);
    } else if (setEditTransaction) {
      setEditTransaction(txn);
    }
    document.getElementById('transaction-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Функция для получения имени категории по ID
  const getCategoryName = (categoryId) => {
    if (categories[categoryId]) {
      return categories[categoryId].name;
    }
    return 'Неизвестная категория';
  };

  // Функция для получения иконки категории по ID
  const getCategoryIcon = (categoryId) => {
    if (categories[categoryId] && categories[categoryId].icon) {
      return categories[categoryId].icon;
    }
    return '';
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
              <strong>{txn.amount}</strong> {txn.type === 'income' ? '+' : '-'} | {getCategoryIcon(txn.category_id)} {getCategoryName(txn.category_id)} | 
              {new Date(txn.date).toLocaleDateString()}
              <button className="edit" onClick={() => handleEdit(txn)}>✏️</button>
              <button className="delete" onClick={() => handleDelete(txn.id)}>🗑️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionList;