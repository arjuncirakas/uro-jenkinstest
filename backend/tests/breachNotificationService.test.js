/**
 * Tests for breach notification service
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
const mockPool = {
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
  sendNotificationEmail: jest.fn()
}));

jest.unstable_mockModule('../services/notificationTemplates.js', () => ({
  renderGDPRSupervisoryTemplate: jest.fn(),
  renderHIPAAHHSTemplate: jest.fn(),
  renderIndividualPatientTemplate: jest.fn()
}));

describe('Breach Notification Service', () => {
  let breachNotificationService;
  let emailService;
  let notificationTemplates;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    breachNotificationService = await import('../services/breachNotificationService.js');
    emailService = await import('../services/emailService.js');
    notificationTemplates = await import('../services/notificationTemplates.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIncident', () => {
    it('should throw error when incident_type is missing', async () => {
      await expect(breachNotificationService.createIncident({
        severity: 'high',
        description: 'Test'
      })).rejects.toThrow('incident_type, severity, and description are required');
    });

    it('should throw error when severity is missing', async () => {
      await expect(breachNotificationService.createIncident({
        incident_type: 'data_breach',
        description: 'Test'
      })).rejects.toThrow('incident_type, severity, and description are required');
    });

    it('should throw error when description is missing', async () => {
      await expect(breachNotificationService.createIncident({
        incident_type: 'data_breach',
        severity: 'high'
      })).rejects.toThrow('incident_type, severity, and description are required');
    });

    it('should create incident successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            incident_type: 'data_breach',
            severity: 'high',
            description: 'Test breach',
            affected_users: [],
            affected_data_types: [],
            detected_at: new Date(),
            reported_by: 1,
            status: 'draft',
            created_at: new Date(),
            updated_at: new Date()
          }]
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await breachNotificationService.createIncident({
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach',
        affected_users: [],
        affected_data_types: [],
        reported_by: 1
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors and rollback', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(breachNotificationService.createIncident({
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test'
      })).rejects.toThrow('Database error');
    });
  });

  describe('getIncidents', () => {
    it('should return incidents with default filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, incident_type: 'data_breach', severity: 'high', description: 'Test' }
          ]
        });

      const result = await breachNotificationService.getIncidents();

      expect(result.incidents).toBeDefined();
      expect(result.total).toBe(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await breachNotificationService.getIncidents({ status: 'confirmed' });

      expect(result.total).toBe(2);
    });

    it('should apply severity filter', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await breachNotificationService.getIncidents({ severity: 'high' });

      expect(result.total).toBe(3);
    });

    it('should apply date range filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await breachNotificationService.getIncidents({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.total).toBe(1);
    });

    it('should handle pagination', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await breachNotificationService.getIncidents({ limit: 10, offset: 20 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.getIncidents()).rejects.toThrow('Database error');
    });
  });

  describe('updateIncidentStatus', () => {
    it('should throw error when incidentId is missing', async () => {
      await expect(breachNotificationService.updateIncidentStatus(null, 'confirmed')).rejects.toThrow('incidentId and status are required');
    });

    it('should throw error when status is missing', async () => {
      await expect(breachNotificationService.updateIncidentStatus(1, null)).rejects.toThrow('incidentId and status are required');
    });

    it('should throw error when status is invalid', async () => {
      await expect(breachNotificationService.updateIncidentStatus(1, 'invalid')).rejects.toThrow('Invalid status');
    });

    it('should update status successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          status: 'confirmed',
          updated_at: new Date()
        }]
      });

      const result = await breachNotificationService.updateIncidentStatus(1, 'confirmed');

      expect(result.status).toBe('confirmed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when incident not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(breachNotificationService.updateIncidentStatus(999, 'confirmed')).rejects.toThrow('Incident not found');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.updateIncidentStatus(1, 'confirmed')).rejects.toThrow('Database error');
    });
  });

  describe('createNotification', () => {
    it('should throw error when incidentId is missing', async () => {
      await expect(breachNotificationService.createNotification(null, {
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com'
      })).rejects.toThrow('incidentId, notification_type, and recipient_email are required');
    });

    it('should throw error when notification_type is missing', async () => {
      await expect(breachNotificationService.createNotification(1, {
        recipient_email: 'test@example.com'
      })).rejects.toThrow('incidentId, notification_type, and recipient_email are required');
    });

    it('should throw error when recipient_email is missing', async () => {
      await expect(breachNotificationService.createNotification(1, {
        notification_type: 'gdpr_supervisory'
      })).rejects.toThrow('incidentId, notification_type, and recipient_email are required');
    });

    it('should create notification successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          incident_id: 1,
          notification_type: 'gdpr_supervisory',
          recipient_email: 'test@example.com',
          status: 'pending',
          created_at: new Date()
        }]
      });

      const result = await breachNotificationService.createNotification(1, {
        notification_type: 'gdpr_supervisory',
        recipient_type: 'supervisory_authority',
        recipient_email: 'test@example.com',
        recipient_name: 'Test Authority',
        sent_by: 1
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.createNotification(1, {
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com'
      })).rejects.toThrow('Database error');
    });
  });

  describe('sendNotification', () => {
    it('should throw error when notificationId is missing', async () => {
      await expect(breachNotificationService.sendNotification(null)).rejects.toThrow('notificationId is required');
    });

    it('should throw error when notification not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(breachNotificationService.sendNotification(999)).rejects.toThrow('Notification not found');
    });

    it('should send GDPR notification successfully', async () => {
      const mockNotification = {
        id: 1,
        incident_id: 1,
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com',
        recipient_name: 'Test Authority',
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach',
        affected_users: [1, 2],
        affected_data_types: ['PHI'],
        detected_at: new Date()
      };

      const mockEmailContent = {
        subject: 'GDPR Breach Notification',
        html: '<html>Test</html>'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({
          rows: [{
            ...mockNotification,
            status: 'sent',
            sent_at: new Date(),
            template_used: 'gdpr_supervisory'
          }]
        });

      notificationTemplates.renderGDPRSupervisoryTemplate.mockReturnValue(mockEmailContent);
      emailService.sendNotificationEmail.mockResolvedValue({ success: true });

      const result = await breachNotificationService.sendNotification(1);

      expect(result.status).toBe('sent');
      expect(emailService.sendNotificationEmail).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should send HIPAA notification successfully', async () => {
      const mockNotification = {
        id: 1,
        incident_id: 1,
        notification_type: 'hipaa_hhs',
        recipient_email: 'test@example.com',
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test breach',
        affected_users: [1],
        affected_data_types: ['PHI'],
        detected_at: new Date()
      };

      const mockEmailContent = {
        subject: 'HIPAA Breach Notification',
        html: '<html>Test</html>'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({
          rows: [{
            ...mockNotification,
            status: 'sent',
            sent_at: new Date(),
            template_used: 'hipaa_hhs'
          }]
        });

      notificationTemplates.renderHIPAAHHSTemplate.mockReturnValue(mockEmailContent);
      emailService.sendNotificationEmail.mockResolvedValue({ success: true });

      const result = await breachNotificationService.sendNotification(1);

      expect(result.status).toBe('sent');
    });

    it('should send individual patient notification successfully', async () => {
      const mockNotification = {
        id: 1,
        incident_id: 1,
        notification_type: 'individual_patient',
        recipient_email: 'patient@example.com',
        recipient_name: 'John Doe',
        incident_type: 'data_breach',
        severity: 'medium',
        description: 'Test breach',
        affected_users: [1],
        affected_data_types: ['PHI'],
        detected_at: new Date()
      };

      const mockEmailContent = {
        subject: 'Data Security Incident',
        html: '<html>Test</html>'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({
          rows: [{
            ...mockNotification,
            status: 'sent',
            sent_at: new Date(),
            template_used: 'individual_patient'
          }]
        });

      notificationTemplates.renderIndividualPatientTemplate.mockReturnValue(mockEmailContent);
      emailService.sendNotificationEmail.mockResolvedValue({ success: true });

      const result = await breachNotificationService.sendNotification(1);

      expect(result.status).toBe('sent');
    });

    it('should handle email sending failure', async () => {
      const mockNotification = {
        id: 1,
        incident_id: 1,
        notification_type: 'gdpr_supervisory',
        recipient_email: 'test@example.com',
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test',
        affected_users: [],
        affected_data_types: [],
        detected_at: new Date()
      };

      const mockEmailContent = {
        subject: 'Test',
        html: '<html>Test</html>'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({
          rows: [{
            ...mockNotification,
            status: 'failed',
            error_message: 'Email sending failed',
            template_used: 'gdpr_supervisory'
          }]
        });

      notificationTemplates.renderGDPRSupervisoryTemplate.mockReturnValue(mockEmailContent);
      emailService.sendNotificationEmail.mockRejectedValue(new Error('Email sending failed'));

      const result = await breachNotificationService.sendNotification(1);

      expect(result.status).toBe('failed');
      expect(result.error_message).toBe('Email sending failed');
    });

    it('should throw error for unknown notification type', async () => {
      const mockNotification = {
        id: 1,
        incident_id: 1,
        notification_type: 'unknown_type',
        recipient_email: 'test@example.com',
        incident_type: 'data_breach',
        severity: 'high',
        description: 'Test',
        affected_users: [],
        affected_data_types: [],
        detected_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockNotification] });

      await expect(breachNotificationService.sendNotification(1)).rejects.toThrow('Unknown notification type');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.sendNotification(1)).rejects.toThrow('Database error');
    });
  });

  describe('getNotifications', () => {
    it('should throw error when incidentId is missing', async () => {
      await expect(breachNotificationService.getNotifications(null)).rejects.toThrow('incidentId is required');
    });

    it('should return notifications successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            incident_id: 1,
            notification_type: 'gdpr_supervisory',
            recipient_email: 'test@example.com',
            status: 'sent',
            sent_at: new Date()
          }
        ]
      });

      const result = await breachNotificationService.getNotifications(1);

      expect(result).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.getNotifications(1)).rejects.toThrow('Database error');
    });
  });

  describe('getRemediations', () => {
    it('should throw error when incidentId is missing', async () => {
      await expect(breachNotificationService.getRemediations(null)).rejects.toThrow('incidentId is required');
    });

    it('should return remediations successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            incident_id: 1,
            action_taken: 'Fixed security issue',
            taken_by: 1,
            taken_at: new Date(),
            effectiveness: 'effective'
          }
        ]
      });

      const result = await breachNotificationService.getRemediations(1);

      expect(result).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.getRemediations(1)).rejects.toThrow('Database error');
    });
  });

  describe('addRemediation', () => {
    it('should throw error when incidentId is missing', async () => {
      await expect(breachNotificationService.addRemediation(null, {
        action_taken: 'Test action'
      })).rejects.toThrow('incidentId and action_taken are required');
    });

    it('should throw error when action_taken is missing', async () => {
      await expect(breachNotificationService.addRemediation(1, {})).rejects.toThrow('incidentId and action_taken are required');
    });

    it('should add remediation successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          incident_id: 1,
          action_taken: 'Fixed security issue',
          taken_by: 1,
          taken_at: new Date(),
          effectiveness: 'effective',
          notes: 'Test notes'
        }]
      });

      const result = await breachNotificationService.addRemediation(1, {
        action_taken: 'Fixed security issue',
        taken_by: 1,
        effectiveness: 'effective',
        notes: 'Test notes'
      });

      expect(result).toBeDefined();
      expect(result.action_taken).toBe('Fixed security issue');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(breachNotificationService.addRemediation(1, {
        action_taken: 'Test'
      })).rejects.toThrow('Database error');
    });
  });
});
