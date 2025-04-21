import React from 'react';
import { useNotificationContext } from '../context/NotificationContext';

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

  return (
    <div className="notification-center">
      <button
        className="notification-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        Уведомления
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Уведомления</h3>
            {notifications.length > 0 && (
              <button
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                Отметить все как прочитанные
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <p>Загрузка...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="no-notifications">Нет новых уведомлений</p>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-date">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="mark-read"
                      >
                        Отметить как прочитанное
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="delete-notification"
                    >
                      Удалить
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