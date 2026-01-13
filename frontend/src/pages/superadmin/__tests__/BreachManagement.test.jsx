import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BreachManagement from '../BreachManagement';
import breachNotificationService from '../../../services/breachNotificationService';
import React from 'react';

// Mock services
vi.mock('../../../services/breachNotificationService', () => ({
  default: {
    createIncident: vi.fn(),
    getIncidents: vi.fn(),
    updateIncidentStatus: vi.fn(),
    createNotification: vi.fn(),
    sendNotification: vi.fn(),
    getNotifications: vi.fn(),
    getRemediations: vi.fn(),
    addRemediation: vi.fn()
  }
}));

describe('BreachManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render breach management page', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      expect(screen.getByText('Breach Management')).toBeInTheDocument();
      expect(screen.getByText('Incidents')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Remediations')).toBeInTheDocument();
    });

    it('should display incidents list', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            incident_type: 'data_breach',
            severity: 'high',
            status: 'draft',
            description: 'Test breach',
            detected_at: new Date().toISOString()
          }
        ]
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/test breach/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no incidents', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No incidents found')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch to Notifications tab', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          { id: 1, incident_type: 'data_breach', severity: 'high', status: 'draft', description: 'Test', detected_at: new Date().toISOString() }
        ]
      });
      breachNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const notificationsTab = screen.getByText('Notifications');
        fireEvent.click(notificationsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should switch to Remediations tab', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          { id: 1, incident_type: 'data_breach', severity: 'high', status: 'draft', description: 'Test', detected_at: new Date().toISOString() }
        ]
      });
      breachNotificationService.getRemediations.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const remediationsTab = screen.getByText('Remediations');
        fireEvent.click(remediationsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('Remediations')).toBeInTheDocument();
      });
    });
  });

  describe('Incident Management', () => {
    it('should create incident successfully', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: []
      });
      breachNotificationService.createIncident.mockResolvedValue({
        success: true,
        data: { id: 1, incident_type: 'data_breach', severity: 'high' }
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const createButton = screen.getByText('Create Incident');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const descriptionInput = screen.getByPlaceholderText(/describe the breach incident/i);
        fireEvent.change(descriptionInput, { target: { value: 'Test breach description' } });
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Create');
        fireEvent.click(submitButton);
      });

      expect(breachNotificationService.createIncident).toHaveBeenCalled();
    });

    it('should update incident status', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            incident_type: 'data_breach',
            severity: 'high',
            status: 'draft',
            description: 'Test',
            detected_at: new Date().toISOString()
          }
        ]
      });
      breachNotificationService.updateIncidentStatus.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statusSelect = screen.getByDisplayValue('draft');
        fireEvent.change(statusSelect, { target: { value: 'confirmed' } });
      });

      expect(breachNotificationService.updateIncidentStatus).toHaveBeenCalledWith(1, 'confirmed');
    });

    it('should filter incidents by status', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: []
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const statusFilter = screen.getByLabelText(/status/i);
        fireEvent.change(statusFilter, { target: { value: 'confirmed' } });
      });

      await waitFor(() => {
        expect(breachNotificationService.getIncidents).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'confirmed' })
        );
      });
    });
  });

  describe('Notification Management', () => {
    it('should create notification', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          { id: 1, incident_type: 'data_breach', severity: 'high', status: 'draft', description: 'Test', detected_at: new Date().toISOString() }
        ]
      });
      breachNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      });
      breachNotificationService.createNotification.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const notificationsTab = screen.getByText('Notifications');
        fireEvent.click(notificationsTab);
      });

      await waitFor(() => {
        const viewButton = screen.getByText('View Notifications');
        fireEvent.click(viewButton);
      });

      await waitFor(() => {
        const createButton = screen.getByText('Create Notification');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText('recipient@example.com');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Create');
        fireEvent.click(submitButton);
      });

      expect(breachNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should send notification', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          { id: 1, incident_type: 'data_breach', severity: 'high', status: 'draft', description: 'Test', detected_at: new Date().toISOString() }
        ]
      });
      breachNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            notification_type: 'gdpr_supervisory',
            recipient_email: 'test@example.com',
            status: 'pending'
          }
        ]
      });
      breachNotificationService.sendNotification.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const notificationsTab = screen.getByText('Notifications');
        fireEvent.click(notificationsTab);
      });

      await waitFor(() => {
        const viewButton = screen.getByText('View Notifications');
        fireEvent.click(viewButton);
      });

      await waitFor(() => {
        const sendButton = screen.getByText('Send');
        fireEvent.click(sendButton);
      });

      expect(breachNotificationService.sendNotification).toHaveBeenCalledWith(1);
    });
  });

  describe('Remediation Management', () => {
    it('should add remediation', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: true,
        data: [
          { id: 1, incident_type: 'data_breach', severity: 'high', status: 'draft', description: 'Test', detected_at: new Date().toISOString() }
        ]
      });
      breachNotificationService.getRemediations.mockResolvedValue({
        success: true,
        data: []
      });
      breachNotificationService.addRemediation.mockResolvedValue({
        success: true
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        const remediationsTab = screen.getByText('Remediations');
        fireEvent.click(remediationsTab);
      });

      await waitFor(() => {
        const viewButton = screen.getByText('View Notifications');
        fireEvent.click(viewButton);
      });

      await waitFor(() => {
        const addButton = screen.getByText('Add Remediation');
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const actionInput = screen.getByPlaceholderText(/describe the remediation action/i);
        fireEvent.change(actionInput, { target: { value: 'Fixed security issue' } });
      });

      await waitFor(() => {
        const submitButton = screen.getByText('Add');
        fireEvent.click(submitButton);
      });

      expect(breachNotificationService.addRemediation).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      breachNotificationService.getIncidents.mockResolvedValue({
        success: false,
        error: 'Failed to fetch incidents'
      });

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch incidents')).toBeInTheDocument();
      });
    });

    it('should handle service errors gracefully', async () => {
      breachNotificationService.getIncidents.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          <BreachManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch incidents')).toBeInTheDocument();
      });
    });
  });
});
