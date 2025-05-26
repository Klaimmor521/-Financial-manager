import React, { useState } from 'react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const TransactionEditPage = () => {
  const [editingTransaction, setEditTransaction] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Это для TransactionList

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1); // Обновляем триггер для TransactionList
    setEditTransaction(null); // Сбрасываем редактируемую транзакцию
  };

  return (
    <div>
      <TransactionForm
        editTransaction={editingTransaction}
        setEditTransaction={setEditTransaction}
        onSuccess={handleSuccess} // <--- Передаем onSuccess
      />
      <TransactionList
        onEditTransaction={setEditTransaction} // Для передачи данных в форму на редактирование
        fetchTransactionsTrigger={refreshTrigger} // Для обновления списка
      />
    </div>
  );
};

export default TransactionEditPage;