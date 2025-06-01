import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
// import { toast } from 'react-toastify'; // Если используешь toast для серверных ошибок

const TransactionForm = ({ editTransaction, setEditTransaction, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: '',
    description: '', // Добавим, если нужно, по умолчанию пустая строка
  });
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({}); // Состояние для ошибок уже есть, отлично!

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        amount: editTransaction.amount || '', // Добавим || '' на случай если поля могут быть null/undefined
        type: editTransaction.type || 'expense',
        category: editTransaction.categoryId || editTransaction.category || '',
        date: editTransaction.date ? editTransaction.date.split('T')[0] : '',
        description: editTransaction.description || '', // Если редактируем, подставляем описание
      });
      setErrors({}); // Очищаем ошибки при загрузке данных для редактирования
    } else {
      // Сброс формы при переключении с редактирования на создание новой
      setFormData({
        amount: '',
        type: 'expense',
        category: '',
        date: '',
        description: '',
      });
      setErrors({});
    }
  }, [editTransaction]);

  const token = localStorage.getItem('token');

  const fetchCategories = async () => {
    try {
      // Проверяем, есть ли токен перед запросом
      if (!token) {
        console.error('Нет токена для загрузки категорий');
        return;
      }
      const res = await axios.get(`http://localhost:5000/api/categories/type/${formData.type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      // Можно отобразить ошибку пользователю, если категории критичны
      // toast.error('Failed to load categories.');
    }
  };

  useEffect(() => {
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type, token]); // Добавляем token в зависимости, если он может меняться (маловероятно, но для полноты)

  const validateForm = (data) => {
    const newErrors = {};
    
    // --- НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ДАТЫ ---
    const today = new Date();
    // Форматируем 'today' в YYYY-MM-DD для сравнения
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
    let transactionDateFormatted = null;
    let transactionDateValid = true;
  
    if (data.date) { // data.date - это строка "YYYY-MM-DD" из input
      transactionDateFormatted = data.date; // Уже в нужном формате
      // Проверим, валидна ли сама по себе дата (например, не 30 февраля)
      const dateParts = data.date.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]); // 1-12
      const day = parseInt(dateParts[2]);
      const tempDate = new Date(year, month - 1, day); // Месяцы 0-11
  
      if (
        !(tempDate.getFullYear() === year &&
        tempDate.getMonth() === month - 1 &&
        tempDate.getDate() === day)
      ) {
        newErrors.date = 'Введена неверная дата (например, несуществующий день/месяц).';
        transactionDateValid = false;
      }
  
    } else {
      newErrors.date = 'Обязательна дата.';
      transactionDateValid = false;
    }
  
    if (transactionDateValid && transactionDateFormatted && transactionDateFormatted > todayFormatted) {
      // Сравниваем строки "YYYY-MM-DD" > "YYYY-MM-DD"
      // Это сработает, так как лексикографическое сравнение даст правильный результат для этого формата
      newErrors.date = 'Дата транзакции не может быть в будущем.';
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ ДАТЫ ---
  
    // Валидация Amount
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
      newErrors.amount = 'Сумма должна быть положительным числом.';
    }
  
    // Валидация Category
    if (!data.category) {
      newErrors.category = 'Категория обязательна.';
    }
  
    // Валидация Description
    if (data.description && data.description.length > 50) {
      newErrors.description = 'Длина описания не должна превышать 50 символов.';
    }
  
    return newErrors;
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Вызов валидации и установка ошибок
    const formErrors = validateForm(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return; // Прерываем отправку, если есть ошибки
    }
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец

    setErrors({}); // Очищаем ошибки, если валидация прошла

    try {
      const payload = {
        amount: parseFloat(formData.amount), // Убедимся, что amount это число
        type: formData.type,
        categoryId: formData.category,
        date: formData.date,
        description: formData.description || null, // Отправляем null, если описание пустое, или пустую строку
      };

      if (editTransaction) {
        await axios.put(
          `http://localhost:5000/api/transactions/${editTransaction.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditTransaction(null); // Сбрасываем режим редактирования
      } else {
        await axios.post(
          'http://localhost:5000/api/transactions',
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Сброс формы после успешной отправки
      setFormData({ amount: '', type: 'expense', category: '', date: '', description: '' });
      if (onSuccess) {
        onSuccess(); // Вызываем колбэк для обновления списка/других действий
      }
    } catch (err) {
      console.error('Ошибка при отправке транзакции:', err.response || err);
      // Отображение серверной ошибки
      const serverError = err.response?.data?.message || err.response?.data?.error || 'Не удалось отправить транзакцию.';
      setErrors({ form: serverError }); // Устанавливаем общую ошибку формы
      // toast.error(serverError); // или используем toast
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Очистка ошибки для текущего поля при изменении
    if (errors[name]) {
      setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
    // Очистка общей ошибки формы, если пользователь начинает вводить данные снова
    if (errors.form) {
        setErrors(prevErrors => ({...prevErrors, form: null}));
    }
    // --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец
  };

  return (
    <div className="transaction-form" id="transaction-form">
      <h2>{editTransaction ? 'Редактировать' : 'Добавить'} транзакцию</h2>
      {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Отображение общей ошибки формы */}
      {errors.form && <p className="error-message" style={{textAlign: 'center', marginBottom: '10px'}}>{errors.form}</p>}
      {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Конец */}
      <form onSubmit={handleTransactionSubmit}>
        <div> {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Обертка для поля и его ошибки */}
          <input type="number" name="amount" placeholder="Сумма" value={formData.amount} onChange={handleInputChange} />
          {errors.amount && <p className="error-message">{errors.amount}</p>}
        </div>
        
        <div> {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Обертка для поля и его ошибки */}
          <select name="type" value={formData.type} onChange={handleInputChange}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
          {/* Ошибки для type обычно не нужны, если есть значение по умолчанию */}
        </div>

        <div> {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Обертка для поля и его ошибки */}
          <select name="category" value={formData.category} onChange={handleInputChange} >
            <option value="">Выберите категорию</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="error-message">{errors.category}</p>}
        </div>

        <div> {/* --- ИЗМЕНЕНИЕ/ДОБАВЛЕНИЕ ---> Обертка для поля и его ошибки */}
          <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
          {errors.date && <p className="error-message">{errors.date}</p>}
        </div>

        {/* Если нужно поле Description: */}
        <div>
          <input
            type="text"
            name="description"
            placeholder="Описание (необязательно)"
            value={formData.description}
            onChange={handleInputChange}
          />
          {errors.description && <p className="error-message">{errors.description}</p>}
        </div>

        <button type="submit">{editTransaction ? 'Сохранить' : 'Добавить'}</button>
      </form>
    </div>
  );
};

TransactionForm.propTypes = {
  editTransaction: PropTypes.object,
  setEditTransaction: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default TransactionForm;