import React, { useState, useEffect } from 'react'; // Добавил useEffect для сброса формы
import { useGoalContext } from '../context/GoalContext';
// import { toast } from 'react-toastify'; // Если будешь использовать toast для серверных ошибок

const GoalForm = ({ goal, onClose }) => {
  const isEdit = !!goal;
  const { createGoal, updateGoal } = useGoalContext();
  
  const initialFormData = {
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> useEffect для заполнения формы при редактировании и сброса
  useEffect(() => {
    if (isEdit && goal) {
      setFormData({
        name: goal.name || '',
        targetAmount: goal.target_amount || '',
        currentAmount: goal.current_amount !== undefined ? String(goal.current_amount) : '0',
        targetDate: goal.target_date ? goal.target_date.split('T')[0] : '',
        description: goal.description || ''
      });
      setErrors({}); // Очищаем ошибки при загрузке данных для редактирования
    } else if (!isEdit) {
      setFormData(initialFormData); // Сброс формы при переключении на создание новой
      setErrors({});
    }
  }, [goal, isEdit]);
  // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец useEffect

  const validateForm = () => {
    const newErrors = {};
    const current = parseFloat(formData.currentAmount);
    const target = parseFloat(formData.targetAmount);
    const today = new Date();
    today.setHours(0,0,0,0);
    let formTargetDate = null;
    if(formData.targetDate) {
        formTargetDate = new Date(formData.targetDate + "T00:00:00"); // Добавляем время для корректного сравнения
    }


    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length > 25) { // Ты используешь 25, а не 50, как обсуждали ранее
      newErrors.name = 'Name cannot exceed 25 characters.';
    }
    
    if (!formData.targetAmount || isNaN(target) || target <= 0) {
      newErrors.targetAmount = 'Valid target amount is required';
    }
    
    if (formData.currentAmount && (isNaN(current) || current < 0)) {
      newErrors.currentAmount = 'Current amount must be a non-negative number';
    }

    if (!isNaN(current) && !isNaN(target) && current > target) {
      newErrors.currentAmount = 'Current amount cannot exceed target amount.';
    }
    
    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else if (formTargetDate && formTargetDate < today) { // Используем formTargetDate для сравнения
      newErrors.targetDate = 'Target date cannot be in the past.';
    }

    // Валидация для description
    if (formData.description.trim().length > 50) { // Ограничение в 50 символов
      newErrors.description = 'Description cannot exceed 50 characters.';
    }
    
    // setErrors(newErrors); // Установка ошибок будет в handleSubmit
    return newErrors; // Возвращаем объект ошибок
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Очистка ошибки для текущего поля при изменении
    if (errors[name]) {
      setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
    if (errors.form) { // Очистка общей ошибки формы
        setErrors(prevErrors => ({ ...prevErrors, form: null }));
    }
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Вызов валидации и установка ошибок
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец

    setErrors({}); // Очищаем ошибки, если валидация прошла
    setIsSubmitting(true);
    
    try {
      const data = {
        name: formData.name.trim(), // Обрезаем пробелы
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount || 0),
        description: formData.description.trim() // Обрезаем пробелы
      };
      
      if (formData.targetDate) {
        const [year, month, day] = formData.targetDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        data.targetDate = date.toISOString().split('T')[0];
      }
      
      if (isEdit) {
        // При редактировании, если дата не менялась, не отправляем ее,
        // чтобы бэкенд не пытался ее обновить без необходимости.
        // Это особенно важно, если формат даты из БД и инпута может немного отличаться.
        const originalTargetDate = goal?.target_date ? goal.target_date.split('T')[0] : null;
        if (formData.targetDate === originalTargetDate) {
          delete data.targetDate;
        }
        await updateGoal(goal.id, data);
      } else {
        await createGoal(data);
      }
      
      onClose(); // Закрываем модальное окно
    } catch (error) {
      console.error('Error submitting goal:', error.response || error);
      // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Установка серверной ошибки
      const serverError = error.response?.data?.message || error.response?.data?.error || 'Failed to save goal.';
      setErrors({ form: serverError }); // Общая ошибка формы
      // toast.error(serverError);
      // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Добавим класс goal-form-container для специфичных стилей, если понадобятся
    <form onSubmit={handleSubmit} className="goal-form-container space-y-4 p-1"> {/* p-1 для небольшого внутреннего отступа, если нужно */}
      {errors.form && <p className="error-message text-center mb-3">{errors.form}</p>}
  
      {/* Goal Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1"> {/* mb-1 для небольшого отступа снизу у лейбла */}
          Goal Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          maxLength={25}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.name ? 'input-error' : ''
          }`}
          placeholder="e.g. Save for vacation"
        />
        {errors.name && <p className="error-message">{errors.name}</p>}
      </div>
      
      {/* Target Amount */}
      <div>
        <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Target Amount (₽) *
        </label>
        <input
          type="number"
          id="targetAmount"
          name="targetAmount"
          value={formData.targetAmount}
          onChange={handleChange}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.targetAmount ? 'input-error' : ''
          }`}
          placeholder="50000"
          min="0"
          step="0.01"
        />
        {errors.targetAmount && <p className="error-message">{errors.targetAmount}</p>}
      </div>
      
      {/* Current Amount */}
      <div>
        <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Current Amount (₽)
        </label>
        <input
          type="number"
          id="currentAmount"
          name="currentAmount"
          value={formData.currentAmount}
          onChange={handleChange}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.currentAmount ? 'input-error' : ''
          }`}
          placeholder="0"
          min="0"
          step="0.01"
        />
        {errors.currentAmount && <p className="error-message">{errors.currentAmount}</p>}
      </div>
      
      {/* Target Date */}
      <div>
        <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
          Target Date *
        </label>
        <input
          type="date"
          id="targetDate"
          name="targetDate"
          value={formData.targetDate}
          onChange={handleChange}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.targetDate ? 'input-error' : ''
          }`}
        />
        {errors.targetDate && <p className="error-message">{errors.targetDate}</p>}
      </div>
      
      {/* Description - Измененная структура для лейбла слева */}
      <div className="goal-form-group-horizontal"> {/* Новый класс для горизонтального расположения */}
        <label htmlFor="description" className="goal-form-label-horizontal text-sm font-medium text-gray-700">
          Description <span className="text-xs text-gray-500">(max 50 chars)</span>
        </label>
        <div className="goal-form-input-wrapper"> {/* Обертка для инпута и ошибки */}
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="2" // Уменьшил количество строк для компактности
            maxLength={50}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.description ? 'input-error' : ''
            }`}
            placeholder="Optional description"
          ></textarea>
          {errors.description && <p className="error-message">{errors.description}</p>}
        </div>
      </div>
      
      {/* Buttons - добавим отступ сверху и выровняем */}
      <div className="goal-form-actions pt-4 flex justify-end space-x-3"> {/* pt-4 для отступа сверху, flex justify-end для выравнивания вправо */}
        <button
          type="button"
          onClick={onClose}
          // Используем более стандартные классы Tailwind для кнопок или твои .btn, если они переопределены
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;