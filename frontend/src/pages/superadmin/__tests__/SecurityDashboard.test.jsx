import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SecurityDashboard from '../SecurityDashboard';
import { securityDashboardService } from '../../../services/securityDashboardService';
import React from 'react';

// Mock services
vi.mock('../../../services/securityDashboardService', () => ({
  securityDashboardService: {
    getSecurityAlerts: vi.fn(),
    getAlertStats: vi.fn(),
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn()
  }
}));

// Mock SecurityTeamModal
vi.mock('../../../components/modals/SecurityTeamModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="security-team-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  )
}));

// Mock DPOContactModal
vi.mock('../../../components/modals/DPOContactModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="dpo-contact-modal">
        <button onClick={onClose}>Close DPO Modal</button>
      </div>
    ) : null
  )
}));

describe('SecurityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render security dashboard', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Security Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Manage Security Team')).toBeInTheDocument();
    });

    it('should display alert list', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            alert_type: 'multiple_failed_logins',
            severity: 'high',
            status: 'new',
            message: 'Test alert',
            created_at: new Date().toISOString()
          }
        ]
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 1,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          byStatus: { new: 1, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test alert')).toBeInTheDocument();
      });
    });

    it('should display alert statistics', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 5,
          bySeverity: { critical: 2, high: 2, medium: 1, low: 0 },
          byStatus: { new: 3, acknowledged: 1, resolved: 1 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total alerts
      });
    });

    it('should show "Manage Security Team" button', () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Manage Security Team')).toBeInTheDocument();
    });

    it('should show "Add DPO Contact" button', () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Add DPO Contact')).toBeInTheDocument();
    });
  });

  describe('Alert Management', () => {
    it('should filter alerts by severity', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        const severitySelect = screen.getByLabelText(/severity/i);
        fireEvent.change(severitySelect, { target: { value: 'critical' } });
      });

      await waitFor(() => {
        expect(securityDashboardService.getSecurityAlerts).toHaveBeenCalledWith(
          expect.objectContaining({ severity: 'critical' })
        );
      });
    });

    it('should filter alerts by status', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/status/i);
        fireEvent.change(statusSelect, { target: { value: 'new' } });
      });

      await waitFor(() => {
        expect(securityDashboardService.getSecurityAlerts).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'new' })
        );
      });
    });

    it('should acknowledge alert', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            alert_type: 'test',
            severity: 'high',
            status: 'new',
            message: 'Test alert',
            created_at: new Date().toISOString()
          }
        ]
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 1,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          byStatus: { new: 1, acknowledged: 0, resolved: 0 }
        }
      });
      securityDashboardService.acknowledgeAlert.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge');
        fireEvent.click(acknowledgeButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.acknowledgeAlert).toHaveBeenCalledWith(1);
      });
    });

    it('should resolve alert', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            alert_type: 'test',
            severity: 'high',
            status: 'acknowledged',
            message: 'Test alert',
            created_at: new Date().toISOString()
          }
        ]
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 1,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 1, resolved: 0 }
        }
      });
      securityDashboardService.resolveAlert.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        const resolveButton = screen.getByText('Resolve');
        fireEvent.click(resolveButton);
      });

      await waitFor(() => {
        expect(securityDashboardService.resolveAlert).toHaveBeenCalledWith(1);
      });
    });

    it('should handle error when acknowledging alert', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            alert_type: 'test',
            severity: 'high',
            status: 'new',
            message: 'Test alert',
            created_at: new Date().toISOString()
          }
        ]
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 1,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          byStatus: { new: 1, acknowledged: 0, resolved: 0 }
        }
      });
      securityDashboardService.acknowledgeAlert.mockResolvedValue({
        success: false,
        error: 'Failed to acknowledge'
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        const acknowledgeButton = screen.getByText('Acknowledge');
        fireEvent.click(acknowledgeButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to acknowledge/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security Team Management', () => {
    it('should open security team modal on button click', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      const manageButton = screen.getByText('Manage Security Team');
      fireEvent.click(manageButton);

      await waitFor(() => {
        expect(screen.getByTestId('security-team-modal')).toBeInTheDocument();
      });
    });

    it('should close modal', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      const manageButton = screen.getByText('Manage Security Team');
      fireEvent.click(manageButton);

      await waitFor(() => {
        expect(screen.getByTestId('security-team-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('security-team-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('DPO Contact Management', () => {
    it('should open DPO contact modal on button click', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      const dpoButton = screen.getByText('Add DPO Contact');
      fireEvent.click(dpoButton);

      await waitFor(() => {
        expect(screen.getByTestId('dpo-contact-modal')).toBeInTheDocument();
      });
    });

    it('should close DPO modal', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      const dpoButton = screen.getByText('Add DPO Contact');
      fireEvent.click(dpoButton);

      await waitFor(() => {
        expect(screen.getByTestId('dpo-contact-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close DPO Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dpo-contact-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should display no alerts state', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: true,
        data: []
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No security alerts found')).toBeInTheDocument();
      });
    });

    it('should display loading state', async () => {
      securityDashboardService.getSecurityAlerts.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      securityDashboardService.getAlertStats.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading alerts...')).toBeInTheDocument();
    });

    it('should display error state', async () => {
      securityDashboardService.getSecurityAlerts.mockResolvedValue({
        success: false,
        error: 'Failed to fetch alerts'
      });
      securityDashboardService.getAlertStats.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          byStatus: { new: 0, acknowledged: 0, resolved: 0 }
        }
      });

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch alerts')).toBeInTheDocument();
      });
    });

    it('should handle network failures', async () => {
      securityDashboardService.getSecurityAlerts.mockRejectedValue(
        new Error('Network error')
      );
      securityDashboardService.getAlertStats.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <MemoryRouter>
          <SecurityDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch security data')).toBeInTheDocument();
      });
    });
  });
});
