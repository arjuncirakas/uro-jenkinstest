import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationModal from '../NotificationModal';
import notificationService from '../../services/notificationService';

// Mock dependencies
vi.mock('../../services/notificationService', () => ({
  default: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  }
}));

vi.mock('../../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn((callback) => {
    // Simulate escape key press
    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          callback();
        }
      });
    }
  })
}));

describe('NotificationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnPatientClick = vi.fn();
  const mockOnNotificationCountChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0
      }
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <NotificationModal
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText(/notifications/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', async () => {
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      });
    });

    it('should fetch notifications on open', async () => {
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(notificationService.getNotifications).toHaveBeenCalledWith({ limit: 50 });
      });
    });

    it('should display notifications', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'appointment',
          message: 'New appointment scheduled',
          created_at: new Date().toISOString(),
          is_read: false
        }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('New appointment scheduled')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter by all notifications', async () => {
      const mockNotifications = [
        { id: 1, message: 'Unread', is_read: false, created_at: new Date().toISOString() },
        { id: 2, message: 'Read', is_read: true, created_at: new Date().toISOString() }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Unread')).toBeInTheDocument();
        expect(screen.getByText('Read')).toBeInTheDocument();
      });
    });

    it('should filter by unread notifications', async () => {
      const mockNotifications = [
        { id: 1, message: 'Unread', is_read: false, created_at: new Date().toISOString() },
        { id: 2, message: 'Read', is_read: true, created_at: new Date().toISOString() }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        const unreadButton = screen.getByText(/unread/i);
        fireEvent.click(unreadButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Unread')).toBeInTheDocument();
        expect(screen.queryByText('Read')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read', async () => {
      const mockNotifications = [
        {
          id: 1,
          message: 'Test notification',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      notificationService.markAsRead.mockResolvedValue({
        success: true
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
          onNotificationCountChange={mockOnNotificationCountChange}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });
      
      const markAsReadButton = screen.getByText(/mark as read/i);
      fireEvent.click(markAsReadButton);
      
      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('should mark all as read', async () => {
      notificationService.markAllAsRead.mockResolvedValue({
        success: true
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
          onNotificationCountChange={mockOnNotificationCountChange}
        />
      );
      
      await waitFor(() => {
        const markAllButton = screen.getByText(/mark all as read/i);
        fireEvent.click(markAllButton);
      });
      
      await waitFor(() => {
        expect(notificationService.markAllAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Patient Click', () => {
    it('should call onPatientClick when notification is clicked', async () => {
      const mockNotifications = [
        {
          id: 1,
          message: 'Test notification',
          patient_id: 123,
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
          onPatientClick={mockOnPatientClick}
        />
      );
      
      await waitFor(() => {
        const notification = screen.getByText('Test notification');
        fireEvent.click(notification);
      });
      
      expect(mockOnPatientClick).toHaveBeenCalledWith(123);
    });
  });

  describe('Notification Count', () => {
    it('should call onNotificationCountChange with unread count', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: [],
          unreadCount: 5
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
          onNotificationCountChange={mockOnNotificationCountChange}
        />
      );
      
      await waitFor(() => {
        expect(mockOnNotificationCountChange).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error', async () => {
      notificationService.getNotifications.mockRejectedValue(new Error('Fetch failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });

    it('should display error message', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: false,
        error: 'Failed to load'
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
      });
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onPatientClick', async () => {
      const mockNotifications = [
        {
          id: 1,
          message: 'Test notification',
          patient_id: 123,
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];
      
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
          onPatientClick={null}
        />
      );
      
      await waitFor(() => {
        const notification = screen.getByText('Test notification');
        fireEvent.click(notification);
      });
      
      // Should not crash
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });

    it('should handle empty notifications', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0
        }
      });
      
      render(
        <NotificationModal
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });
  });
});
