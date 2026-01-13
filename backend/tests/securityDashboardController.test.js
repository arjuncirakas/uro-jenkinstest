/**
 * Tests for security dashboard controller
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

// Mock alert service
const mockAlertService = {
  getActiveAlerts: jest.fn(),
  acknowledgeAlert: jest.fn(),
  resolveAlert: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../services/alertService.js', () => ({
  getActiveAlerts: mockAlertService.getActiveAlerts,
  acknowledgeAlert: mockAlertService.acknowledgeAlert,
  resolveAlert: mockAlertService.resolveAlert
}));

describe('Security Dashboard Controller', () => {
  let securityDashboardController;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    securityDashboardController = await import('../controllers/securityDashboardController.js');
    
    mockReq = {
      query: {},
      params: {},
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

  describe('getSecurityAlerts', () => {
    it('should return all alerts with default filters', async () => {
      mockAlertService.getActiveAlerts.mockResolvedValueOnce({
        alerts: [
          { id: 1, alert_type: 'test', severity: 'high', status: 'new' }
        ],
        pagination: { total: 1, limit: 50, offset: 0, totalPages: 1 }
      });

      await securityDashboardController.getSecurityAlerts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, alert_type: 'test', severity: 'high', status: 'new' }],
        pagination: { total: 1, limit: 50, offset: 0, totalPages: 1 }
      });
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'new' };
      mockAlertService.getActiveAlerts.mockResolvedValueOnce({
        alerts: [],
        pagination: { total: 0, limit: 50, offset: 0, totalPages: 0 }
      });

      await securityDashboardController.getSecurityAlerts(mockReq, mockRes);

      expect(mockAlertService.getActiveAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'new' })
      );
    });

    it('should filter by severity', async () => {
      mockReq.query = { severity: 'critical' };
      mockAlertService.getActiveAlerts.mockResolvedValueOnce({
        alerts: [],
        pagination: { total: 0, limit: 50, offset: 0, totalPages: 0 }
      });

      await securityDashboardController.getSecurityAlerts(mockReq, mockRes);

      expect(mockAlertService.getActiveAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' })
      );
    });

    it('should handle pagination', async () => {
      mockReq.query = { limit: '10', offset: '20' };
      mockAlertService.getActiveAlerts.mockResolvedValueOnce({
        alerts: [],
        pagination: { total: 0, limit: 10, offset: 20, totalPages: 0 }
      });

      await securityDashboardController.getSecurityAlerts(mockReq, mockRes);

      expect(mockAlertService.getActiveAlerts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });

    it('should handle errors', async () => {
      mockAlertService.getActiveAlerts.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.getSecurityAlerts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve security alerts'
        })
      );
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { severity: 'critical', count: '5' },
            { severity: 'high', count: '10' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { status: 'new', count: '8' },
            { status: 'acknowledged', count: '5' },
            { status: 'resolved', count: '2' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ total: '15' }]
        });

      await securityDashboardController.getAlertStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          bySeverity: expect.objectContaining({
            critical: 5,
            high: 10
          }),
          byStatus: expect.objectContaining({
            new: 8,
            acknowledged: 5,
            resolved: 2
          }),
          total: 15
        })
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await securityDashboardController.getAlertStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: 0
        })
      });
    });

    it('should handle errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.getAlertStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve alert statistics'
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('acknowledgeAlertController', () => {
    it('should acknowledge alert successfully', async () => {
      mockReq.params = { id: '1' };
      mockAlertService.acknowledgeAlert.mockResolvedValueOnce({
        id: 1,
        status: 'acknowledged',
        acknowledged_by: 1
      });

      await securityDashboardController.acknowledgeAlertController(mockReq, mockRes);

      expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, status: 'acknowledged', acknowledged_by: 1 },
        message: 'Alert acknowledged successfully'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };

      await securityDashboardController.acknowledgeAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 404 when alert not found', async () => {
      mockReq.params = { id: '999' };
      mockAlertService.acknowledgeAlert.mockRejectedValueOnce(
        new Error('Alert not found or already acknowledged/resolved')
      );

      await securityDashboardController.acknowledgeAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Alert not found or already acknowledged/resolved'
        })
      );
    });

    it('should handle errors', async () => {
      mockReq.params = { id: '1' };
      mockAlertService.acknowledgeAlert.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.acknowledgeAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resolveAlertController', () => {
    it('should resolve alert successfully', async () => {
      mockReq.params = { id: '1' };
      mockAlertService.resolveAlert.mockResolvedValueOnce({
        id: 1,
        status: 'resolved',
        resolved_by: 1
      });

      await securityDashboardController.resolveAlertController(mockReq, mockRes);

      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(1, 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, status: 'resolved', resolved_by: 1 },
        message: 'Alert resolved successfully'
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };

      await securityDashboardController.resolveAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when alert not found', async () => {
      mockReq.params = { id: '999' };
      mockAlertService.resolveAlert.mockRejectedValueOnce(new Error('Alert not found'));

      await securityDashboardController.resolveAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors', async () => {
      mockReq.params = { id: '1' };
      mockAlertService.resolveAlert.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.resolveAlertController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSecurityTeamMembers', () => {
    it('should return all team members', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'John Doe', email: 'john@example.com', created_at: new Date() },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: new Date() }
        ]
      });

      await securityDashboardController.getSecurityTeamMembers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'John Doe' }),
          expect.objectContaining({ id: 2, name: 'Jane Smith' })
        ])
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no members', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await securityDashboardController.getSecurityTeamMembers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    it('should handle errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.getSecurityTeamMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('addSecurityTeamMember', () => {
    it('should add team member successfully', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check duplicate
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'John Doe', email: 'john@example.com', created_at: new Date(), created_by: 1 }]
        });

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 1, name: 'John Doe', email: 'john@example.com' }),
        message: 'Security team member added successfully'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when name is missing', async () => {
      mockReq.body = { email: 'john@example.com' };

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name and email are required'
      });
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = { name: 'John Doe' };

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when email format is invalid', async () => {
      mockReq.body = { name: 'John Doe', email: 'invalid-email' };

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email format'
      });
    });

    it('should return 409 when email already exists', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1 }] // Duplicate found
      });

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Security team member with this email already exists'
      });
    });

    it('should handle database unique constraint violation', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce({ code: '23505', message: 'Unique constraint violation' });

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should handle errors', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.addSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('removeSecurityTeamMember', () => {
    it('should remove team member successfully', async () => {
      mockReq.params = { id: '1' };
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Member exists
        })
        .mockResolvedValueOnce({ rows: [] }); // Delete successful

      await securityDashboardController.removeSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Security team member removed successfully'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = null;
      mockReq.params = { id: '1' };

      await securityDashboardController.removeSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when member not found', async () => {
      mockReq.params = { id: '999' };
      mockClient.query.mockResolvedValueOnce({
        rows: [] // Member not found
      });

      await securityDashboardController.removeSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Security team member not found'
      });
    });

    it('should handle invalid ID', async () => {
      mockReq.params = { id: 'invalid' };
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await securityDashboardController.removeSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle errors', async () => {
      mockReq.params = { id: '1' };
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.removeSecurityTeamMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getDPOContactInfo', () => {
    it('should return DPO contact info when it exists', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'John DPO',
          email: 'dpo@example.com',
          contact_number: '+1234567890',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      await securityDashboardController.getDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'John DPO',
          email: 'dpo@example.com',
          contact_number: '+1234567890'
        })
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when no DPO info exists', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await securityDashboardController.getDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: null
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.getDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve DPO contact information',
        error: 'Database error'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not expose error details in production', async () => {
      process.env.NODE_ENV = 'production';
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.getDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve DPO contact information',
        error: undefined
      });
      process.env.NODE_ENV = 'test';
    });
  });

  describe('setDPOContactInfo', () => {
    it('should create new DPO contact info when none exists', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // No existing DPO
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John DPO',
            email: 'dpo@example.com',
            contact_number: '+1234567890',
            created_at: new Date(),
            updated_at: new Date()
          }]
        });

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'John DPO',
          email: 'dpo@example.com',
          contact_number: '+1234567890'
        }),
        message: 'DPO contact information added successfully'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update existing DPO contact info', async () => {
      mockReq.body = {
        name: 'Jane DPO',
        email: 'jane.dpo@example.com',
        contact_number: '+9876543210'
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Existing DPO
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'Jane DPO',
            email: 'jane.dpo@example.com',
            contact_number: '+9876543210',
            created_at: new Date(),
            updated_at: new Date()
          }]
        });

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'Jane DPO',
          email: 'jane.dpo@example.com',
          contact_number: '+9876543210'
        }),
        message: 'DPO contact information updated successfully'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      mockReq.user = null;
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 400 when name is missing', async () => {
      mockReq.body = {
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name, email, and contact number are required'
      });
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = {
        name: 'John DPO',
        contact_number: '+1234567890'
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when contact_number is missing', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com'
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when email format is invalid', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'invalid-email',
        contact_number: '+1234567890'
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email format'
      });
    });

    it('should return 400 when contact number format is invalid', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '123' // Too short
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid contact number format'
      });
    });

    it('should return 400 when contact number contains invalid characters', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+123abc456' // Invalid characters
      };

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should trim whitespace from inputs', async () => {
      mockReq.body = {
        name: '  John DPO  ',
        email: '  dpo@example.com  ',
        contact_number: '  +1234567890  '
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: 'John DPO',
            email: 'dpo@example.com',
            contact_number: '+1234567890',
            created_at: new Date(),
            updated_at: new Date()
          }]
        });

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dpo_contact_info'),
        ['John DPO', 'dpo@example.com', '+1234567890', 1]
      );
    });

    it('should handle database unique constraint violation', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce({ code: '23505', message: 'Unique constraint violation' });

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'DPO contact information already exists'
      });
    });

    it('should handle database errors', async () => {
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not expose error details in production', async () => {
      process.env.NODE_ENV = 'production';
      mockReq.body = {
        name: 'John DPO',
        email: 'dpo@example.com',
        contact_number: '+1234567890'
      };
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Database error'));

      await securityDashboardController.setDPOContactInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to save DPO contact information',
        error: undefined
      });
      process.env.NODE_ENV = 'test';
    });
  });
});
