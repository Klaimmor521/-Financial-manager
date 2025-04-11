import React, { useState } from 'react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const TransactionEditPage = () => {
  const [editingTransaction, setEditTransaction] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div>
      <TransactionForm
        editTransaction={editingTransaction}
        setEditTransaction={setEditTransaction}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
      <TransactionList
        onEditTransaction={setEditTransaction}
        fetchTransactionsTrigger={refreshTrigger}
      />
    </div>
  );
};

export default TransactionEditPage;