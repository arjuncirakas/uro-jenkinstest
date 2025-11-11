import apiClient, { handleApiError } from '../config/axios.js';

class NotificationService {
  // Get all notifications for current user
  async getNotifications({ limit = 50, offset = 0, unreadOnly = false } = {}) {
    try {
      const response = await apiClient.get('/notifications', {
        params: { limit, offset, unreadOnly }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await this.getNotifications({ limit: 1, unreadOnly: false });
      return response.data?.unreadCount || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;

















