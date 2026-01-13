/**
 * Tests for breach notification controller
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock services
const mockBreachNotificationService = {
  createIncident: jest.fn(),
  getIncidents: jest.fn(),
  updateIncidentStatus: jest.fn(),
  createNotification: jest.fn(),
  sendNotification: jest.fn(),
  getNotifications: jest.fn(),
  getRemediations: jest.fn(),
  addRemediation: jest.fn()
};

jest.unstable_mockModule('../services/breachNotificationService.js', () => ({
  createIncident: mockBreachNotificationService.createIncident,
  getIncidents: mockBreachNotificationService.getIncidents,
  updateIncidentStatus: mockBreachNotificationService.updateIncidentStatus,
  createNotification: mockBreachNotificationService.createNotification,
  sendNotification: mockBreachNotificationService.sendNotification,
  getNotifications: mockBreachNotificationService.getNotifications,
  getRemediations: mockBreachNotificationService.getRemediations,
  addRemediation: mockBreachNotificationService.addRemediation
}));

describe('Breach Notification Controller', () => {
  let breachNotificationController;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    breachNotificationController = await import('../controllers/breachNotificationController.js');
    
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 1, email: 'admin@example.com', role: 'superadmin' }
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIncidentController', () => {
    it('should return 400 when incident_type is missing', async () => {
      mockReq.body = { severity: 'high', description: 'Test' };

      await breachNotificationController.createIncidentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'incident_type, severity, and description are required'
      });
    });

    it('should return 400 when severity is missing', async () => {
      mockReq.body = { incident_type: 'data_breach', description: 'Test' };

      await breachNotificationController.createIncidentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when description is missing', async () => {
      mockReq.body = { incident_type: 'data_breach', severity: 'high' };

      await breachNotificationController.createIncidentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create incident successfully', async () => {
      mockReq.body = {
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach',
        affected_users: [1, 2],
        affected_data_types: ['PHI']
      };
      mockBreachNotificationService.createIncident.mockResolvedValueOnce({
        id: 1,
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach',
        status: 'draft'
      });

      await breachNotificationController.createIncidentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 1 }),
        message: 'Incident created successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.body = {
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test'
      };
      mockBreachNotificationService.createIncident.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.createIncidentController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getIncidentsController', () => {
    it('should return incidents with default filters', async () => {
      mockBreachNotificationService.getIncidents.mockResolvedValueOnce({
        incidents: [{ id: 1, incident_type: 'data_breach', severity: 'high' }],
        total: 1,
        limit: 50,
        offset: 0
      });

      await breachNotificationController.getIncidentsController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, incident_type: 'data_breach', severity: 'high' }],
        pagination: { total: 1, limit: 50, offset: 0 }
      });
    });

    it('should apply filters from query', async () => {
      mockReq.query = { status: 'confirmed', severity: 'high' };
      mockBreachNotificationService.getIncidents.mockResolvedValueOnce({
        incidents: [],
        total: 0,
        limit: 50,
        offset: 0
      });

      await breachNotificationController.getIncidentsController(mockReq, mockRes);

      expect(mockBreachNotificationService.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          severity: 'high'
        })
      );
    });

    it('should handle service errors', async () => {
      mockBreachNotificationService.getIncidents.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.getIncidentsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateIncidentStatusController', () => {
    it('should return 400 when status is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await breachNotificationController.updateIncidentStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should update status successfully', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'confirmed' };
      mockBreachNotificationService.updateIncidentStatus.mockResolvedValueOnce({
        id: 1,
        status: 'confirmed'
      });

      await breachNotificationController.updateIncidentStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, status: 'confirmed' },
        message: 'Incident status updated successfully'
      });
    });

    it('should return 404 when incident not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'confirmed' };
      mockBreachNotificationService.updateIncidentStatus.mockRejectedValueOnce(
        new Error('Incident not found')
      );

      await breachNotificationController.updateIncidentStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'confirmed' };
      mockBreachNotificationService.updateIncidentStatus.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.updateIncidentStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createNotificationController', () => {
    it('should return 400 when notification_type is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { recipient_email: 'test@example.com' };

      await breachNotificationController.createNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when recipient_email is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { notification_type: 'gdpr_supervisory' };

      await breachNotificationController.createNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create notification successfully', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        notification_type: 'gdpr_supervisory',
        recipient_type: 'supervisory_authority',
        recipient_email: 'authority@example.com',
        recipient_name: 'Test Authority'
      };
      mockBreachNotificationService.createNotification.mockResolvedValueOnce({
        id: 1,
        incident_id: 1,
        notification_type: 'gdpr_supervisory',
        status: 'pending'
      });

      await breachNotificationController.createNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 1 }),
        message: 'Notification created successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com'
      };
      mockBreachNotificationService.createNotification.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.createNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('sendNotificationController', () => {
    it('should send notification successfully', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.sendNotification.mockResolvedValueOnce({
        id: 1,
        status: 'sent',
        sent_at: new Date()
      });

      await breachNotificationController.sendNotificationController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ status: 'sent' }),
        message: 'Notification sent successfully'
      });
    });

    it('should handle failed notification', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.sendNotification.mockResolvedValueOnce({
        id: 1,
        status: 'failed',
        error_message: 'Email sending failed'
      });

      await breachNotificationController.sendNotificationController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: expect.objectContaining({ status: 'failed' }),
        message: expect.stringContaining('failed')
      });
    });

    it('should return 404 when notification not found', async () => {
      mockReq.params = { id: '999' };
      mockBreachNotificationService.sendNotification.mockRejectedValueOnce(
        new Error('Notification not found')
      );

      await breachNotificationController.sendNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.sendNotification.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.sendNotificationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getNotificationsController', () => {
    it('should return notifications successfully', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.getNotifications.mockResolvedValueOnce([
        { id: 1, notification_type: 'gdpr_supervisory', status: 'sent' }
      ]);

      await breachNotificationController.getNotificationsController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, notification_type: 'gdpr_supervisory', status: 'sent' }]
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.getNotifications.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.getNotificationsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('addRemediationController', () => {
    it('should return 400 when action_taken is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await breachNotificationController.addRemediationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should add remediation successfully', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        action_taken: 'Fixed security issue',
        effectiveness: 'effective',
        notes: 'Test notes'
      };
      mockBreachNotificationService.addRemediation.mockResolvedValueOnce({
        id: 1,
        incident_id: 1,
        action_taken: 'Fixed security issue',
        effectiveness: 'effective'
      });

      await breachNotificationController.addRemediationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ action_taken: 'Fixed security issue' }),
        message: 'Remediation added successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { action_taken: 'Test' };
      mockBreachNotificationService.addRemediation.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.addRemediationController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRemediationsController', () => {
    it('should return remediations successfully', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.getRemediations.mockResolvedValueOnce([
        { id: 1, action_taken: 'Fixed issue', effectiveness: 'effective' }
      ]);

      await breachNotificationController.getRemediationsController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, action_taken: 'Fixed issue', effectiveness: 'effective' }]
      });
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockBreachNotificationService.getRemediations.mockRejectedValueOnce(new Error('Service error'));

      await breachNotificationController.getRemediationsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
