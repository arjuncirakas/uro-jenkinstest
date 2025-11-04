import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/notificationService.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get user's notifications
router.get('/', 
  generalLimiter,
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit, offset, unreadOnly } = req.query;
      
      const result = await getUserNotifications(userId, {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        unreadOnly: unreadOnly === 'true'
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  }
);

// Mark notification as read
router.patch('/:id/read',
  generalLimiter,
  authenticateToken,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;
      
      const result = await markNotificationAsRead(notificationId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  }
);

// Mark all notifications as read
router.patch('/mark-all-read',
  generalLimiter,
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const result = await markAllNotificationsAsRead(userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  }
);

// Delete notification
router.delete('/:id',
  generalLimiter,
  authenticateToken,
  async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;
      
      const result = await deleteNotification(notificationId, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification'
      });
    }
  }
);

export default router;




