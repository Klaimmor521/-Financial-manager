const Goal = require('../models/goalModel');
const NotificationModel = require('../models/notificationModel');

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

      console.log('⚡ Создаётся цель:', goalData);

      const goal = await Goal.create(goalData);

      console.log('✅ Цель создана:', goal);

      // Создание уведомления
      try {
        console.log('🔔 Попытка создать уведомление о новой цели...');
        await NotificationModel.create({
          userId: userId,
          type: 'goal_created',
          message: `New goal "${goal.name}" has been created.`,
          relatedEntityId: goal.id
        });
        console.log('✅ Уведомление о новой цели создано');
      } catch (notificationError) {
        console.error('❌ Ошибка при создании уведомления о цели:', notificationError);
      }

      return res.status(201).json(goal);
    } catch (error) {
      console.error('❌ Ошибка при создании цели:', error);
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
      const updateData = req.body; // Get all potential update fields

      // Find the goal *before* updating to get the old progress
      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }

      // Calculate old progress based on the state *before* the update
      // Ensure targetAmount is not zero to avoid division by zero
      const oldProgress = existingGoal.target_amount > 0
        ? (existingGoal.current_amount / existingGoal.target_amount) * 100
        : 0;

      // Prepare update payload, ensuring amounts are numbers and date is a Date object
      const payload = { ...updateData };
      if (payload.targetAmount !== undefined) {
        payload.targetAmount = parseFloat(payload.targetAmount);
      }
      if (payload.currentAmount !== undefined) {
        payload.currentAmount = parseFloat(payload.currentAmount);
      }
      if (payload.targetDate !== undefined) {
        payload.targetDate = new Date(payload.targetDate);
      }
      // Remove fields that shouldn't be directly updated or are handled by the model
      delete payload.id;
      delete payload.userId;
      delete payload.created_at;
      delete payload.updated_at;


      // Update the goal in the database using the static method
      const updatedGoal = await Goal.update(goalId, payload, userId);
      if (!updatedGoal) {
        // This might happen if the update query fails unexpectedly
        return res.status(500).json({ message: 'Failed to update goal' });
      }

      // Calculate new progress based on the *updated* goal data
      // Ensure targetAmount is not zero
      const newProgress = updatedGoal.target_amount > 0
        ? (updatedGoal.current_amount / updatedGoal.target_amount) * 100
        : 0;

      console.log(`🔄 Goal ${updatedGoal.name} progress: ${oldProgress.toFixed(2)}% -> ${newProgress.toFixed(2)}%`);

      // Check for the *highest* milestone achieved and create one notification
      const milestones = [100, 75, 50, 25]; // Iterate descending
      for (const milestone of milestones) {
        if (newProgress >= milestone && oldProgress < milestone) {
          try {
            console.log(`🔔 Highest milestone ${milestone}% reached for goal "${updatedGoal.name}" - creating notification...`);
            await NotificationModel.create({
              userId: userId,
              type: 'goal_progress',
              message: `🎯 You reached ${milestone}% of your goal "${updatedGoal.name}"!`,
              relatedEntityId: updatedGoal.id
            });
            console.log(`✅ Notification for ${milestone}% created.`);
            break; // <<<--- Add break to send only one notification for the highest milestone
          } catch (notificationError) {
            console.error(`❌ Error creating notification for ${milestone}% milestone:`, notificationError);
            // Log error but continue execution (consider if breaking here is better)
          }
        }
      }

      // Return the updated goal with recalculated progress details if needed
      // Or just return the updatedGoal object directly if it contains all necessary info
      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      return res.json(goalWithProgress || updatedGoal); // Fallback to updatedGoal if calculateProgress fails

    } catch (error) {
      console.error('❌ Error updating goal:', error);
      // Check for specific database errors if necessary
      return res.status(500).json({ message: 'Server error during goal update' });
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
      
      // ---> Start Addition: Create notification for deleted goal <---
      try {
        await NotificationModel.create({
          userId: userId,
          type: 'goal_deleted',
          message: `Goal "${existingGoal.name}" has been deleted.`, // Use existingGoal to get the name
          relatedEntityId: goalId
        });
      } catch (notificationError) {
        console.error('Failed to create notification for goal deletion:', notificationError);
        // Log error but don't fail the request
      }
      // ---> End Addition <---

      return res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  static async updateGoalAmount(req, res) {
    try
    {
      const userId = req.user.id;
      const goalId = req.params.id;
      const { amount } = req.body;

      console.log('⚙️ Вызван updateGoalAmount для цели:', goalId, 'с amount:', amount);

      if (amount === undefined) {
        return res.status(400).json({ message: 'Amount is required' });
      }

      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }

      const updatedGoal = await Goal.updateAmount(goalId, parseFloat(amount), userId);

      const oldProgress = existingGoal.target_amount > 0 // Use existingGoal.target_amount
        ? (existingGoal.current_amount / existingGoal.target_amount) * 100
        : 0;
      const newProgress = updatedGoal.target_amount > 0 // Use updatedGoal.target_amount
        ? (updatedGoal.current_amount / updatedGoal.target_amount) * 100
        : 0;

      console.log(`➡ Прогресс цели "${updatedGoal.name}": old=${oldProgress.toFixed(2)}%, new=${newProgress.toFixed(2)}%`);

      // Check for the *highest* milestone achieved and create one notification
      const milestones = [100, 75, 50, 25]; // Iterate descending
      console.log('📊 oldProgress =', oldProgress.toFixed(2), '%');
      console.log('📈 newProgress =', newProgress.toFixed(2), '%');
      for (const milestone of milestones) {
        // Ensure target_amount is used for calculation consistency
        if (newProgress >= milestone && oldProgress < milestone) {
          try {
            console.log(`🔔 Достигнут наивысший рубеж ${milestone}% — создаём уведомление`);
            await NotificationModel.create({ // Use await here
              userId,
              type: 'goal_progress',
              message: `Вы достигли ${milestone}% цели "${updatedGoal.name}"! Отличная работа!`,
              relatedEntityId: updatedGoal.id // Use updatedGoal.id for consistency
            });
            console.log(`✅ Уведомление на ${milestone}% создано`);
            break; // <<<--- Add break to send only one notification for the highest milestone
          } catch (notificationError) {
            console.error(`❌ Ошибка при создании уведомления на ${milestone}%:`, notificationError);
          }
        }
      }

      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      return res.json(goalWithProgress);
    } catch (error) {
      console.error('❌ Ошибка в updateGoalAmount:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = GoalController;