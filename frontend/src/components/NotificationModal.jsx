import React, { useState, useEffect } from 'react';
import { IoClose, IoNotificationsOutline } from 'react-icons/io5';
import { FaUserMd, FaFlask, FaCalendarAlt, FaExclamationCircle, FaCheckCircle, FaPills, FaHeartbeat } from 'react-icons/fa';
import { MdAssignment, MdTransferWithinAStation } from 'react-icons/md';
import { useEscapeKey } from '../utils/useEscapeKey';
import notificationService from '../services/notificationService';

const NotificationModal = ({ isOpen, onClose, onPatientClick, onNotificationCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications from API
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await notificationService.getNotifications({ limit: 50 });
      
      if (result.success && result.data) {
        // Map API notifications to UI format
        const formattedNotifications = result.data.notifications.map(notif => ({
          ...notif,
          ...getNotificationStyle(notif.type, notif.priority),
          time: formatTimeAgo(notif.created_at),
          isRead: notif.is_read
        }));
        setNotifications(formattedNotifications);
        
        // Update notification count in parent
        if (onNotificationCountChange) {
          onNotificationCountChange(result.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Get notification style based on type and priority
  const getNotificationStyle = (type, priority) => {
    const styles = {
      pathway_transfer: {
        icon: MdTransferWithinAStation,
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200'
      },
      appointment: {
        icon: FaCalendarAlt,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      lab_results: {
        icon: FaFlask,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      },
      urgent: {
        icon: FaExclamationCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      task: {
        icon: MdAssignment,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      discharge: {
        icon: FaCheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      referral: {
        icon: FaUserMd,
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200'
      },
      general: {
        icon: IoNotificationsOutline,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    };

    // Use priority for high-priority notifications
    if (priority === 'high' || priority === 'urgent') {
      return {
        ...styles[type] || styles.general,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    return styles[type] || styles.general;
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  };

  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const markAsRead = async (id) => {
    try {
      const result = await notificationService.markAsRead(id);
      if (result.success) {
        const updatedNotifications = notifications.map(notif => 
          notif.id === id ? { ...notif, isRead: true, is_read: true } : notif
        );
        setNotifications(updatedNotifications);
        
        // Update unread count
        const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
        if (onNotificationCountChange) {
          onNotificationCountChange(newUnreadCount);
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await notificationService.markAllAsRead();
      if (result.success) {
        setNotifications(notifications.map(notif => ({ ...notif, isRead: true, is_read: true })));
        
        // Update unread count to 0
        if (onNotificationCountChange) {
          onNotificationCountChange(0);
        }
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click - navigate to patient details
  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // If notification has patient info, navigate to patient details
    if (notification.patient_name && onPatientClick) {
      onPatientClick(notification.patient_name, notification.patient_id, notification.metadata);
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-2xl max-h-[80vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <IoNotificationsOutline className="text-white text-2xl" />
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-teal-700 p-2 rounded-lg transition-colors"
            >
              <IoClose className="text-2xl" />
            </button>
          </div>
          
          {/* Unread count and Mark all as read */}
          <div className="flex items-center justify-between">
            <span className="text-teal-100 text-sm">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-white text-sm hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'unread'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <p className="text-center">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500 px-6 py-8">
              <FaExclamationCircle className="text-6xl mb-4" />
              <p className="text-center">{error}</p>
              <button 
                onClick={fetchNotifications}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Retry
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 py-8">
              <IoNotificationsOutline className="text-6xl mb-4" />
              <p className="text-center">No notifications to display</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const IconComponent = notification.icon;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex space-x-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${notification.bgColor} border ${notification.borderColor} flex items-center justify-center`}>
                        <IconComponent className={`text-lg ${notification.iconColor}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-teal-600 rounded-full ml-2 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
            View All Notifications
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;

