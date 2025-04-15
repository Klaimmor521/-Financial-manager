const Goal = require('../models/goalModel');
const Notification = require('../models/notificationModel');

class GoalController {
  static async createGoal(req, res) {
    try {
      const userId = req.user.id;
      const { name, targetAmount, currentAmount, targetDate, description } = req.body;
      
      if (!name || !targetAmount || !targetDate) {
        return res.status(400).json({ message: 'Name, target amount and target date are required' });
      }
      
      const goalData = {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
        targetDate: new Date(targetDate),
        description
      };
      
      const goal = await Goal.create(goalData);
      
      return res.status(201).json(goal);
    } catch (error) {
      console.error('Error creating goal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async getGoals(req, res) {
    try {
      const userId = req.user.id;
      const goals = await Goal.calculateAllProgress(userId);
      
      return res.json(goals);
    } catch (error) {
      console.error('Error getting goals:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async getGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      
      const goal = await Goal.calculateProgress(goalId, userId);
      
      if (!goal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      return res.json(goal);
    } catch (error) {
      console.error('Error getting goal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async updateGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      const { name, targetAmount, currentAmount, targetDate, description, isCompleted } = req.body;
      
      // Check if goal exists
      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      const goalData = {
        name,
        targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        description,
        isCompleted
      };
      
      const updatedGoal = await Goal.update(goalId, goalData, userId);
      
      // Check if goal is now completed
      if (updatedGoal.is_completed && !existingGoal.is_completed) {
        await Notification.create({
          userId,
          type: 'goal_achieved',
          message: `Congratulations! You have achieved your goal: ${updatedGoal.name}`,
          relatedEntityId: goalId
        });
      }
      
      // Recalculate progress
      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      
      return res.json(goalWithProgress);
    } catch (error) {
      console.error('Error updating goal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async deleteGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      
      // Check if goal exists
      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      await Goal.delete(goalId, userId);
      
      return res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async updateGoalAmount(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      const { amount } = req.body;
      
      if (amount === undefined) {
        return res.status(400).json({ message: 'Amount is required' });
      }
      
      // Check if goal exists
      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      const updatedGoal = await Goal.updateAmount(goalId, parseFloat(amount), userId);
      
      // Check if goal is now completed
      if (updatedGoal.is_completed && !existingGoal.is_completed) {
        await Notification.create({
          userId,
          type: 'goal_achieved',
          message: `Congratulations! You have achieved your goal: ${updatedGoal.name}`,
          relatedEntityId: goalId
        });
      } 
      // Check if significant progress has been made
      else if (!updatedGoal.is_completed) {
        const progress = (updatedGoal.current_amount / updatedGoal.target_amount) * 100;
        if (progress >= 25 && (existingGoal.current_amount / existingGoal.target_amount) * 100 < 25 ||
            progress >= 50 && (existingGoal.current_amount / existingGoal.target_amount) * 100 < 50 ||
            progress >= 75 && (existingGoal.current_amount / existingGoal.target_amount) * 100 < 75) {
          await Notification.create({
            userId,
            type: 'goal_progress',
            message: `You've reached ${Math.floor(progress)}% of your goal: ${updatedGoal.name}`,
            relatedEntityId: goalId
          });
        }
      }
      
      // Recalculate progress
      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      
      return res.json(goalWithProgress);
    } catch (error) {
      console.error('Error updating goal amount:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = GoalController;