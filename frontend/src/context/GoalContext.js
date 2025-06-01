import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoalService } from '../services/goalService'; // Предполагается, что goalService уже обрабатывает ошибки и может возвращать русские сообщения, если настроен
import { toast } from 'react-toastify';

const GoalContext = createContext();

export const useGoalContext = () => useContext(GoalContext);

export const GoalProvider = ({ children }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false); // Это состояние для индикаторов загрузки, не текст для пользователя
  const [error, setError] = useState(null); // Ошибка для возможного отображения в UI, если toast не используется
  
  // Загрузка всех целей при монтировании компонента
  useEffect(() => {
    fetchGoals();
  }, []);
  
  // Загрузить все цели
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await GoalService.getGoals();
      setGoals(data);
      setError(null); // Сбрасываем ошибку при успехе
    } catch (err) {
      const errorMessage = err.message || 'Не удалось загрузить цели'; // err.message может быть уже на русском из goalService
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Создать новую цель
  const createGoal = async (goalData) => {
    setLoading(true);
    try {
      const newGoal = await GoalService.createGoal(goalData);
      setGoals(prevGoals => [...prevGoals, newGoal]); // Более безопасное обновление состояния
      toast.success('Цель успешно создана!');
      setError(null);
      return newGoal;
    } catch (err) {
      const errorMessage = err.message || 'Не удалось создать цель';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Перебрасываем ошибку, чтобы ее можно было обработать в компоненте
    } finally {
      setLoading(false);
    }
  };
  
  // Обновить цель
  const updateGoal = async (goalId, goalData) => {
    setLoading(true);
    try {
      const updatedGoal = await GoalService.updateGoal(goalId, goalData);
      setGoals(prevGoals => prevGoals.map(goal => goal.id === goalId ? updatedGoal : goal));
      toast.success('Цель успешно обновлена!');
      setError(null);
      return updatedGoal;
    } catch (err) {
      const errorMessage = err.message || 'Не удалось обновить цель';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Обновить сумму цели
  const updateGoalAmount = async (goalId, amount, type = 'add') => { // Добавил type для ясности (add/set)
    setLoading(true);
    try {
      // Предполагаем, что GoalService.updateGoalAmount принимает абсолютное изменение или новую сумму
      // Если amount это дельта:
      const updatedGoal = await GoalService.updateGoalAmount(goalId, amount); 
      setGoals(prevGoals => prevGoals.map(goal => goal.id === goalId ? updatedGoal : goal));
      
      // Сообщение в зависимости от того, добавили мы или установили новую сумму
      // Если GoalService.updateGoalAmount возвращает всю цель, можно посмотреть на разницу current_amount
      // Для простоты, если amount - это дельта:
      if (type === 'add') {
        toast.success(`Сумма цели обновлена на ${amount > 0 ? '+' : ''}${amount}!`);
      } else { // type === 'set' (если бы у тебя была такая логика)
        toast.success(`Текущая сумма цели установлена: ${updatedGoal.current_amount}!`);
      }
      setError(null);
      return updatedGoal;
    } catch (err) {
      const errorMessage = err.message || 'Не удалось обновить сумму цели';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Удалить цель
  const deleteGoal = async (goalId) => {
    setLoading(true);
    try {
      await GoalService.deleteGoal(goalId);
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
      toast.success('Цель успешно удалена!');
      setError(null);
    } catch (err) {
      const errorMessage = err.message || 'Не удалось удалить цель';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <GoalContext.Provider
      value={{
        goals,
        loading,
        error, // Это состояние ошибки можно использовать в UI, если нужно показать ошибку не через toast
        fetchGoals,
        createGoal,
        updateGoal,
        updateGoalAmount,
        deleteGoal
      }}
    >
      {children}
    </GoalContext.Provider>
  );
};