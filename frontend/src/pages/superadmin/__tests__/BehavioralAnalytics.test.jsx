import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BehavioralAnalytics from '../BehavioralAnalytics';
import behavioralAnalyticsService from '../../../services/behavioralAnalyticsService';
import breachNotificationService from '../../../services/breachNotificationService';
import React from 'react';

// Mock services
vi.mock('../../../services/behavioralAnalyticsService', () => ({
  default: {
    getBaselines: vi.fn(),
    getAnomalies: vi.fn(),
    updateAnomalyStatus: vi.fn(),
    calculateBaseline: vi.fn(),
    getStatistics: vi.fn()
  }
}));

vi.mock('../../../services/breachNotificationService', () => ({
  default: {
    createIncident: vi.fn()
  }
}));

describe('BehavioralAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render behavioral analytics page', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: {
          total: 0,
          byStatus: {},
          bySeverity: {},
          byType: {},
          recent: 0
        }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      expect(screen.getByText('Behavioral Analytics')).toBeInTheDocument();
      expect(screen.getByText('Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Baselines')).toBeInTheDocument();
    });

    it('should display statistics cards', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: {
          total: 100,
          byStatus: { new: 50, reviewed: 30, dismissed: 20 },
          bySeverity: { high: 10, medium: 40, low: 50 },
          byType: {},
          recent: 15
        }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total anomalies
        expect(screen.getByText('50')).toBeInTheDocument(); // New
        expect(screen.getByText('10')).toBeInTheDocument(); // High severity
        expect(screen.getByText('15')).toBeInTheDocument(); // Recent
      });
    });

    it('should display anomalies list', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            anomaly_type: 'unusual_location',
            severity: 'medium',
            status: 'new',
            user_email: 'user@example.com',
            detected_at: new Date().toISOString()
          }
        ]
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 1, byStatus: {}, bySeverity: {}, byType: {}, recent: 1 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/unusual location/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no anomalies', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No anomalies found')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch to Baselines tab', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      await waitFor(() => {
        expect(screen.getByText('Calculate Baseline')).toBeInTheDocument();
      });
    });

    it('should switch back to Anomalies tab', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      const anomaliesTab = screen.getByText('Anomalies');
      fireEvent.click(anomaliesTab);

      await waitFor(() => {
        expect(screen.getByText('Detected Anomalies')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should filter anomalies by status', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'new' } });
      });

      await waitFor(() => {
        expect(behavioralAnalyticsService.getAnomalies).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'new' })
        );
      });
    });

    it('should filter anomalies by severity', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const severityFilter = screen.getByLabelText(/severity/i);
        fireEvent.change(severityFilter, { target: { value: 'high' } });
      });

      await waitFor(() => {
        expect(behavioralAnalyticsService.getAnomalies).toHaveBeenCalledWith(
          expect.objectContaining({ severity: 'high' })
        );
      });
    });

    it('should clear filters', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'new' } });
      });

      await waitFor(() => {
        const clearButton = screen.getByText('Clear Filters');
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        expect(behavioralAnalyticsService.getAnomalies).toHaveBeenCalledWith(
          expect.objectContaining({ status: '', severity: '' })
        );
      });
    });
  });

  describe('Anomaly Actions', () => {
    it('should update anomaly status to reviewed', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            anomaly_type: 'unusual_location',
            severity: 'medium',
            status: 'new',
            detected_at: new Date().toISOString()
          }
        ]
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 1, byStatus: { new: 1 }, bySeverity: {}, byType: {}, recent: 1 }
      });
      behavioralAnalyticsService.updateAnomalyStatus.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const reviewButton = screen.getByText('Review');
        fireEvent.click(reviewButton);
      });

      expect(behavioralAnalyticsService.updateAnomalyStatus).toHaveBeenCalledWith(1, 'reviewed', undefined);
    });

    it('should dismiss anomaly', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            anomaly_type: 'unusual_location',
            severity: 'medium',
            status: 'new',
            detected_at: new Date().toISOString()
          }
        ]
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 1, byStatus: { new: 1 }, bySeverity: {}, byType: {}, recent: 1 }
      });
      behavioralAnalyticsService.updateAnomalyStatus.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const dismissButton = screen.getByText('Dismiss');
        fireEvent.click(dismissButton);
      });

      expect(behavioralAnalyticsService.updateAnomalyStatus).toHaveBeenCalledWith(1, 'dismissed', undefined);
    });

    it('should create breach incident when notify is clicked', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            anomaly_type: 'unusual_location',
            severity: 'high',
            status: 'new',
            user_id: 1,
            details: { ipAddress: '192.168.1.1' },
            detected_at: new Date().toISOString()
          }
        ]
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 1, byStatus: { new: 1 }, bySeverity: {}, byType: {}, recent: 1 }
      });
      breachNotificationService.createIncident.mockResolvedValue({
        success: true
      });

      // Mock window.alert
      window.alert = vi.fn();

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        const notifyButton = screen.getByText('Notify');
        fireEvent.click(notifyButton);
      });

      expect(breachNotificationService.createIncident).toHaveBeenCalled();
    });
  });

  describe('Baseline Calculation', () => {
    it('should calculate baseline with user ID', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });
      behavioralAnalyticsService.calculateBaseline.mockResolvedValue({
        success: true
      });
      behavioralAnalyticsService.getBaselines.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      await waitFor(() => {
        const userIdInput = screen.getByLabelText(/user id/i);
        fireEvent.change(userIdInput, { target: { value: '1' } });
      });

      await waitFor(() => {
        const calculateButton = screen.getByText('Calculate Baseline');
        fireEvent.click(calculateButton);
      });

      expect(behavioralAnalyticsService.calculateBaseline).toHaveBeenCalledWith('1', 'location');
    });

    it('should calculate baseline with email', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });
      behavioralAnalyticsService.calculateBaseline.mockResolvedValue({
        success: true
      });
      behavioralAnalyticsService.getBaselines.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      await waitFor(() => {
        const emailCheckbox = screen.getByText('Use email instead of User ID');
        fireEvent.click(emailCheckbox.parentElement.querySelector('input'));
      });

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email address/i);
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      });

      await waitFor(() => {
        const calculateButton = screen.getByText('Calculate Baseline');
        fireEvent.click(calculateButton);
      });

      expect(behavioralAnalyticsService.calculateBaseline).toHaveBeenCalledWith('user@example.com', 'location');
    });

    it('should show error when user ID is missing', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      await waitFor(() => {
        const calculateButton = screen.getByText('Calculate Baseline');
        fireEvent.click(calculateButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/please enter a user id or email/i)).toBeInTheDocument();
      });
    });

    it('should load baselines', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: true,
        data: []
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });
      behavioralAnalyticsService.getBaselines.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            user_id: 1,
            baseline_type: 'time',
            baseline_data: { totalLogins: 10 },
            calculated_at: new Date().toISOString()
          }
        ]
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      const baselinesTab = screen.getByText('Baselines');
      fireEvent.click(baselinesTab);

      await waitFor(() => {
        const userIdInput = screen.getByLabelText(/user id/i);
        fireEvent.change(userIdInput, { target: { value: '1' } });
      });

      await waitFor(() => {
        const loadButton = screen.getByText('Load Baselines');
        fireEvent.click(loadButton);
      });

      expect(behavioralAnalyticsService.getBaselines).toHaveBeenCalledWith('1');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      behavioralAnalyticsService.getAnomalies.mockResolvedValue({
        success: false,
        error: 'Failed to fetch anomalies'
      });
      behavioralAnalyticsService.getStatistics.mockResolvedValue({
        success: true,
        data: { total: 0, byStatus: {}, bySeverity: {}, byType: {}, recent: 0 }
      });

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch anomalies')).toBeInTheDocument();
      });
    });

    it('should handle service errors gracefully', async () => {
      behavioralAnalyticsService.getAnomalies.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          <BehavioralAnalytics />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch anomalies')).toBeInTheDocument();
      });
    });
  });
});
