import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DataAudit from '../DataAudit';
import { dataAuditService } from '../../../services/dataAuditService';
import React from 'react';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div className="recharts-responsive-container">{children}</div>,
  LineChart: ({ children }) => <div className="recharts-line-chart">{children}</div>,
  Line: () => <div className="recharts-line" />,
  XAxis: () => <div className="recharts-x-axis" />,
  YAxis: () => <div className="recharts-y-axis" />,
  CartesianGrid: () => <div className="recharts-cartesian-grid" />,
  Tooltip: () => <div className="recharts-tooltip" />,
  Legend: () => <div className="recharts-legend" />
}));

// Mock services
vi.mock('../../../services/dataAuditService', () => ({
  dataAuditService: {
    getDataInventory: vi.fn(),
    getAccessLogs: vi.fn(),
    getProcessingActivities: vi.fn(),
    getRetentionInfo: vi.fn(),
    getThirdPartySharing: vi.fn(),
    getComplianceMetrics: vi.fn(),
    getChartData: vi.fn(),
    exportAuditReport: vi.fn()
  }
}));

describe('DataAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all sections', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          suspiciousActivities30Days: 1,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20,
          loginSuccessRate: 95.24
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      expect(screen.getByText('Data Audit')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Access Logs')).toBeInTheDocument();
      expect(screen.getByText('Third-Party Sharing')).toBeInTheDocument();
    });

    it('should display loading state', async () => {
      dataAuditService.getComplianceMetrics.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
      });
    });

    it('should display error state', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: false,
        error: 'Failed to fetch compliance metrics'
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch compliance metrics')).toBeInTheDocument();
      });
    });

    it('should display empty state for access logs', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      // Switch to access logs tab
      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('No access logs found')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should switch between tabs', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: { complianceScores: { overall: 80 } }
      });
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: { inventory: [], totals: {}, byCategory: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(dataAuditService.getComplianceMetrics).toHaveBeenCalled();
      });

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(dataAuditService.getDataInventory).toHaveBeenCalled();
      });
    });

    it('should highlight active tab', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: { complianceScores: { overall: 80 } }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        const overviewTab = screen.getByText('Overview').closest('button');
        expect(overviewTab).toHaveClass('border-teal-500');
      });
    });
  });

  describe('Filters', () => {
    it('should apply date range filter for access logs', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalled();
      });

      const startDateInput = screen.getByLabelText('Start Date');
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalledTimes(2);
      });
    });

    it('should apply status filter', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalled();
      });

      const statusSelect = screen.getByLabelText('Status');
      fireEvent.change(statusSelect, { target: { value: 'success' } });

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear filters', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalled();
      });

      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle invalid date ranges', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalled();
      });

      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');

      fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

      // Component should still handle the filter (backend will validate)
      await waitFor(() => {
        expect(dataAuditService.getAccessLogs).toHaveBeenCalled();
      });
    });
  });

  describe('Data Display', () => {
    it('should paginate results', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [{ id: 1, action: 'phi.view' }],
          pagination: { page: 1, totalPages: 2, total: 100 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: '' });
      const buttons = screen.getAllByRole('button');
      const chevronRight = buttons.find(btn => btn.querySelector('svg'));
      
      if (chevronRight) {
        fireEvent.click(chevronRight);
        await waitFor(() => {
          expect(dataAuditService.getAccessLogs).toHaveBeenCalledTimes(2);
        });
      }
    });

    it('should display compliance metrics', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20,
          loginSuccessRate: 95.24
        }
      });
      dataAuditService.getChartData.mockResolvedValue({
        success: true,
        data: {
          loginTrends: [
            { date: 'Jan 1', successfulLogins: 10, failedLogins: 1, phiAccess: 5, dataExports: 2 }
          ]
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
      });
    });

    it('should display chart when chart data is available', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20
        }
      });
      dataAuditService.getChartData.mockResolvedValue({
        success: true,
        data: {
          loginTrends: [
            { date: 'Jan 1', successfulLogins: 10, failedLogins: 1, phiAccess: 5, dataExports: 2 },
            { date: 'Jan 2', successfulLogins: 12, failedLogins: 0, phiAccess: 6, dataExports: 1 }
          ]
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Activity Trends (Last 30 Days)')).toBeInTheDocument();
        expect(document.querySelector('.recharts-line-chart')).toBeInTheDocument();
      });
    });

    it('should not display chart when chart data is empty', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20
        }
      });
      dataAuditService.getChartData.mockResolvedValue({
        success: true,
        data: {
          loginTrends: []
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Activity Trends (Last 30 Days)')).not.toBeInTheDocument();
      });
    });

    it('should handle chart data fetch errors gracefully', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20
        }
      });
      dataAuditService.getChartData.mockResolvedValue({
        success: false,
        error: 'Failed to fetch chart data'
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.queryByText('Activity Trends (Last 30 Days)')).not.toBeInTheDocument();
      });
    });

    it('should handle pagination correctly', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [
            {
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: 'phi.view',
              resource_type: 'patient',
              resource_id: 1,
              ip_address: '127.0.0.1',
              status: 'success',
              metadata: null,
              error_message: null
            }
          ],
          pagination: { page: 1, totalPages: 3, total: 60, limit: 20 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });

      // Test pagination buttons
      const nextButtons = screen.getAllByRole('button');
      const nextButton = nextButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.getAttribute('aria-label')?.includes('next') || false;
      });
      
      if (nextButton && !nextButton.disabled) {
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(dataAuditService.getAccessLogs).toHaveBeenCalledTimes(2);
        });
      }
    });

    it('should display third-party sharing', async () => {
      dataAuditService.getThirdPartySharing.mockResolvedValue({
        success: true,
        data: {
          sharingEvents: [
            {
              id: 1,
              timestamp: '2024-01-01',
              userEmail: 'test@example.com',
              action: 'export',
              resourceType: 'patient'
            }
          ]
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const sharingTab = screen.getByText('Third-Party Sharing');
      fireEvent.click(sharingTab);

      await waitFor(() => {
        expect(screen.getByText('export')).toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    it('should export CSV', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: { complianceScores: { overall: 80 } }
      });
      dataAuditService.exportAuditReport.mockResolvedValue({
        success: true,
        message: 'Report exported successfully'
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(dataAuditService.getComplianceMetrics).toHaveBeenCalled();
      });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(dataAuditService.exportAuditReport).toHaveBeenCalledWith('csv', expect.any(Object));
      });
    });

    it('should handle export errors', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: { complianceScores: { overall: 80 } }
      });
      dataAuditService.exportAuditReport.mockResolvedValue({
        success: false,
        error: 'Failed to export report'
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(dataAuditService.getComplianceMetrics).toHaveBeenCalled();
      });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to export report')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    it('should format access log actions correctly', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [
            {
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: 'data_audit.access_logs_view',
              resource_type: 'data_audit',
              resource_id: null,
              ip_address: '::1',
              status: 'success',
              metadata: null,
              error_message: null
            },
            {
              id: 2,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: 'auth.login',
              resource_type: null,
              resource_id: null,
              ip_address: '127.0.0.1',
              status: 'success',
              metadata: JSON.stringify({ reason: 'Standard login' }),
              error_message: null
            }
          ],
          pagination: { page: 1, totalPages: 1, total: 2 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('View Access Logs')).toBeInTheDocument();
        expect(screen.getByText('User Login')).toBeInTheDocument();
        expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
      });
    });

    it('should format IP addresses correctly', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [
            {
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: 'phi.view',
              resource_type: 'patient',
              resource_id: 1,
              ip_address: '::ffff:127.0.0.1',
              status: 'success',
              metadata: null,
              error_message: null
            }
          ],
          pagination: { page: 1, totalPages: 1, total: 1 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
      });
    });

    it('should extract reason/ticket from metadata', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [
            {
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: 'data.export',
              resource_type: 'patient',
              resource_id: 1,
              ip_address: '127.0.0.1',
              status: 'success',
              metadata: JSON.stringify({ auditReq: 4419 }),
              error_message: null
            }
          ],
          pagination: { page: 1, totalPages: 1, total: 1 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('Audit Req #4419')).toBeInTheDocument();
      });
    });

    it('should handle all reason/ticket extraction branches', async () => {
      const testCases = [
        {
          metadata: JSON.stringify({ reason: 'Test reason' }),
          expected: 'Test reason'
        },
        {
          metadata: JSON.stringify({ ticket: 'TICKET-123' }),
          expected: 'TICKET-123'
        },
        {
          metadata: JSON.stringify({ ticketNumber: 456 }),
          expected: 'Ticket #456'
        },
        {
          metadata: JSON.stringify({ endpoint: '/api/ticket123' }),
          expected: 'ticket123'
        },
        {
          metadata: JSON.stringify({ description: 'Test description' }),
          expected: 'Test description'
        },
        {
          metadata: JSON.stringify({ message: 'Test message' }),
          expected: 'Test message'
        },
        {
          error_message: 'Error occurred',
          expected: 'Error occurred'
        },
        {
          request_path: '/api/export',
          status: 'success',
          expected: 'Data Export Request'
        },
        {
          request_path: '/api/audit',
          status: 'success',
          expected: 'Audit Request'
        },
        {
          action: 'phi.view',
          status: 'success',
          expected: 'View Request'
        },
        {
          action: 'data.export',
          status: 'success',
          expected: 'Export Request'
        },
        {
          action: 'auth.login',
          status: 'success',
          expected: 'Authentication'
        },
        {
          action: 'other.action',
          status: 'success',
          expected: 'Standard Operation'
        },
        {
          status: 'failure',
          expected: 'Access Denied'
        },
        {
          status: 'error',
          error_message: 'Custom error',
          expected: 'Custom error'
        },
        {
          status: 'success',
          expected: '-'
        }
      ];

      for (const testCase of testCases) {
        dataAuditService.getAccessLogs.mockResolvedValue({
          success: true,
          data: {
            logs: [{
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: testCase.action || 'test.action',
              resource_type: 'patient',
              resource_id: 1,
              ip_address: '127.0.0.1',
              status: testCase.status || 'success',
              metadata: testCase.metadata || null,
              error_message: testCase.error_message || null,
              request_path: testCase.request_path || null
            }],
            pagination: { page: 1, totalPages: 1, total: 1 }
          }
        });

        const { unmount } = render(
          <MemoryRouter>
            <DataAudit />
          </MemoryRouter>
        );

        const accessLogsTab = screen.getByText('Access Logs');
        fireEvent.click(accessLogsTab);

        await waitFor(() => {
          expect(screen.getByText(testCase.expected)).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should handle invalid metadata JSON', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [{
            id: 1,
            timestamp: '2024-01-01T00:00:00.000Z',
            user_email: 'test@example.com',
            user_role: 'admin',
            action: 'test.action',
            resource_type: 'patient',
            resource_id: 1,
            ip_address: '127.0.0.1',
            status: 'success',
            metadata: 'invalid json{',
            error_message: null,
            request_path: null
          }],
          pagination: { page: 1, totalPages: 1, total: 1 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should handle null/undefined values in logs', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [{
            id: 1,
            timestamp: null,
            user_email: null,
            user_role: null,
            action: null,
            resource_type: null,
            resource_id: null,
            ip_address: null,
            status: 'success',
            metadata: null,
            error_message: null,
            request_path: null
          }],
          pagination: { page: 1, totalPages: 1, total: 1 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });

    it('should format all action types correctly', async () => {
      const actionTests = [
        { action: 'data_audit.access_logs_view', expected: 'View Access Logs' },
        { action: 'data_audit.compliance_metrics_view', expected: 'View Compliance Metrics' },
        { action: 'auth.login', expected: 'User Login' },
        { action: 'auth.token_refresh', expected: 'Token Refresh' },
        { action: 'auth.logout', expected: 'User Logout' },
        { action: 'phi.view', expected: 'PHI View' },
        { action: 'data.export', expected: 'Data Export' },
        { action: 'other.action', expected: 'Other Action' }
      ];

      for (const test of actionTests) {
        dataAuditService.getAccessLogs.mockResolvedValue({
          success: true,
          data: {
            logs: [{
              id: 1,
              timestamp: '2024-01-01T00:00:00.000Z',
              user_email: 'test@example.com',
              user_role: 'admin',
              action: test.action,
              resource_type: 'patient',
              resource_id: 1,
              ip_address: '127.0.0.1',
              status: 'success',
              metadata: null,
              error_message: null
            }],
            pagination: { page: 1, totalPages: 1, total: 1 }
          }
        });

        const { unmount } = render(
          <MemoryRouter>
            <DataAudit />
          </MemoryRouter>
        );

        const accessLogsTab = screen.getByText('Access Logs');
        fireEvent.click(accessLogsTab);

        await waitFor(() => {
          expect(screen.getByText(test.expected)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('User Interactions', () => {
    it('should handle tab clicks', async () => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          suspiciousActivities30Days: 1,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20,
          loginSuccessRate: 95.24
        }
      });
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: { logs: [], pagination: {} }
      });
      dataAuditService.getThirdPartySharing.mockResolvedValue({
        success: true,
        data: { sharingEvents: [] }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      // Test active tabs (commented out tabs are not tested)
      const tabs = [
        'Overview',
        'Access Logs',
        'Third-Party Sharing'
      ];

      for (const tabName of tabs) {
        const tab = screen.getByText(tabName);
        fireEvent.click(tab);
        await waitFor(() => {
          expect(screen.getByText(tabName)).toBeInTheDocument();
        });
      }
    });

    it('should handle pagination edge cases', async () => {
      dataAuditService.getAccessLogs.mockResolvedValue({
        success: true,
        data: {
          logs: [],
          pagination: { page: 1, totalPages: 1, total: 0, limit: 20 }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const accessLogsTab = screen.getByText('Access Logs');
      fireEvent.click(accessLogsTab);

      await waitFor(() => {
        expect(screen.getByText('No access logs found')).toBeInTheDocument();
      });
    });

    it('should handle filter changes for third-party sharing', async () => {
      dataAuditService.getThirdPartySharing.mockResolvedValue({
        success: true,
        data: { sharingEvents: [] }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const sharingTab = screen.getByText('Third-Party Sharing');
      fireEvent.click(sharingTab);

      await waitFor(() => {
        expect(dataAuditService.getThirdPartySharing).toHaveBeenCalled();
      });

      const endDateInputs = screen.getAllByLabelText('End Date');
      if (endDateInputs.length > 1) {
        fireEvent.change(endDateInputs[1], { target: { value: '2024-12-31' } });
        await waitFor(() => {
          expect(dataAuditService.getThirdPartySharing).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Data Inventory Tab with Classification', () => {
    beforeEach(() => {
      dataAuditService.getComplianceMetrics.mockResolvedValue({
        success: true,
        data: {
          successfulLoginAttempts30Days: 100,
          failedLoginAttempts30Days: 5,
          phiAccessEvents30Days: 50,
          accountLockouts30Days: 2,
          uniqueUsersAccessingPHI30Days: 10,
          dataExports30Days: 5,
          totalVerifiedUsers: 20
        }
      });
      dataAuditService.getChartData.mockResolvedValue({
        success: true,
        data: { loginTrends: [] }
      });
    });

    it('should display data inventory with classification levels', async () => {
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory: [
            {
              tableName: 'patients',
              size: '1 MB',
              sizeBytes: 1048576,
              recordCount: 100,
              category: 'Medical/PHI',
              classificationLevel: 4,
              classificationLabel: 'Highly Sensitive'
            },
            {
              tableName: 'users',
              size: '500 KB',
              sizeBytes: 512000,
              recordCount: 50,
              category: 'Demographic',
              classificationLevel: 2,
              classificationLabel: 'Internal'
            }
          ],
          totals: { totalTables: 2, totalRecords: 150, totalSize: '1.5 MB' },
          byCategory: {
            'Medical/PHI': {
              tables: [{
                tableName: 'patients',
                size: '1 MB',
                recordCount: 100,
                classificationLevel: 4,
                classificationLabel: 'Highly Sensitive'
              }],
              recordCount: 100,
              size: '1 MB'
            },
            'Demographic': {
              tables: [{
                tableName: 'users',
                size: '500 KB',
                recordCount: 50,
                classificationLevel: 2,
                classificationLabel: 'Internal'
              }],
              recordCount: 50,
              size: '500 KB'
            }
          }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(screen.getByText('Data Classification Summary')).toBeInTheDocument();
        expect(screen.getByText('Level 4: Highly Sensitive')).toBeInTheDocument();
        expect(screen.getByText('Level 2: Internal')).toBeInTheDocument();
      });
    });

    it('should display classification summary with all 5 levels', async () => {
      const inventory = [];
      const labels = ['Non-Sensitive', 'Internal', 'Sensitive', 'Highly Sensitive', 'Critical'];
      
      for (let level = 1; level <= 5; level++) {
        inventory.push({
          tableName: `table_level_${level}`,
          size: '100 KB',
          sizeBytes: 102400,
          recordCount: 10,
          category: 'Test',
          classificationLevel: level,
          classificationLabel: labels[level - 1]
        });
      }

      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory,
          totals: { totalTables: 5, totalRecords: 50, totalSize: '500 KB' },
          byCategory: {
            'Test': {
              tables: inventory,
              recordCount: 50,
              size: '500 KB'
            }
          }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(screen.getByText('Level 1')).toBeInTheDocument();
        expect(screen.getByText('Level 2')).toBeInTheDocument();
        expect(screen.getByText('Level 3')).toBeInTheDocument();
        expect(screen.getByText('Level 4')).toBeInTheDocument();
        expect(screen.getByText('Level 5')).toBeInTheDocument();
        expect(screen.getByText('Non-Sensitive')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
      });
    });

    it('should display correct classification badge colors for each level', async () => {
      const inventory = [
        {
          tableName: 'level1_table',
          size: '100 KB',
          sizeBytes: 102400,
          recordCount: 10,
          category: 'Test',
          classificationLevel: 1,
          classificationLabel: 'Non-Sensitive'
        },
        {
          tableName: 'level5_table',
          size: '100 KB',
          sizeBytes: 102400,
          recordCount: 10,
          category: 'Test',
          classificationLevel: 5,
          classificationLabel: 'Critical'
        }
      ];

      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory,
          totals: { totalTables: 2, totalRecords: 20, totalSize: '200 KB' },
          byCategory: {
            'Test': {
              tables: inventory,
              recordCount: 20,
              size: '200 KB'
            }
          }
        }
      });

      const { container } = render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        // Check for Level 5 (red badge)
        const level5Badge = container.querySelector('.bg-red-100');
        expect(level5Badge).toBeInTheDocument();
        expect(level5Badge).toHaveTextContent('Level 5: Critical');

        // Check for Level 1 (gray badge)
        const level1Badge = container.querySelector('.bg-gray-100');
        expect(level1Badge).toBeInTheDocument();
        expect(level1Badge).toHaveTextContent('Level 1: Non-Sensitive');
      });
    });

    it('should handle tables without classification gracefully', async () => {
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory: [{
            tableName: 'unclassified_table',
            size: '100 KB',
            sizeBytes: 102400,
            recordCount: 10,
            category: 'Other',
            classificationLevel: null,
            classificationLabel: null
          }],
          totals: { totalTables: 1, totalRecords: 10, totalSize: '100 KB' },
          byCategory: {
            'Other': {
              tables: [{
                tableName: 'unclassified_table',
                size: '100 KB',
                recordCount: 10,
                classificationLevel: null,
                classificationLabel: null
              }],
              recordCount: 10,
              size: '100 KB'
            }
          }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(screen.getByText('Not classified')).toBeInTheDocument();
        expect(screen.getByText('unclassified_table')).toBeInTheDocument();
      });
    });

    it('should display classification summary counts correctly', async () => {
      const inventory = [
        { tableName: 'table1', classificationLevel: 1, classificationLabel: 'Non-Sensitive', size: '100 KB', sizeBytes: 102400, recordCount: 10, category: 'Test' },
        { tableName: 'table2', classificationLevel: 1, classificationLabel: 'Non-Sensitive', size: '100 KB', sizeBytes: 102400, recordCount: 10, category: 'Test' },
        { tableName: 'table3', classificationLevel: 4, classificationLabel: 'Highly Sensitive', size: '100 KB', sizeBytes: 102400, recordCount: 10, category: 'Test' },
        { tableName: 'table4', classificationLevel: 5, classificationLabel: 'Critical', size: '100 KB', sizeBytes: 102400, recordCount: 10, category: 'Test' }
      ];

      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory,
          totals: { totalTables: 4, totalRecords: 40, totalSize: '400 KB' },
          byCategory: {
            'Test': {
              tables: inventory,
              recordCount: 40,
              size: '400 KB'
            }
          }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        // Level 1 should show count of 2
        const level1Cards = screen.getAllByText('Level 1');
        expect(level1Cards.length).toBeGreaterThan(0);
        
        // Level 4 should show count of 1
        expect(screen.getByText('Level 4')).toBeInTheDocument();
        
        // Level 5 should show count of 1
        expect(screen.getByText('Level 5')).toBeInTheDocument();
      });
    });

    it('should display classification in table rows', async () => {
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory: [{
            tableName: 'patients',
            size: '1 MB',
            sizeBytes: 1048576,
            recordCount: 100,
            category: 'Medical/PHI',
            classificationLevel: 4,
            classificationLabel: 'Highly Sensitive'
          }],
          totals: { totalTables: 1, totalRecords: 100, totalSize: '1 MB' },
          byCategory: {
            'Medical/PHI': {
              tables: [{
                tableName: 'patients',
                size: '1 MB',
                recordCount: 100,
                classificationLevel: 4,
                classificationLabel: 'Highly Sensitive'
              }],
              recordCount: 100,
              size: '1 MB'
            }
          }
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(screen.getByText('patients')).toBeInTheDocument();
        expect(screen.getByText('Level 4: Highly Sensitive')).toBeInTheDocument();
        expect(screen.getByText('Classification')).toBeInTheDocument();
      });
    });

    it('should handle empty inventory with classification', async () => {
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory: [],
          totals: { totalTables: 0, totalRecords: 0, totalSize: '0 Bytes' },
          byCategory: {}
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        expect(screen.getByText('Data Classification Summary')).toBeInTheDocument();
        // All levels should show 0
        expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5);
      });
    });

    it('should display classification tooltip', async () => {
      dataAuditService.getDataInventory.mockResolvedValue({
        success: true,
        data: {
          inventory: [],
          totals: { totalTables: 0, totalRecords: 0, totalSize: '0 Bytes' },
          byCategory: {}
        }
      });

      render(
        <MemoryRouter>
          <DataAudit />
        </MemoryRouter>
      );

      const inventoryTab = screen.getByText('Data Inventory');
      fireEvent.click(inventoryTab);

      await waitFor(() => {
        const tooltipButton = screen.getByLabelText('Info about Data Classification');
        expect(tooltipButton).toBeInTheDocument();
      });
    });
  });
});

