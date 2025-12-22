import { jest, describe, it, expect } from '@jest/globals';
import { 
  sendErrorResponse, 
  handleUniqueConstraintError, 
  parseJsonField, 
  checkExistingEmail, 
  checkExistingPhone 
} from '../controllers/patientController.js';

describe('Patient Controller Helper Functions', () => {
  describe('sendErrorResponse', () => {
    it('should send error response with correct status and message', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      sendErrorResponse(res, 400, 'Test error message');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error message'
      });
    });

    it('should handle different status codes', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      sendErrorResponse(res, 404, 'Not found');
      expect(res.status).toHaveBeenCalledWith(404);

      sendErrorResponse(res, 500, 'Server error');
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleUniqueConstraintError', () => {
    it('should handle patients_email_key constraint', () => {
      const error = {
        code: '23505',
        constraint: 'patients_email_key'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({ success: false, message: 'test' })
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeDefined();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this email already exists'
      });
    });

    it('should handle patients_phone_key constraint', () => {
      const error = {
        code: '23505',
        constraint: 'patients_phone_key'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({ success: false, message: 'test' })
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeDefined();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this phone number already exists'
      });
    });

    it('should handle patients_upi_key constraint', () => {
      const error = {
        code: '23505',
        constraint: 'patients_upi_key'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnValue({ success: false, message: 'test' })
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeDefined();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this UPI already exists'
      });
    });

    it('should return null for non-23505 error codes', () => {
      const error = {
        code: '23503',
        constraint: 'patients_email_key'
      };
      const res = {
        status: jest.fn(),
        json: jest.fn()
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return null for unknown constraints', () => {
      const error = {
        code: '23505',
        constraint: 'unknown_constraint'
      };
      const res = {
        status: jest.fn(),
        json: jest.fn()
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle error without constraint property', () => {
      const error = {
        code: '23505'
      };
      const res = {
        status: jest.fn(),
        json: jest.fn()
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle error with null constraint', () => {
      const error = {
        code: '23505',
        constraint: null
      };
      const res = {
        status: jest.fn(),
        json: jest.fn()
      };

      const result = handleUniqueConstraintError(error, res);

      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('parseJsonField', () => {
    it('should parse valid JSON string', () => {
      const jsonString = '{"key": "value"}';
      const result = parseJsonField(jsonString);

      expect(result).toEqual({ key: 'value' });
    });

    it('should return default value for null input', () => {
      const result = parseJsonField(null, 'default');

      expect(result).toBe('default');
    });

    it('should return default value for undefined input', () => {
      const result = parseJsonField(undefined, []);

      expect(result).toEqual([]);
    });

    it('should return default value for empty string', () => {
      const result = parseJsonField('', null);

      expect(result).toBeNull();
    });

    it('should return default value for invalid JSON', () => {
      const originalError = console.error;
      const mockError = jest.fn();
      console.error = mockError;
      
      const invalidJson = '{invalid json}';
      const result = parseJsonField(invalidJson, 'default');

      expect(result).toBe('default');
      expect(mockError).toHaveBeenCalled();
      
      console.error = originalError;
    });

    it('should parse array JSON', () => {
      const jsonString = '[1, 2, 3]';
      const result = parseJsonField(jsonString);

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('checkExistingEmail', () => {
    it('should return null when email is not provided', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingEmail(client, null);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should return exists: true when email exists', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1 }]
        })
      };

      const result = await checkExistingEmail(client, 'test@example.com');

      expect(result).toEqual({
        exists: true,
        error: {
          status: 409,
          message: 'Patient with this email already exists'
        }
      });
      expect(client.query).toHaveBeenCalledWith(
        'SELECT id FROM patients WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return exists: false when email does not exist', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };

      const result = await checkExistingEmail(client, 'test@example.com');

      expect(result).toEqual({ exists: false });
      expect(client.query).toHaveBeenCalled();
    });
  });

  describe('checkExistingPhone', () => {
    it('should return null when phone is not provided', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingPhone(client, null);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should return exists: true when phone exists', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1 }]
        })
      };

      const result = await checkExistingPhone(client, '1234567890');

      expect(result).toEqual({
        exists: true,
        error: {
          status: 409,
          message: 'Patient with this phone number already exists'
        }
      });
      expect(client.query).toHaveBeenCalledWith(
        'SELECT id FROM patients WHERE phone = $1',
        ['1234567890']
      );
    });

    it('should return exists: false when phone does not exist', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };

      const result = await checkExistingPhone(client, '1234567890');

      expect(result).toEqual({ exists: false });
      expect(client.query).toHaveBeenCalled();
    });

    it('should handle empty string email', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingEmail(client, '');

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should handle empty string phone', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingPhone(client, '');

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should handle undefined email', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingEmail(client, undefined);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should handle undefined phone', async () => {
      const client = {
        query: jest.fn()
      };

      const result = await checkExistingPhone(client, undefined);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });
  });

  describe('parseJsonField edge cases', () => {
    it('should handle whitespace-only string', () => {
      const result = parseJsonField('   ', null);
      expect(result).toBeNull();
    });

    it('should parse nested JSON objects', () => {
      const jsonString = '{"nested": {"key": "value"}, "array": [1, 2, 3]}';
      const result = parseJsonField(jsonString);
      expect(result).toEqual({
        nested: { key: 'value' },
        array: [1, 2, 3]
      });
    });

    it('should handle JSON with null values', () => {
      const jsonString = '{"key": null, "other": "value"}';
      const result = parseJsonField(jsonString);
      expect(result).toEqual({ key: null, other: 'value' });
    });

    it('should handle JSON with boolean values', () => {
      const jsonString = '{"enabled": true, "disabled": false}';
      const result = parseJsonField(jsonString);
      expect(result).toEqual({ enabled: true, disabled: false });
    });

    it('should handle JSON with number values', () => {
      const jsonString = '{"count": 42, "price": 99.99}';
      const result = parseJsonField(jsonString);
      expect(result).toEqual({ count: 42, price: 99.99 });
    });
  });
});

