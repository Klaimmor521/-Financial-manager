// NotificationCenter.js
import React from 'react';
import { useNotificationContext } from '../context/NotificationContext';
// Если будешь использовать иконки из библиотеки, например, react-icons
import { FaBell, FaCheck, FaTrashAlt, FaEnvelopeOpen, FaEnvelope } from 'react-icons/fa'; 

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationContext();

  const getNotificationIcon = (message) => {
    // Простая логика для определения иконки на основе сообщения
    // Ты можешь расширить это или передавать тип иконки с бэкенда
    if (message.toLowerCase().includes('goal') || message.toLowerCase().includes('цел')) {
      return <FaBell style={{ color: '#ffc107', marginRight: '8px' }} />; // Пример иконки цели (можно заменить на твою 🎯)
    }
    // Добавь другие условия для разных типов уведомлений
    return <FaEnvelope style={{ color: '#17a2b8', marginRight: '8px' }} />; // Дефолтная иконка
  };


  return (
    <div className="notification-center">
      <button
        className="notification-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Уведомления" // Добавим title для доступности
      >
        <FaBell /> {/* Иконка колокольчика */}
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {/* Добавим класс для анимации, если будешь ее делать */}
      {isOpen && (
        <div className="notification-panel"> {/* Можно добавить класс 'open' или управлять анимацией через React Transition Group */}
          <div className="notification-header">
            <h3>Уведомления</h3>
            {notifications.length > 0 && unreadCount > 0 && ( // Показываем кнопку, только если есть что помечать
              <button
                className="mark-all-read-btn" // Изменим класс для более специфичных стилей
                onClick={markAllAsRead}
                title="Отметить все как прочитанные"
              >
                <FaEnvelopeOpen /> {/* Иконка "все прочитаны" */}
                <span>Отметить все</span> {/* Текст можно оставить или убрать */}
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <p className="notification-message-info">Загрузка уведомлений...</p>
            ) : error ? (
              <p className="notification-message-error">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="notification-message-info">Нет новых уведомлений</p>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                >
                  <div className="notification-item-main">
                    <span className="notification-item-icon">
                      {/* Тут твоя иконка 🎯 или вызов getNotificationIcon(notification.message) */}
                      {/* Пример с твоей иконкой, если она приходит в message или есть отдельное поле */}
                      {notification.message.startsWith('🎯') ? '🎯' : getNotificationIcon(notification.message)}
                    </span>
                    <div className="notification-content">
                      <p dangerouslySetInnerHTML={{ __html: notification.message.replace(/^🎯\s*/, '') }}></p> {/* Удаляем иконку из текста, если она там есть */}
                      <span className="notification-date">
                        {new Date(notification.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="action-btn mark-read-btn"
                        title="Отметить как прочитанное"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="action-btn delete-notification-btn"
                      title="Удалить уведомление"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;