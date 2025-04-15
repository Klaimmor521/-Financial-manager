import React, { useState } from 'react';
import { useGoalContext } from '../context/GoalContext';

const GoalForm = ({ goal, onClose }) => {
  const isEdit = !!goal;
  const { createGoal, updateGoal } = useGoalContext();
  
  const [formData, setFormData] = useState({
    name: goal?.name || '',
    targetAmount: goal?.target_amount || '',
    currentAmount: goal?.current_amount || '0',
    targetDate: goal?.target_date ? goal.target_date.split('T')[0] : '',
    description: goal?.description || ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.targetAmount || isNaN(formData.targetAmount) || parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = 'Valid target amount is required';
    }
    
    if (formData.currentAmount && (isNaN(formData.currentAmount) || parseFloat(formData.currentAmount) < 0)) {
      newErrors.currentAmount = 'Current amount must be a positive number';
    }
    
    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else if (new Date(formData.targetDate) < new Date()) {
      newErrors.targetDate = 'Target date must be in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Создаем копию данных для отправки
      const data = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount || 0),
        description: formData.description
      };
      
      // Обрабатываем дату правильно, чтобы избежать смещения часового пояса
      if (formData.targetDate) {
        // Разбиваем дату на части
        const [year, month, day] = formData.targetDate.split('-').map(Number);
        
        // Создаем дату с временем полдня (чтобы избежать проблем с часовыми поясами)
        // Месяцы в JavaScript начинаются с 0, поэтому вычитаем 1 из месяца
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        
        // Форматируем дату в YYYY-MM-DD формат
        data.targetDate = date.toISOString().split('T')[0];
      }
      
      if (isEdit) {
        // Если мы редактируем и дата не изменилась, не отправляем её
        if (formData.targetDate !== goal.target_date.split('T')[0]) {
          // Используем обработанную дату
          await updateGoal(goal.id, data);
        } else {
          // Если дата не изменилась, удаляем её из данных
          delete data.targetDate;
          await updateGoal(goal.id, data);
        }
      } else {
        await createGoal(data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Goal Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : ''
          }`}
          placeholder="e.g. Save for vacation"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>
      
      <div>
        <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">
          Target Amount (₽) *
        </label>
        <input
          type="number"
          id="targetAmount"
          name="targetAmount"
          value={formData.targetAmount}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.targetAmount ? 'border-red-500' : ''
          }`}
          placeholder="50000"
          min="0"
          step="0.01"
        />
        {errors.targetAmount && <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>}
      </div>
      
      <div>
        <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700">
          Current Amount (₽)
        </label>
        <input
          type="number"
          id="currentAmount"
          name="currentAmount"
          value={formData.currentAmount}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.currentAmount ? 'border-red-500' : ''
          }`}
          placeholder="0"
          min="0"
          step="0.01"
        />
        {errors.currentAmount && <p className="mt-1 text-sm text-red-600">{errors.currentAmount}</p>}
      </div>
      
      <div>
        <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
          Target Date *
        </label>
        <input
          type="date"
          id="targetDate"
          name="targetDate"
          value={formData.targetDate}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            errors.targetDate ? 'border-red-500' : ''
          }`}
        />
        {errors.targetDate && <p className="mt-1 text-sm text-red-600">{errors.targetDate}</p>}
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Optional description of your goal"
        ></textarea>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;