// TransactionList.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TransactionList = ({ setEditTransaction, fetchTransactionsTrigger, onEditTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  // Категории не нужны здесь, если мы их не используем для фильтрации в этом компоненте
  // Имя и иконка категории должны приходить с бэкенда вместе с транзакцией (через JOIN)

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/transactions', { // Предполагаем, что этот эндпоинт возвращает транзакции с category_name и category_icon
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Transactions fetched for list:', response.data); // Проверь структуру response.data
      // Адаптируй в зависимости от того, где лежит массив транзакций в ответе:
      // response.data.data, response.data.transactions, или просто response.data
      setTransactions(response.data.data || response.data.transactions || response.data || []);
    } catch (error) {
      console.error('Ошибка при загрузке транзакций для списка:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactionsTrigger]); // Зависимость от триггера

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить эту транзакцию?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchTransactions(); // Обновляем список после удаления
      // toast.success('Transaction deleted successfully'); // Опционально
    } catch (err) {
      console.error('Ошибка при удалении транзакции:', err);
      // toast.error('Failed to delete transaction'); // Опционально
    }
  };

  const handleEdit = (txn) => {
    if (onEditTransaction) {
      onEditTransaction(txn);
    } else if (setEditTransaction) { // Если используется старый способ через setEditTransaction
      setEditTransaction(txn);
    }
    // Прокрутка к форме
    const formElement = document.getElementById('transaction-form'); // Убедись, что у формы есть этот ID
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <div className="transaction-list-container"> {/* Общий контейнер */}
      <h3>Список транзакций</h3> {/* Изменили h2 на h3 для лучшей иерархии, если есть h2 выше */}
      {transactions.length === 0 ? (
        <p>Нет транзакций для отображения.</p>
      ) : (
        <ul className="transactions-ul"> {/* Добавили класс для ul */}
          {transactions.map((txn) => (
            <li key={txn.id} className={`transaction-item ${txn.type}`}> {/* Классы для стилизации */}
              <div className="transaction-icon-category">
                {txn.category_icon && <span className="category-icon" dangerouslySetInnerHTML={{ __html: txn.category_icon }}></span>}
                <span className="transaction-category-name">{txn.category_name || 'Без категории'}</span>
              </div>
              <div className="transaction-details">
                <span className="transaction-description">
                  {txn.description || <span style={{ fontStyle: 'italic', color: '#888' }}>- нет описания -</span>}
                </span>
                <span className="transaction-date">
                  {new Date(txn.date).toLocaleDateString()} {/* Убедись, что txn.date - это строка YYYY-MM-DD или объект Date */}
                </span>
              </div>
              <div className={`transaction-amount ${txn.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                {txn.type === 'income' ? '+' : '-'}{Math.abs(txn.amount).toFixed(2)} ₽
              </div>
              <div className="transaction-actions">
                <button className="btn-edit" title="Редактировать" onClick={() => handleEdit(txn)}>✏️</button>
                <button className="btn-delete" title="Удалить" onClick={() => handleDelete(txn.id)}>🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TransactionList;