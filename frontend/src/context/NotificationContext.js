import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationService } from '../services/notificationService';

const NotificationContext = createContext();

export const useNotificationContext = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!localStorage.getItem('token')) return;
    
    setLoading(true);
    try {
      const data = await NotificationService.fetchNotifications();
      setNotifications(data);
      await updateUnreadCount();
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };
  

  const updateUnreadCount = async () => {
    if (!localStorage.getItem('token')) return;
    
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await NotificationService.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await NotificationService.deleteNotification(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  // Загружаем уведомления при монтировании компонента
  useEffect(() => {
    const token = localStorage.getItem('token'); // Check token inside effect
    let intervalId = null; // Initialize intervalId

    if (token) {
      fetchNotifications(); // Initial fetch

      // --- Start Polling ---
      // Remove the old interval for updateUnreadCount if you replace it
      // const interval = setInterval(updateUnreadCount, 60000); // Remove this line

      // Add the new interval to fetch all notifications periodically
      intervalId = setInterval(() => {
        console.log('Polling for notifications...'); // Optional: log polling activity
        fetchNotifications(); // Call the function to fetch all notifications
      }, 5000); // Fetch every ? seconds
      // --- End Polling ---

    } else {
       // Clear state if no token (optional, depends on desired behavior on logout)
       setNotifications([]);
       setUnreadCount(0);
    }

    // Cleanup function: clear interval when component unmounts or token changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('Cleared notification polling interval.'); // Optional log
      }
    };
    // Rerun effect if the token changes (e.g., on login/logout)
    // You might need to add a dependency on the token if it can change
    // while the provider is mounted, or manage this via app structure.
    // For simplicity, keeping [] runs it once on mount. If login/logout
    // remounts the app/provider, this is fine.
  }, []); // Empty dependency array means run once on mount

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    isOpen,
    setIsOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};