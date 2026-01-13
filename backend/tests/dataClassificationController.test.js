import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getClassificationsController,
  setClassificationController,
  initializeClassificationsController
} from '../controllers/dataClassificationController.js';
import * as dataClassificationService from '../services/dataClassificationService.js';
import * as auditLogger from '../services/auditLogger.js';

// Mock services
jest.mock('../services/dataClassificationService.js');
jest.mock('../services/auditLogger.js');

describe('Data Classification Controller', () => {
  let mockReq, mockRes;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      user: {
        id: 1,
        email: 'admin@test.com',
        role: 'superadmin'
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      method: 'GET',
      path: '/superadmin/data-classification',
      body: {}
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    auditLogger.logAuditEvent.mockResolvedValue(true);
  });
  
  describe('getClassificationsController', () => {
    it('should return classifications successfully', async () => {
      const mockClassifications = [
        { id: 1, table_name: 'patients', classification_level: 4 }
      ];
      
      dataClassificationService.getAllClassifications.mockResolvedValue(mockClassifications);
      
      await getClassificationsController(mockReq, mockRes);
      
      expect(dataClassificationService.getAllClassifications).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Classifications retrieved successfully',
        data: mockClassifications
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.view',
          status: 'success'
        })
      );
    });
    
    it('should handle errors', async () => {
      const error = new Error('Database error');
      dataClassificationService.getAllClassifications.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await getClassificationsController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve classifications'
        })
      );
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.view',
          status: 'error'
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should log audit event on access', async () => {
      dataClassificationService.getAllClassifications.mockResolvedValue([]);
      
      await getClassificationsController(mockReq, mockRes);
      
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          userEmail: 'admin@test.com',
          userRole: 'superadmin',
          action: 'data_classification.view'
        })
      );
    });
  });
  
  describe('setClassificationController', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.path = '/superadmin/data-classification';
      mockReq.body = {
        tableName: 'patients',
        level: 4,
        description: 'Medical data'
      };
    });
    
    it('should set classification successfully', async () => {
      dataClassificationService.setTableClassification.mockResolvedValue({
        success: true,
        message: 'Classification set to Level 4 for patients'
      });
      
      await setClassificationController(mockReq, mockRes);
      
      expect(dataClassificationService.setTableClassification).toHaveBeenCalledWith(
        'patients',
        4,
        'Medical data'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Classification updated for patients'
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.update',
          status: 'success',
          metadata: { tableName: 'patients', level: 4, description: 'Medical data' }
        })
      );
    });
    
    it('should return 400 if tableName is missing', async () => {
      mockReq.body = { level: 4 };
      
      await setClassificationController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'tableName and level are required'
      });
      expect(dataClassificationService.setTableClassification).not.toHaveBeenCalled();
    });
    
    it('should return 400 if level is missing', async () => {
      mockReq.body = { tableName: 'patients' };
      
      await setClassificationController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'tableName and level are required'
      });
    });
    
    it('should return 400 if level is less than 1', async () => {
      mockReq.body = { tableName: 'patients', level: 0 };
      
      await setClassificationController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Classification level must be between 1 and 5'
      });
    });
    
    it('should return 400 if level is greater than 5', async () => {
      mockReq.body = { tableName: 'patients', level: 6 };
      
      await setClassificationController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Classification level must be between 1 and 5'
      });
    });
    
    it('should handle service errors', async () => {
      const error = new Error('Database error');
      dataClassificationService.setTableClassification.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await setClassificationController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database error'
        })
      );
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.update',
          status: 'error'
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should handle null description', async () => {
      mockReq.body = { tableName: 'patients', level: 4 };
      dataClassificationService.setTableClassification.mockResolvedValue({
        success: true
      });
      
      await setClassificationController(mockReq, mockRes);
      
      expect(dataClassificationService.setTableClassification).toHaveBeenCalledWith(
        'patients',
        4,
        undefined
      );
    });
  });
  
  describe('initializeClassificationsController', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.path = '/superadmin/data-classification/initialize';
    });
    
    it('should initialize classifications successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Initialized classifications for 10 tables',
        classifications: [
          { table_name: 'patients', classification_level: 4 }
        ]
      };
      
      dataClassificationService.initializeDefaultClassifications.mockResolvedValue(mockResult);
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(dataClassificationService.initializeDefaultClassifications).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
        data: mockResult.classifications
      });
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.initialize',
          status: 'success'
        })
      );
    });
    
    it('should handle errors', async () => {
      const error = new Error('Database error');
      dataClassificationService.initializeDefaultClassifications.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to initialize classifications'
        })
      );
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data_classification.initialize',
          status: 'error'
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should log audit event on initialization', async () => {
      dataClassificationService.initializeDefaultClassifications.mockResolvedValue({
        success: true,
        message: 'Initialized',
        classifications: []
      });
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'data_classification.initialize'
        })
      );
    });

    it('should handle missing user in request', async () => {
      mockReq.user = null;
      dataClassificationService.initializeDefaultClassifications.mockResolvedValue({
        success: true,
        message: 'Initialized',
        classifications: []
      });
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should handle development environment error display', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Database error');
      dataClassificationService.initializeDefaultClassifications.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error'
        })
      );
      
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should hide error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Database error');
      dataClassificationService.initializeDefaultClassifications.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await initializeClassificationsController(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: undefined
        })
      );
      
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('getClassificationsController - Edge Cases', () => {
    it('should handle missing user in request', async () => {
      mockReq.user = null;
      dataClassificationService.getAllClassifications.mockResolvedValue([]);
      
      await getClassificationsController(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });

    it('should handle missing IP address', async () => {
      mockReq.ip = null;
      mockReq.connection = null;
      dataClassificationService.getAllClassifications.mockResolvedValue([]);
      
      await getClassificationsController(mockReq, mockRes);
      
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null
        })
      );
    });
  });

  describe('setClassificationController - Edge Cases', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.path = '/superadmin/data-classification';
      mockReq.body = {
        tableName: 'patients',
        level: 4,
        description: 'Medical data'
      };
    });

    it('should handle empty string description', async () => {
      mockReq.body.description = '';
      dataClassificationService.setTableClassification.mockResolvedValue({
        success: true
      });
      
      await setClassificationController(mockReq, mockRes);
      
      expect(dataClassificationService.setTableClassification).toHaveBeenCalledWith(
        'patients',
        4,
        ''
      );
    });

    it('should handle missing user in request', async () => {
      mockReq.user = null;
      dataClassificationService.setTableClassification.mockResolvedValue({
        success: true
      });
      
      await setClassificationController(mockReq, mockRes);
      
      expect(auditLogger.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null
        })
      );
    });
  });
});

