import React, { useState, useEffect } from 'react';
import { useGoalContext } from '../context/GoalContext';
import GoalForm from './GoalForm';
import GoalList from './GoalList';

const GoalPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const { goals, fetchGoals } = useGoalContext();

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenForm = (goal = null) => {
    setSelectedGoal(goal);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedGoal(null);
    setIsFormOpen(false);
  };

  return (
    <div className="goals-page">
      <div className="goals-header">
        <h1>Финансовые цели</h1>
        <button 
          onClick={() => handleOpenForm()} 
          className="btn btn-primary"
        >
          Создать новую цель
        </button>
      </div>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <GoalForm goal={selectedGoal} onClose={handleCloseForm} />
          </div>
        </div>
      )}

      <GoalList goals={goals} onEditGoal={handleOpenForm} />
    </div>
  );
};

export default GoalPage;