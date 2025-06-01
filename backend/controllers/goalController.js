const Goal = require('../models/goalModel');
const NotificationModel = require('../models/notificationModel');

class GoalController {
  static async createGoal(req, res) {
    try {
      const userId = req.user.id;
      const { name, targetAmount, currentAmount, targetDate, description } = req.body;

      // 1. Валидация на сервере
      if (!name || targetAmount === undefined || !targetDate) { // Проверяем targetAmount на undefined, т.к. 0 - валидное значение
        return res.status(400).json({ message: 'Имя, целевая сумма и целевая дата обязательны для заполнения' });
      }

      // --- ИСПРАВЛЕНИЕ: Создаем goalData ДО его использования ---
      const goalDataToSave = { // Переименовал в goalDataToSave для ясности
        userId,
        name: name.trim(), // Обрезаем пробелы
        targetAmount: parseFloat(targetAmount),
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : 0,
        targetDate: new Date(targetDate), // Преобразуем строку даты в объект Date
        description: description ? description.trim() : null // Обрезаем пробелы или null
      };
      // ----------------------------------------------------------

      // Теперь можно логировать
      console.log('⚡ Создаётся цель (на сервере):', goalDataToSave);

      // Используем определенную переменную
      const goal = await Goal.create(goalDataToSave); 

      console.log('✅ Цель создана (на сервере):', goal);

      // Создание уведомления
      try {
        console.log('🔔 Попытка создать уведомление о новой цели...');
        await NotificationModel.create({
          userId: userId,
          type: 'goal_created',
          message: `Создана новая цель "${goal.name}".`,
          relatedEntityId: goal.id
        });
        console.log('✅ Уведомление о новой цели создано');
      } catch (notificationError) {
        console.error('❌ Ошибка при создании уведомления о цели:', notificationError);
      }

      return res.status(201).json(goal);
    } catch (error) {
      console.error('❌ Ошибка при создании цели (на сервере):', error);
      // Проверяем, не ошибка ли это от модели, связанная с уже существующей целью (если есть такая логика)
      // if (error.message.includes("уже существует")) {
      //    return res.status(409).json({ message: error.message });
      // }
      return res.status(500).json({ message: 'Ошибка сервера при создании цели' });
    }
  }
  
  static async getGoals(req, res) {
    try {
      const userId = req.user.id;
      const goals = await Goal.calculateAllProgress(userId);
      return res.json(goals);
    } catch (error) {
      console.error('Error getting goals:', error);
      return res.status(500).json({ message: 'Ошибка сервера' }); // Переведено
    }
  }
  
  static async getGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      const goal = await Goal.calculateProgress(goalId, userId);
      if (!goal) {
        return res.status(404).json({ message: 'Цель не найдена' }); // Переведено
      }
      return res.json(goal);
    } catch (error) {
      console.error('Error getting goal:', error);
      return res.status(500).json({ message: 'Ошибка сервера' }); // Переведено
    }
  }
  
  static async updateGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      const updateData = req.body;

      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Цель не найдена' }); // Переведено
      }

      const oldProgress = existingGoal.target_amount > 0
        ? (existingGoal.current_amount / existingGoal.target_amount) * 100
        : 0;

      const payload = { ...updateData };
      // ... (обработка payload) ...
      
      const updatedGoal = await Goal.update(goalId, payload, userId);
      if (!updatedGoal) {
        return res.status(500).json({ message: 'Не удалось обновить цель' }); // Переведено
      }

      const newProgress = updatedGoal.target_amount > 0
        ? (updatedGoal.current_amount / updatedGoal.target_amount) * 100
        : 0;

      const milestones = [100, 75, 50, 25];
      for (const milestone of milestones) {
        if (newProgress >= milestone && oldProgress < milestone) {
          try {
            await NotificationModel.create({
              userId: userId,
              type: 'goal_progress',
              message: `🎯 Вы достигли ${milestone}% из вашей цели "${updatedGoal.name}"!`, // Уже на русском
              relatedEntityId: updatedGoal.id
            });
            break; 
          } catch (notificationError) {
            console.error(`❌ Error creating notification for ${milestone}% milestone:`, notificationError);
          }
        }
      }
      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      return res.json(goalWithProgress || updatedGoal);
    } catch (error) {
      console.error('❌ Error updating goal:', error);
      return res.status(500).json({ message: 'Ошибка сервера при обновлении цели' }); // Переведено
    }
  }
  
  static async deleteGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      
      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Цель не найдена' }); // Переведено
      }
      
      await Goal.delete(goalId, userId);
      
      try {
        await NotificationModel.create({
          userId: userId,
          type: 'goal_deleted',
          message: `Цель "${existingGoal.name}" была удалена.`, // <--- ПЕРЕВЕДЕНО
          relatedEntityId: goalId
        });
      } catch (notificationError) {
        console.error('Failed to create notification for goal deletion:', notificationError);
      }

      return res.json({ message: 'Цель успешно удалена' }); // Переведено
    } catch (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({ message: 'Ошибка сервера' }); // Переведено
    }
  }
  
  static async updateGoalAmount(req, res) {
    try {
      const userId = req.user.id;
      const goalId = req.params.id;
      const { amount } = req.body;

      if (amount === undefined) {
        return res.status(400).json({ message: 'Требуется указать сумму' }); // Переведено
      }

      const existingGoal = await Goal.findById(goalId, userId);
      if (!existingGoal) {
        return res.status(404).json({ message: 'Цель не найдена' }); // Переведено
      }

      const updatedGoal = await Goal.updateAmount(goalId, parseFloat(amount), userId);

      const oldProgress = (existingGoal.current_amount / existingGoal.target_amount) * 100;
      const newProgress = (updatedGoal.current_amount / updatedGoal.target_amount) * 100;

      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (newProgress >= milestone && oldProgress < milestone) {
          try {
            await NotificationModel.create({
              userId,
              type: 'goal_progress',
              message: `Вы достигли ${milestone}% цели "${updatedGoal.name}"! Отличная работа!`, // Уже на русском
              relatedEntityId: goalId
            });
          } catch (notificationError) {
            console.error(`❌ Ошибка при создании уведомления на ${milestone}%:`, notificationError);
          }
        }
      }
      const goalWithProgress = await Goal.calculateProgress(goalId, userId);
      return res.json(goalWithProgress);
    } catch (error) {
      console.error('❌ Ошибка в updateGoalAmount:', error);
      return res.status(500).json({ message: 'Ошибка сервера' }); // Переведено
    }
  }
}

module.exports = GoalController;