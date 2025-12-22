import { jest, describe, it, expect } from '@jest/globals';
import * as patientController from '../controllers/patientController.js';

describe('Patient Controller Integration Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnValue({ success: false, message: 'test' })
    };
  });

  describe('sendErrorResponse usage in validation', () => {
    it('should use sendErrorResponse for validation errors', () => {
      const { sendErrorResponse } = patientController;
      
      sendErrorResponse(mockRes, 400, 'Validation error');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('checkExistingEmail integration', () => {
    it('should handle email check returning exists: true', async () => {
      const { checkExistingEmail, sendErrorResponse } = patientController;
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1 }]
        })
      };

      const emailCheck = await checkExistingEmail(mockClient, 'test@example.com');
      
      if (emailCheck?.exists) {
        sendErrorResponse(mockRes, emailCheck.error.status, emailCheck.error.message);
      }

      expect(emailCheck.exists).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should handle email check returning exists: false', async () => {
      const { checkExistingEmail } = patientController;
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };

      const emailCheck = await checkExistingEmail(mockClient, 'test@example.com');
      
      expect(emailCheck.exists).toBe(false);
    });
  });

  describe('checkExistingPhone integration', () => {
    it('should handle phone check returning exists: true', async () => {
      const { checkExistingPhone, sendErrorResponse } = patientController;
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1 }]
        })
      };

      const phoneCheck = await checkExistingPhone(mockClient, '1234567890');
      
      if (phoneCheck?.exists) {
        sendErrorResponse(mockRes, phoneCheck.error.status, phoneCheck.error.message);
      }

      expect(phoneCheck.exists).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should handle phone check returning exists: false', async () => {
      const { checkExistingPhone } = patientController;
      
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };

      const phoneCheck = await checkExistingPhone(mockClient, '1234567890');
      
      expect(phoneCheck.exists).toBe(false);
    });
  });

  describe('handleUniqueConstraintError integration', () => {
    it('should handle constraint error in catch block', () => {
      const { handleUniqueConstraintError } = patientController;
      
      const error = {
        code: '23505',
        constraint: 'patients_email_key'
      };

      const result = handleUniqueConstraintError(error, mockRes);
      
      expect(result).toBeDefined();
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return null for non-constraint errors', () => {
      const { handleUniqueConstraintError } = patientController;
      
      const error = {
        code: '23503',
        constraint: 'some_constraint'
      };

      const result = handleUniqueConstraintError(error, mockRes);
      
      expect(result).toBeNull();
    });
  });

  describe('parseJsonField integration', () => {
    it('should parse triageSymptoms in response', () => {
      const { parseJsonField } = patientController;
      
      const triageSymptoms = '{"symptom1": "value1"}';
      const result = parseJsonField(triageSymptoms, null);
      
      expect(result).toEqual({ symptom1: 'value1' });
    });

    it('should parse comorbidities in response', () => {
      const { parseJsonField } = patientController;
      
      const comorbidities = '["diabetes", "hypertension"]';
      const result = parseJsonField(comorbidities, []);
      
      expect(result).toEqual(['diabetes', 'hypertension']);
    });

    it('should handle null triageSymptoms', () => {
      const { parseJsonField } = patientController;
      
      const result = parseJsonField(null, null);
      
      expect(result).toBeNull();
    });

    it('should handle null comorbidities', () => {
      const { parseJsonField } = patientController;
      
      const result = parseJsonField(null, []);
      
      expect(result).toEqual([]);
    });
  });
});

