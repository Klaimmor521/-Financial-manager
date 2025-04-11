import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; 

const TransactionForm = ({ fetchTransactions, editTransaction, setEditTransaction }) => {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: '',
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        amount: editTransaction.amount,
        type: editTransaction.type,
        category: editTransaction.categoryId || editTransaction.category,
        date: editTransaction.date.split('T')[0],
      });
    }
  }, [editTransaction]);

  const token = localStorage.getItem('token');

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/categories/type/${formData.type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [formData.type]);

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: formData.amount,
        type: formData.type,
        categoryId: formData.category,
        date: formData.date,
      };

      if (editTransaction) {
        await axios.put(
          `http://localhost:5000/api/transactions/${editTransaction.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditTransaction(null);
      } else {
        await axios.post(
          'http://localhost:5000/api/transactions',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setFormData({ amount: '', type: 'expense', category: '', date: '' });
      fetchTransactions();
    } catch (err) {
      console.error('Ошибка при отправке транзакции:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="transaction-form" id="transaction-form">
      <h2>{editTransaction ? 'Редактировать' : 'Добавить'} транзакцию</h2>
      <form onSubmit={handleTransactionSubmit}>
        <input type="number" name="amount" placeholder="Сумма" value={formData.amount} onChange={handleInputChange} required />
        <select name="type" value={formData.type} onChange={handleInputChange}>
          <option value="expense">Расход</option>
          <option value="income">Доход</option>
        </select>
        <select name="category" value={formData.category} onChange={handleInputChange} required>
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
        <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
        <button type="submit">{editTransaction ? 'Сохранить' : 'Добавить'}</button>
      </form>
    </div>
  );
};

TransactionForm.propTypes = 
{
  fetchTransactions: PropTypes.func.isRequired, // Validate fetchTransactions as a function
  editTransaction: PropTypes.object,
  setEditTransaction: PropTypes.func.isRequired,
};

export default TransactionForm;