import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoalService } from '../services/goalService';
import { toast } from 'react-toastify';

const GoalContext = createContext();

export const useGoalContext = () => useContext(GoalContext);

export const GoalProvider = ({ children }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch all goals on component mount
  useEffect(() => {
    fetchGoals();
  }, []);
  
  // Fetch all goals
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await GoalService.getGoals();
      setGoals(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch goals');
      toast.error(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new goal
  const createGoal = async (goalData) => {
    setLoading(true);
    try {
      const newGoal = await GoalService.createGoal(goalData);
      setGoals([...goals, newGoal]);
      toast.success('Goal created successfully!');
      return newGoal;
    } catch (err) {
      setError(err.message || 'Failed to create goal');
      toast.error(err.message || 'Failed to create goal');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update a goal
  const updateGoal = async (goalId, goalData) => {
    setLoading(true);
    try {
      const updatedGoal = await GoalService.updateGoal(goalId, goalData);
      setGoals(goals.map(goal => goal.id === goalId ? updatedGoal : goal));
      toast.success('Goal updated successfully!');
      return updatedGoal;
    } catch (err) {
      setError(err.message || 'Failed to update goal');
      toast.error(err.message || 'Failed to update goal');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Update goal amount
  const updateGoalAmount = async (goalId, amount) => {
    setLoading(true);
    try {
      const updatedGoal = await GoalService.updateGoalAmount(goalId, amount);
      setGoals(goals.map(goal => goal.id === goalId ? updatedGoal : goal));
      toast.success(`Goal amount updated by ${amount > 0 ? '+' : ''}${amount}!`);
      return updatedGoal;
    } catch (err) {
      setError(err.message || 'Failed to update goal amount');
      toast.error(err.message || 'Failed to update goal amount');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a goal
  const deleteGoal = async (goalId) => {
    setLoading(true);
    try {
      await GoalService.deleteGoal(goalId);
      setGoals(goals.filter(goal => goal.id !== goalId));
      toast.success('Goal deleted successfully!');
    } catch (err) {
      setError(err.message || 'Failed to delete goal');
      toast.error(err.message || 'Failed to delete goal');
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
        error,
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