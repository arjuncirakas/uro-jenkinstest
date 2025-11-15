import pool from '../config/database.js';

// Notification types
export const NotificationTypes = {
  PATHWAY_TRANSFER: 'pathway_transfer',
  APPOINTMENT: 'appointment',
  LAB_RESULTS: 'lab_results',
  URGENT: 'urgent',
  TASK: 'task',
  DISCHARGE: 'discharge',
  REFERRAL: 'referral',
  GENERAL: 'general'
};

// Create notifications table if it doesn't exist
export const initializeNotificationsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        patient_name VARCHAR(255),
        patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT false,
        priority VARCHAR(20) DEFAULT 'normal',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `);
    console.log('✅ Notifications table initialized');
  } catch (error) {
    console.error('Error initializing notifications table:', error);
  } finally {
    client.release();
  }
};

// Create a notification
export const createNotification = async ({
  userId,
  type = NotificationTypes.GENERAL,
  title,
  message,
  patientName = null,
  patientId = null,
  priority = 'normal',
  metadata = {}
}) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO notifications 
       (user_id, type, title, message, patient_name, patient_id, priority, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, type, title, message, patientName, patientId, priority, JSON.stringify(metadata)]
    );
    
    console.log(`✅ Notification created for user ${userId}: ${title}`);
    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

// Create notification for patient pathway transfer
export const createPathwayTransferNotification = async ({
  gpUserId,
  patientName,
  patientId,
  pathway,
  urologistName,
  reason = ''
}) => {
  const title = `Patient Transferred to ${pathway}`;
  const message = `${patientName} has been transferred to ${pathway} pathway by ${urologistName}.${reason ? ` Reason: ${reason}` : ''}`;
  
  return await createNotification({
    userId: gpUserId,
    type: NotificationTypes.PATHWAY_TRANSFER,
    title,
    message,
    patientName,
    patientId,
    priority: 'high',
    metadata: {
      pathway,
      urologistName,
      reason
    }
  });
};

// Get notifications for a user
export const getUserNotifications = async (userId, { limit = 50, offset = 0, unreadOnly = false } = {}) => {
  const client = await pool.connect();
  try {
    const whereClause = unreadOnly 
      ? 'WHERE user_id = $1 AND is_read = false'
      : 'WHERE user_id = $1';
    
    const query = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await client.query(query, [userId, limit, offset]);
    
    // Get unread count
    const countResult = await client.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    
    return {
      success: true,
      data: {
        notifications: result.rows,
        unreadCount: parseInt(countResult.rows[0].unread_count)
      }
    };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId, userId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Notification not found or unauthorized'
      };
    }
    
    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    
    return {
      success: true,
      message: 'All notifications marked as read'
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

// Delete a notification
export const deleteNotification = async (notificationId, userId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Notification not found or unauthorized'
      };
    }
    
    return {
      success: true,
      message: 'Notification deleted'
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

export default {
  NotificationTypes,
  initializeNotificationsTable,
  createNotification,
  createPathwayTransferNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};



























