const NotificationModel = require('../models/notificationModel');

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const notifications = await NotificationModel.findAllForUser(userId);
      return res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await NotificationModel.getUnreadCount(userId);
      return res.json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;
      const notification = await NotificationModel.markAsRead(notificationId, userId);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      return res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await NotificationModel.markAllAsRead(userId);
      return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;
      const result = await NotificationModel.delete(notificationId, userId);
      
      if (!result) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      return res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = NotificationController;