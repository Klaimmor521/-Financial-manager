import React from 'react';
import { useGoalContext } from '../context/GoalContext';

const GoalList = ({ goals, onEditGoal }) => {
  const { deleteGoal } = useGoalContext();

  const handleDelete = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal(goalId);
    }
  };

  const calculateProgressColor = (percentage) => {
    if (percentage >= 100) return '#28a745';
    if (percentage >= 75) return '#17a2b8';
    if (percentage >= 50) return '#ffc107';
    if (percentage >= 25) return '#fd7e14';
    return '#dc3545';
  };

  const getRemainingDays = (goal) => 
  {
    if (goal.days_remaining === null || goal.days_remaining === undefined || isNaN(goal.days_remaining)) {
      // Если дата цели существует, рассчитаем дни самостоятельно
      if (goal.target_date) {
        const targetDate = new Date(goal.target_date);
        const today = new Date();
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }
      return 0; // Если даты нет, возвращаем 0
    }
    return Math.max(0, Math.floor(goal.days_remaining));
  };

  const getPercentage = (goal) => {
    // Проверяем сначала, есть ли значение percentage в объекте goal
    if (goal.percentage !== undefined && goal.percentage !== null && !isNaN(parseFloat(goal.percentage))) {
      return parseFloat(goal.percentage);
    }
    
    // Если значения нет, рассчитываем самостоятельно
    if (goal.target_amount && goal.current_amount !== undefined) {
      // Обратите внимание, что мы преобразуем оба значения в числа
      const targetAmount = parseFloat(goal.target_amount);
      const currentAmount = parseFloat(goal.current_amount);
      
      if (targetAmount > 0) {
        const calculated = Math.round((currentAmount / targetAmount * 100) * 100) / 100;
        return isNaN(calculated) ? 0 : calculated;
      }
    }
    
    // Если и это не работает, возвращаем 0
    return 0;
  };

  return (
    <div className="goals-list">
      {goals.length === 0 ? (
        <p className="no-goals">No goals yet. Create your first goal!</p>
      ) : (
        goals.map(goal => {
          // Получаем безопасное значение процента
          const percentage = getPercentage(goal);
          // Получаем безопасное значение оставшихся дней
          const daysRemaining = getRemainingDays(goal);
          
          return (
            <div key={goal.id} className="goal-card">
              <div className="goal-header">
                <h3>{goal.name}</h3>
                <div className="goal-actions">
                  <button onClick={() => onEditGoal(goal)} className="btn btn-edit">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="btn btn-delete">
                    Delete
                  </button>
                </div>
              </div>

              <div className="goal-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${Math.min(100, percentage)}%`,
                      backgroundColor: calculateProgressColor(percentage)
                    }}
                  ></div>
                </div>
                <span className="progress-text">{percentage}%</span>
              </div>

              <div className="goal-details">
                <p>Target: ₽{goal.target_amount ? goal.target_amount.toLocaleString() : '0'}</p>
                <p>Current: ₽{goal.current_amount ? goal.current_amount.toLocaleString() : '0'}</p>
                <p>Days remaining: {daysRemaining}</p>
              </div>

              {goal.description && (
                <p className="goal-description">{goal.description}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default GoalList;