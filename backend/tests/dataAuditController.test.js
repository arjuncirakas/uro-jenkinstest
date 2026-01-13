/**
 * Comprehensive tests for dataAuditController.js
 * Tests all functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock auditLogger
const mockLogAuditEvent = jest.fn();
const mockVerifyAuditLogIntegrity = jest.fn();
const mockVerifyImmutabilityStatus = jest.fn();
jest.unstable_mockModule('../services/auditLogger.js', () => ({
  logAuditEvent: mockLogAuditEvent,
  verifyAuditLogIntegrity: mockVerifyAuditLogIntegrity,
  verifyImmutabilityStatus: mockVerifyImmutabilityStatus
}));

// Mock dataAuditService
const mockGetDataInventory = jest.fn();
const mockGetAccessLogs = jest.fn();
const mockGetProcessingActivities = jest.fn();
const mockGetRetentionInfo = jest.fn();
const mockGetThirdPartySharing = jest.fn();
const mockGetComplianceMetrics = jest.fn();

jest.unstable_mockModule('../services/dataAuditService.js', () => ({
  getDataInventory: mockGetDataInventory,
  getAccessLogs: mockGetAccessLogs,
  getProcessingActivities: mockGetProcessingActivities,
  getRetentionInfo: mockGetRetentionInfo,
  getThirdPartySharing: mockGetThirdPartySharing,
  getComplianceMetrics: mockGetComplianceMetrics
}));

describe('dataAuditController', () => {
  let dataAuditController;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    dataAuditController = await import('../controllers/dataAuditController.js');
    
    mockReq = {
      user: { id: 1, email: 'admin@test.com', role: 'superadmin' },
      query: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn(() => 'Mozilla/5.0'),
      method: 'GET',
      path: '/api/superadmin/data-audit/inventory'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
  });

  describe('getDataInventoryController', () => {
    it('should return inventory data successfully', async () => {
      mockGetDataInventory.mockResolvedValue({
        inventory: [],
        totals: { totalTables: 10 },
        byCategory: {}
      });

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockGetDataInventory).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_audit.inventory_view',
          status: 'success'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Data inventory retrieved successfully'
        })
      );
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockGetDataInventory.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve data inventory'
        })
      );
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorMessage: 'Database connection failed'
        })
      );
      consoleSpy.mockRestore();
    });

    it('should log audit event on access', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalled();
    });
  });

  describe('getAccessLogsController', () => {
    it('should return access logs with filters', async () => {
      mockGetAccessLogs.mockResolvedValue({
        logs: [{ id: 1, action: 'phi.view' }],
        pagination: { page: 1, total: 1 }
      });

      mockReq.query = {
        userId: '1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        actionType: 'phi',
        resourceType: 'patient',
        status: 'success',
        page: '1',
        limit: '50'
      };

      await dataAuditController.getAccessLogsController(mockReq, mockRes);

      expect(mockGetAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          page: 1,
          limit: 50
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle pagination defaults', async () => {
      mockGetAccessLogs.mockResolvedValue({
        logs: [],
        pagination: {}
      });

      mockReq.query = {};

      await dataAuditController.getAccessLogsController(mockReq, mockRes);

      expect(mockGetAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50
        })
      );
    });

    it('should validate pagination limits', async () => {
      mockGetAccessLogs.mockResolvedValue({
        logs: [],
        pagination: {}
      });

      mockReq.query = { page: '0', limit: '2000' };

      await dataAuditController.getAccessLogsController(mockReq, mockRes);

      expect(mockGetAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetAccessLogs.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getAccessLogsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });

    it('should handle empty filters', async () => {
      mockGetAccessLogs.mockResolvedValue({
        logs: [],
        pagination: {}
      });

      mockReq.query = {};

      await dataAuditController.getAccessLogsController(mockReq, mockRes);

      expect(mockGetAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          startDate: null,
          endDate: null
        })
      );
    });
  });

  describe('getProcessingActivitiesController', () => {
    it('should return processing activities successfully', async () => {
      mockGetProcessingActivities.mockResolvedValue({
        activities: []
      });

      await dataAuditController.getProcessingActivitiesController(mockReq, mockRes);

      expect(mockGetProcessingActivities).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should apply filters', async () => {
      mockGetProcessingActivities.mockResolvedValue({
        activities: []
      });

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        actionType: 'create',
        resourceType: 'patient'
      };

      await dataAuditController.getProcessingActivitiesController(mockReq, mockRes);

      expect(mockGetProcessingActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetProcessingActivities.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getProcessingActivitiesController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });

  describe('getRetentionInfoController', () => {
    it('should return retention info successfully', async () => {
      mockGetRetentionInfo.mockResolvedValue({
        retentionData: [],
        summary: {}
      });

      await dataAuditController.getRetentionInfoController(mockReq, mockRes);

      expect(mockGetRetentionInfo).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetRetentionInfo.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getRetentionInfoController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });

  describe('getThirdPartySharingController', () => {
    it('should return third-party sharing successfully', async () => {
      mockGetThirdPartySharing.mockResolvedValue({
        sharingEvents: []
      });

      await dataAuditController.getThirdPartySharingController(mockReq, mockRes);

      expect(mockGetThirdPartySharing).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should apply filters', async () => {
      mockGetThirdPartySharing.mockResolvedValue({
        sharingEvents: []
      });

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        userId: '1'
      };

      await dataAuditController.getThirdPartySharingController(mockReq, mockRes);

      expect(mockGetThirdPartySharing).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetThirdPartySharing.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getThirdPartySharingController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });

  describe('getComplianceMetricsController', () => {
    it('should return compliance metrics successfully', async () => {
      mockGetComplianceMetrics.mockResolvedValue({
        successfulLoginAttempts30Days: 100,
        failedLoginAttempts30Days: 5,
        phiAccessEvents30Days: 50
      });

      await dataAuditController.getComplianceMetricsController(mockReq, mockRes);

      expect(mockGetComplianceMetrics).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetComplianceMetrics.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getComplianceMetricsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });
  });

  describe('getChartDataController', () => {
    let mockGetChartData;

    beforeEach(async () => {
      const dataAuditServiceModule = await import('../services/dataAuditService.js');
      mockGetChartData = jest.fn();
      dataAuditServiceModule.getChartData = mockGetChartData;
    });

    it('should return chart data successfully', async () => {
      mockGetChartData.mockResolvedValue({
        loginTrends: [
          { date: 'Jan 1', successfulLogins: 10, failedLogins: 1, phiAccess: 5, dataExports: 2 }
        ]
      });

      const { getChartDataController } = await import('../controllers/dataAuditController.js');
      await getChartDataController(mockReq, mockRes);

      expect(mockGetChartData).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Chart data retrieved successfully'
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Query failed');
      mockGetChartData.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { getChartDataController } = await import('../controllers/dataAuditController.js');
      await getChartDataController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorMessage: 'Query failed'
        })
      );
      consoleSpy.mockRestore();
    });

    it('should log audit event on access', async () => {
      mockGetChartData.mockResolvedValue({
        loginTrends: []
      });

      const { getChartDataController } = await import('../controllers/dataAuditController.js');
      await getChartDataController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_audit.chart_data_view',
          status: 'success'
        })
      );
    });
  });

  describe('exportAuditReportController', () => {
    it('should export CSV successfully', async () => {
      mockGetDataInventory.mockResolvedValue({
        inventory: [
          { tableName: 'users', size: '1 MB', recordCount: 100, category: 'Demographic' }
        ]
      });
      mockGetAccessLogs.mockResolvedValue({
        logs: [
          {
            timestamp: new Date(),
            user_email: 'test@example.com',
            user_role: 'admin',
            action: 'phi.view',
            resource_type: 'patient',
            resource_id: 1,
            status: 'success'
          }
        ],
        pagination: {}
      });
      mockGetProcessingActivities.mockResolvedValue({
        activities: [
          {
            action: 'create',
            resourceType: 'patient',
            count: 10,
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            uniqueUsers: 2
          }
        ]
      });

      mockReq.query = { format: 'csv', section: 'all' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should export specific section', async () => {
      mockGetDataInventory.mockResolvedValue({
        inventory: []
      });

      mockReq.query = { format: 'csv', section: 'inventory' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockGetDataInventory).toHaveBeenCalled();
      expect(mockGetAccessLogs).not.toHaveBeenCalled();
    });

    it('should handle invalid format', async () => {
      mockReq.query = { format: 'xml' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid format. Supported formats: csv, pdf'
        })
      );
    });

    it('should handle PDF export (not implemented)', async () => {
      mockReq.query = { format: 'pdf' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'PDF export not yet implemented'
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Export failed');
      mockGetDataInventory.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockReq.query = { format: 'csv', section: 'inventory' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      consoleSpy.mockRestore();
    });

    it('should use default format if not provided', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });

      mockReq.query = { section: 'inventory' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should handle missing user info', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });
      mockReq.user = null;

      mockReq.query = { format: 'csv', section: 'inventory' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should handle missing IP address', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });
      mockReq.ip = null;
      mockReq.connection = null;

      mockReq.query = { format: 'csv', section: 'inventory' };

      await dataAuditController.exportAuditReportController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null
        })
      );
    });
  });

  describe('verifyAuditLogIntegrityController', () => {
    it('should return valid integrity verification result', async () => {
      const verificationResult = {
        isValid: true,
        totalLogs: 100,
        verifiedLogs: 100,
        tamperedLogs: [],
        message: 'All 100 audit logs verified - no tampering detected'
      };

      mockVerifyAuditLogIntegrity.mockResolvedValue(verificationResult);

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockVerifyAuditLogIntegrity).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_audit.integrity_verification',
          resourceType: 'audit_logs',
          status: 'success'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: verificationResult.message,
          data: verificationResult
        })
      );
    });

    it('should return invalid integrity verification result when tampering detected', async () => {
      const verificationResult = {
        isValid: false,
        totalLogs: 100,
        verifiedLogs: 98,
        tamperedLogs: [
          {
            logId: 50,
            timestamp: new Date('2024-01-15'),
            action: 'test.action',
            expectedPreviousHash: 'correct_hash',
            storedPreviousHash: 'wrong_hash',
            issue: 'Hash chain broken - possible tampering'
          },
          {
            logId: 75,
            timestamp: new Date('2024-01-20'),
            action: 'test.action2',
            expectedPreviousHash: 'correct_hash2',
            storedPreviousHash: 'wrong_hash2',
            issue: 'Hash chain broken - possible tampering'
          }
        ],
        message: '⚠️ 2 log(s) with integrity issues detected'
      };

      mockVerifyAuditLogIntegrity.mockResolvedValue(verificationResult);

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: verificationResult.message,
          data: verificationResult
        })
      );
    });

    it('should handle errors during verification', async () => {
      const error = new Error('Database connection failed');
      mockVerifyAuditLogIntegrity.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to verify audit log integrity'
        })
      );
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errorMessage: 'Database connection failed'
        })
      );
      consoleSpy.mockRestore();
    });

    it('should handle missing user in request', async () => {
      const verificationResult = {
        isValid: true,
        totalLogs: 0,
        verifiedLogs: 0,
        tamperedLogs: [],
        message: 'No audit logs found'
      };

      mockVerifyAuditLogIntegrity.mockResolvedValue(verificationResult);
      mockReq.user = null;

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should handle missing IP address', async () => {
      const verificationResult = {
        isValid: true,
        totalLogs: 10,
        verifiedLogs: 10,
        tamperedLogs: [],
        message: 'All 10 audit logs verified - no tampering detected'
      };

      mockVerifyAuditLogIntegrity.mockResolvedValue(verificationResult);
      mockReq.ip = null;
      mockReq.connection = null;

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null
        })
      );
    });

    it('should expose error details in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Verification failed');
      mockVerifyAuditLogIntegrity.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Verification failed'
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not expose error details in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Verification failed');
      mockVerifyAuditLogIntegrity.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          error: expect.anything()
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should handle verification result with no logs', async () => {
      const verificationResult = {
        isValid: true,
        totalLogs: 0,
        verifiedLogs: 0,
        tamperedLogs: [],
        message: 'No audit logs found'
      };

      mockVerifyAuditLogIntegrity.mockResolvedValue(verificationResult);

      await dataAuditController.verifyAuditLogIntegrityController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'No audit logs found',
          data: verificationResult
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user in request', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });
      mockReq.user = null;

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should handle missing user agent', async () => {
      mockGetDataInventory.mockResolvedValue({ inventory: [] });
      mockReq.get = jest.fn(() => null);

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: null
        })
      );
    });

    it('should handle development environment errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      mockGetDataInventory.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error'
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not expose error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      mockGetDataInventory.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await dataAuditController.getDataInventoryController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          error: expect.anything()
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('verifyImmutabilityStatusController', () => {
    it('should return immutability status when fully protected', async () => {
      const statusResult = {
        deleteProtection: 'ACTIVE',
        updateProtection: 'ACTIVE',
        isFullyProtected: true,
        triggers: [
          {
            trigger_name: 'audit_logs_prevent_delete',
            event_manipulation: 'DELETE',
            action_timing: 'BEFORE'
          },
          {
            trigger_name: 'audit_logs_prevent_update',
            event_manipulation: 'UPDATE',
            action_timing: 'BEFORE'
          }
        ],
        message: 'Database-level immutability is fully active'
      };

      mockVerifyImmutabilityStatus.mockResolvedValue(statusResult);

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockVerifyImmutabilityStatus).toHaveBeenCalled();
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_audit.immutability_status',
          resourceType: 'audit_logs',
          status: 'success'
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: statusResult.message,
          data: statusResult
        })
      );
    });

    it('should return immutability status when partially protected', async () => {
      const statusResult = {
        deleteProtection: 'ACTIVE',
        updateProtection: 'MISSING',
        isFullyProtected: false,
        triggers: [
          {
            trigger_name: 'audit_logs_prevent_delete',
            event_manipulation: 'DELETE',
            action_timing: 'BEFORE'
          }
        ],
        message: 'Database-level immutability is not fully active - some triggers are missing'
      };

      mockVerifyImmutabilityStatus.mockResolvedValue(statusResult);

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: statusResult.message,
          data: statusResult
        })
      );
    });

    it('should return immutability status when not protected', async () => {
      const statusResult = {
        deleteProtection: 'MISSING',
        updateProtection: 'MISSING',
        isFullyProtected: false,
        triggers: [],
        message: 'Database-level immutability is not fully active - some triggers are missing'
      };

      mockVerifyImmutabilityStatus.mockResolvedValue(statusResult);

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isFullyProtected: false
          })
        })
      );
    });

    it('should handle errors during immutability status check', async () => {
      const error = new Error('Database connection failed');
      mockVerifyImmutabilityStatus.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to verify immutability status'
        })
      );
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_audit.immutability_status',
          status: 'error',
          errorMessage: 'Database connection failed'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle missing user in request', async () => {
      const statusResult = {
        deleteProtection: 'ACTIVE',
        updateProtection: 'ACTIVE',
        isFullyProtected: true,
        triggers: [],
        message: 'Database-level immutability is fully active'
      };

      mockVerifyImmutabilityStatus.mockResolvedValue(statusResult);
      mockReq.user = null;

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          userEmail: null,
          userRole: null
        })
      );
    });

    it('should handle unknown immutability status', async () => {
      const statusResult = {
        deleteProtection: 'UNKNOWN',
        updateProtection: 'UNKNOWN',
        isFullyProtected: false,
        triggers: [],
        error: 'Connection timeout',
        message: 'Failed to verify immutability status'
      };

      mockVerifyImmutabilityStatus.mockResolvedValue(statusResult);

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            deleteProtection: 'UNKNOWN',
            updateProtection: 'UNKNOWN'
          })
        })
      );
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Database connection failed');
      mockVerifyImmutabilityStatus.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Database connection failed'
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not include error details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Database connection failed');
      mockVerifyImmutabilityStatus.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { verifyImmutabilityStatusController } = await import('../controllers/dataAuditController.js');
      await verifyImmutabilityStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: undefined
        })
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});

