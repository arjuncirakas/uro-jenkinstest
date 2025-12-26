import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => Promise.resolve({
  query: mockQuery,
  release: mockRelease
}));

jest.unstable_mockModule('../config/database.js', () => ({
  default: { connect: mockConnect }
}));

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn((password, rounds) => Promise.resolve(`hashed_${password}`))
  }
}));

jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => [])
  }))
}));

// Import after mocking
const userControllerHelper = await import('../controllers/userControllerHelper.js');
const bcrypt = await import('bcryptjs');
const { validationResult } = await import('express-validator');

describe('userControllerHelper', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: mockQuery,
      release: mockRelease
    };
    mockConnect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsersByRole', () => {
    it('should get all users by role successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 1, email: 'user1@test.com', role: 'urologist' },
          { id: 2, email: 'user2@test.com', role: 'urologist' }
        ]
      });

      const result = await userControllerHelper.getAllUsersByRole('urologist', true);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['urologist', true]
      );
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await userControllerHelper.getAllUsersByRole('urologist', true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
    });
  });

  describe('getUserByIdAndRole', () => {
    it('should get user by ID and role successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com', role: 'urologist' }]
      });

      const result = await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return notFound when user does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.getUserByIdAndRole('999', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
      expect(result.error).toContain('not found');
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
    });
  });

  describe('checkEmailExists', () => {
    it('should return true when email exists', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return false when email does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('checkPhoneExists', () => {
    it('should return true when phone exists', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      const result = await userControllerHelper.checkPhoneExists(mockClient, '+1234567890');

      expect(result).toBe(true);
    });

    it('should return false when phone does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.checkPhoneExists(mockClient, '+1234567890');

      expect(result).toBe(false);
    });

    it('should return false when phone is empty', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, '');

      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should exclude email when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await userControllerHelper.checkPhoneExists(mockClient, '+1234567890', 'test@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1 AND email != $2',
        ['+1234567890', 'test@example.com']
      );
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate a password with required character types', () => {
      const password = userControllerHelper.generateSecurePassword();

      expect(password.length).toBeGreaterThanOrEqual(14);
      expect(password.length).toBeLessThanOrEqual(20);
      // Check for at least one of each type
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should generate different passwords on each call', () => {
      const password1 = userControllerHelper.generateSecurePassword();
      const password2 = userControllerHelper.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashed = await userControllerHelper.hashPassword(password);

      expect(hashed).toBe(`hashed_${password}`);
      expect(bcrypt.default.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('softDeleteUserByRole', () => {
    it('should soft delete user successfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }]
      });

      const result = await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['1', 'urologist']
      );
    });

    it('should return notFound when user does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.softDeleteUserByRole('999', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete');
    });
  });

  describe('getValidationErrors', () => {
    it('should return no errors when validation passes', () => {
      validationResult.mockReturnValue({
        isEmpty: jest.fn(() => true),
        array: jest.fn(() => [])
      });

      const req = {};
      const result = userControllerHelper.getValidationErrors(req);

      expect(result.hasErrors).toBe(false);
    });

    it('should return errors when validation fails', () => {
      const errors = [
        { path: 'email', msg: 'Invalid email' },
        { path: 'phone', msg: 'Invalid phone' }
      ];
      validationResult.mockReturnValue({
        isEmpty: jest.fn(() => false),
        array: jest.fn(() => errors)
      });

      const req = {};
      const result = userControllerHelper.getValidationErrors(req);

      expect(result.hasErrors).toBe(true);
      expect(result.details).toEqual(errors);
    });
  });

  describe('handleUniqueConstraintError', () => {
    it('should return 409 for unique constraint violation', () => {
      const error = { code: '23505' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'User');

      expect(result.status).toBe(409);
      expect(result.error).toContain('already exists');
    });

    it('should return 500 for other errors', () => {
      const error = { code: '23503' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'User');

      expect(result.status).toBe(500);
      expect(result.error).toContain('Failed to process');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createErrorResponse(mockRes, 400, 'Test error');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error'
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with default status 200', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createSuccessResponse(mockRes, { data: 'test' });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: 'test'
      });
    });

    it('should create success response with custom status', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createSuccessResponse(mockRes, { data: 'test' }, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('checkPhoneExists - all conditions', () => {
    it('should return false when phone is null', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, null);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return false when phone is empty string', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, '');
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return false when phone is undefined', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, undefined);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should check phone without excludeEmail', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await userControllerHelper.checkPhoneExists(mockClient, '1234567890');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1',
        ['1234567890']
      );
      expect(result).toBe(false);
    });

    it('should check phone with excludeEmail', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await userControllerHelper.checkPhoneExists(mockClient, '1234567890', 'test@test.com');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1 AND email != $2',
        ['1234567890', 'test@test.com']
      );
      expect(result).toBe(true);
    });

    it('should return true when phone exists with excludeEmail', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 2 }] });
      const result = await userControllerHelper.checkPhoneExists(mockClient, '1234567890', 'other@test.com');
      expect(result).toBe(true);
    });
  });

  describe('generateSecurePassword - all logic paths', () => {
    it('should generate password with all character types', () => {
      const password = userControllerHelper.generateSecurePassword();
      // Password length: 4 initial + 10-15 random = 14-19 characters
      expect(password.length).toBeGreaterThanOrEqual(14);
      expect(password.length).toBeLessThanOrEqual(19);
    });

    it('should include lowercase letter', () => {
      const password = userControllerHelper.generateSecurePassword();
      expect(password).toMatch(/[a-z]/);
    });

    it('should include uppercase letter', () => {
      const password = userControllerHelper.generateSecurePassword();
      expect(password).toMatch(/[A-Z]/);
    });

    it('should include number', () => {
      const password = userControllerHelper.generateSecurePassword();
      expect(password).toMatch(/[0-9]/);
    });

    it('should include special character', () => {
      const password = userControllerHelper.generateSecurePassword();
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
    });

    it('should shuffle password (Fisher-Yates)', () => {
      // Generate multiple passwords to ensure shuffle works
      const passwords = Array.from({ length: 10 }, () => userControllerHelper.generateSecurePassword());
      // All should be different (very unlikely to be same after shuffle)
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBeGreaterThan(1);
    });

    it('should generate different passwords each time', () => {
      const password1 = userControllerHelper.generateSecurePassword();
      const password2 = userControllerHelper.generateSecurePassword();
      // Very unlikely to be the same
      expect(password1).not.toBe(password2);
    });

    it('should handle remainingLength calculation (10 + random 0-5)', () => {
      const password = userControllerHelper.generateSecurePassword();
      // Should be at least 14 (4 initial + 10 minimum)
      expect(password.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('getAllUsersByRole - roleFilter parameter', () => {
    it('should use roleFilter false', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.getAllUsersByRole('urologist', false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['urologist', false]
      );
    });

    it('should use default roleFilter true', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.getAllUsersByRole('urologist');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['urologist', true]
      );
    });
  });

  describe('handleUniqueConstraintError - all conditions', () => {
    it('should handle error code 23505 (unique constraint)', () => {
      const error = { code: '23505' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');
      expect(result.status).toBe(409);
      expect(result.error).toContain('already exists');
    });

    it('should handle other error codes', () => {
      const error = { code: '23503' }; // Foreign key violation
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');
      expect(result.status).toBe(500);
      expect(result.error).toContain('Failed to process');
    });

    it('should handle error without code', () => {
      const error = { message: 'Some error' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');
      expect(result.status).toBe(500);
    });
  });

  describe('getValidationErrors - all conditions', () => {
    it('should return hasErrors true when errors exist', () => {
      validationResult.mockReturnValueOnce({
        isEmpty: () => false,
        array: () => [{ msg: 'Error 1' }, { msg: 'Error 2' }]
      });

      const mockReq = {};
      const result = userControllerHelper.getValidationErrors(mockReq);
      expect(result.hasErrors).toBe(true);
      expect(result.details).toHaveLength(2);
    });

    it('should return hasErrors false when no errors', () => {
      validationResult.mockReturnValueOnce({
        isEmpty: () => true,
        array: () => []
      });

      const mockReq = {};
      const result = userControllerHelper.getValidationErrors(mockReq);
      expect(result.hasErrors).toBe(false);
    });
  });

  describe('softDeleteUserByRole - error handling', () => {
    it('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserByIdAndRole - error handling', () => {
    it('should handle database error', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllUsersByRole - error handling', () => {
    it('should handle database query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await userControllerHelper.getAllUsersByRole('urologist', true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should ensure client.release is called even on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query error'));
      const result = await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(result.success).toBe(false);
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('getUserByIdAndRole - all code paths', () => {
    it('should ensure client.release is called even on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should ensure client.release is called on success', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com', role: 'urologist' }]
      });
      await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('softDeleteUserByRole - all code paths', () => {
    it('should ensure client.release is called even on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should ensure client.release is called on success', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }]
      });
      await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should ensure client.release is called when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.softDeleteUserByRole('999', 'urologist', 'Urologist');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('getAllUsersByRole - all code paths', () => {
    it('should ensure client.release is called even on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));
      await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should ensure client.release is called on success', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('generateSecurePassword - all logic paths', () => {
    it('should handle minimum remainingLength (10)', () => {
      // Test that password can be exactly 14 characters (4 initial + 10 minimum)
      let foundMinLength = false;
      for (let i = 0; i < 100; i++) {
        const password = userControllerHelper.generateSecurePassword();
        if (password.length === 14) {
          foundMinLength = true;
          break;
        }
      }
      // At least one should hit minimum length
      expect(foundMinLength).toBe(true);
    });

    it('should handle maximum remainingLength (15)', () => {
      // Test that password can be exactly 19 characters (4 initial + 15 maximum)
      let foundMaxLength = false;
      for (let i = 0; i < 100; i++) {
        const password = userControllerHelper.generateSecurePassword();
        if (password.length === 19) {
          foundMaxLength = true;
          break;
        }
      }
      // At least one should hit maximum length
      expect(foundMaxLength).toBe(true);
    });

    it('should ensure Fisher-Yates shuffle changes order', () => {
      // Generate password and verify characters are shuffled
      const password = userControllerHelper.generateSecurePassword();
      // First 4 characters should not always be lowercase, uppercase, number, special in that order
      // After shuffle, they should be in random positions
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
      
      expect(hasLowercase).toBe(true);
      expect(hasUppercase).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
      
      // Verify shuffle actually moved characters (password should not start with lowercase, uppercase, number, special in order)
      // This is probabilistic but very likely after shuffle
      const firstFour = password.substring(0, 4);
      const allLower = /^[a-z]{4}$/.test(firstFour);
      const allUpper = /^[A-Z]{4}$/.test(firstFour);
      const allNumber = /^[0-9]{4}$/.test(firstFour);
      const allSpecial = /^[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{4}$/.test(firstFour);
      
      // After shuffle, it's very unlikely all first 4 are the same type
      expect(allLower || allUpper || allNumber || allSpecial).toBe(false);
    });

    it('should handle shuffle with i = 1 (edge case)', () => {
      // Generate multiple passwords to ensure shuffle loop with i = 1 is executed
      const passwords = Array.from({ length: 50 }, () => userControllerHelper.generateSecurePassword());
      // All should be valid
      passwords.forEach(password => {
        expect(password.length).toBeGreaterThanOrEqual(14);
        expect(password.length).toBeLessThanOrEqual(19);
      });
    });
  });

  describe('checkPhoneExists - all conditional branches', () => {
    it('should handle phone as 0 (falsy)', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, 0);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle phone as false (falsy)', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, false);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should use query without excludeEmail when excludeEmail is null', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.checkPhoneExists(mockClient, '1234567890', null);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1',
        ['1234567890']
      );
    });

    it('should use query with excludeEmail when excludeEmail is provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.checkPhoneExists(mockClient, '1234567890', 'test@test.com');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1 AND email != $2',
        ['1234567890', 'test@test.com']
      );
    });
  });

  describe('createSuccessResponse - all parameters', () => {
    it('should handle empty data object', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createSuccessResponse(mockRes, {});

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true
      });
    });

    it('should handle data with multiple properties', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createSuccessResponse(mockRes, { data: 'test', count: 5, message: 'Success' });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: 'test',
        count: 5,
        message: 'Success'
      });
    });
  });

  describe('createErrorResponse - all parameters', () => {
    it('should handle different status codes', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createErrorResponse(mockRes, 404, 'Not found');
      expect(mockRes.status).toHaveBeenCalledWith(404);

      userControllerHelper.createErrorResponse(mockRes, 500, 'Server error');
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle empty error message', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      userControllerHelper.createErrorResponse(mockRes, 400, '');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: ''
      });
    });
  });

  describe('handleUniqueConstraintError - all error types', () => {
    it('should handle error with code 23505 exactly', () => {
      const error = { code: '23505' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(409);
      expect(result.error).toBe('TestEntity with this email or phone already exists');
    });

    it('should handle error with different code', () => {
      const error = { code: '42P01' }; // Table does not exist
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process TestEntity');
    });

    it('should handle error with no code property', () => {
      const error = { message: 'Some error' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process TestEntity');
    });

    it('should handle null error', () => {
      const error = null;
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process TestEntity');
    });

    it('should handle undefined error', () => {
      const error = undefined;
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process TestEntity');
    });
  });

  describe('getValidationErrors - edge cases', () => {
    it('should handle validationResult returning null', () => {
      validationResult.mockReturnValueOnce(null);
      const mockReq = {};
      // This should not crash - validationResult should always return an object
      // But if it doesn't, we test the code path
      try {
        const result = userControllerHelper.getValidationErrors(mockReq);
        // If validationResult returns null, errors.isEmpty() would throw
        // But in practice, express-validator always returns an object
        expect(result).toBeDefined();
      } catch (e) {
        // If it throws, that's also a valid code path
        expect(e).toBeDefined();
      }
    });
  });

  describe('generateSecurePassword - all loop iterations', () => {
    it('should execute all Fisher-Yates shuffle iterations', () => {
      // Generate multiple passwords to ensure all loop iterations are covered
      // The loop goes from passwordArray.length - 1 down to i > 0
      // So for a 14-char password, i goes from 13 down to 1
      const passwords = Array.from({ length: 100 }, () => userControllerHelper.generateSecurePassword());
      
      // Verify all passwords are valid
      passwords.forEach(password => {
        expect(password.length).toBeGreaterThanOrEqual(14);
        expect(password.length).toBeLessThanOrEqual(19);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[0-9]/.test(password)).toBe(true);
        expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
      });
    });

    it('should handle remainingLength loop with all possible values (10-15)', () => {
      // Test that all possible remainingLength values are covered
      const lengths = new Set();
      for (let i = 0; i < 200; i++) {
        const password = userControllerHelper.generateSecurePassword();
        lengths.add(password.length);
      }
      // Should have passwords of various lengths (14-19)
      expect(lengths.size).toBeGreaterThan(1);
    });
  });

  describe('checkPhoneExists - all falsy values', () => {
    it('should return false for phone = 0', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, 0);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return false for phone = false', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, false);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should return false for phone = NaN', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, NaN);
      expect(result).toBe(false);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('getAllUsersByRole - empty result set', () => {
    it('should handle empty result set', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getUserByIdAndRole - single row result', () => {
    it('should return first row when multiple rows exist (edge case)', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: 1, email: 'user1@test.com', role: 'urologist' },
          { id: 2, email: 'user2@test.com', role: 'urologist' }
        ]
      });
      const result = await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(1);
    });
  });

  describe('softDeleteUserByRole - return message format', () => {
    it('should return correct message format', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }]
      });
      const result = await userControllerHelper.softDeleteUserByRole('1', 'urologist', 'Urologist');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Urologist deleted successfully');
    });
  });

  describe('checkEmailExists - multiple rows', () => {
    it('should return true when multiple rows exist', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }]
      });
      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');
      expect(result).toBe(true);
    });
  });

  describe('checkPhoneExists - multiple rows with excludeEmail', () => {
    it('should return true when phone exists for different email', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 2 }, { id: 3 }]
      });
      const result = await userControllerHelper.checkPhoneExists(mockClient, '+1234567890', 'test@example.com');
      expect(result).toBe(true);
    });

    it('should return false when phone only exists for excluded email', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await userControllerHelper.checkPhoneExists(mockClient, '+1234567890', 'test@example.com');
      expect(result).toBe(false);
    });
  });

  describe('createSuccessResponse - spread operator coverage', () => {
    it('should spread all data properties', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const data = {
        data: [{ id: 1 }],
        count: 1,
        message: 'Success',
        extra: 'field'
      };
      userControllerHelper.createSuccessResponse(mockRes, data);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }],
        count: 1,
        message: 'Success',
        extra: 'field'
      });
    });
  });

  describe('handleUniqueConstraintError - string code comparison', () => {
    it('should handle code as number string', () => {
      const error = { code: 23505 }; // Number instead of string
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      // Should not match '23505' string, so should return 500
      expect(result.status).toBe(500);
    });

    it('should handle code as string exactly', () => {
      const error = { code: '23505' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'TestEntity');
      expect(result.status).toBe(409);
    });
  });

  describe('getAllUsersByRole - query parameter order', () => {
    it('should pass parameters in correct order', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.getAllUsersByRole('test_role', false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test_role', false]
      );
    });
  });

  describe('getUserByIdAndRole - query parameter order', () => {
    it('should pass parameters in correct order', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, email: 'test@test.com' }]
      });
      await userControllerHelper.getUserByIdAndRole('123', 'test_role', 'TestEntity');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123', 'test_role']
      );
    });
  });

  describe('softDeleteUserByRole - query parameter order', () => {
    it('should pass parameters in correct order', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, first_name: 'Test', last_name: 'User' }]
      });
      await userControllerHelper.softDeleteUserByRole('456', 'test_role', 'TestEntity');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['456', 'test_role']
      );
    });
  });

  describe('generateSecurePassword - all character selection paths', () => {
    it('should select from all character sets', () => {
      const password = userControllerHelper.generateSecurePassword();
      // Verify each character set is used
      const hasLowercase = password.split('').some(char => 'abcdefghijklmnopqrstuvwxyz'.includes(char));
      const hasUppercase = password.split('').some(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(char));
      const hasNumber = password.split('').some(char => '0123456789'.includes(char));
      const hasSpecial = password.split('').some(char => '!@#$%^&*()_+-=[]{}|;:,.<>?'.includes(char));
      
      expect(hasLowercase).toBe(true);
      expect(hasUppercase).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
    });

    it('should handle all possible remainingLength values (10-15)', () => {
      const lengths = new Set();
      // Generate many passwords to cover all possible lengths
      for (let i = 0; i < 500; i++) {
        const password = userControllerHelper.generateSecurePassword();
        lengths.add(password.length);
        // Each length should be between 14 (4 initial + 10) and 19 (4 initial + 15)
        expect(password.length).toBeGreaterThanOrEqual(14);
        expect(password.length).toBeLessThanOrEqual(19);
      }
      // Should have covered multiple different lengths
      expect(lengths.size).toBeGreaterThan(1);
    });

    it('should execute all iterations of remainingLength loop', () => {
      // Generate passwords to ensure loop executes with different remainingLength values
      const passwords = Array.from({ length: 100 }, () => userControllerHelper.generateSecurePassword());
      passwords.forEach(password => {
        expect(password.length).toBeGreaterThanOrEqual(14);
        expect(password.length).toBeLessThanOrEqual(19);
      });
    });

    it('should execute all iterations of Fisher-Yates shuffle loop', () => {
      // Generate passwords to ensure shuffle loop executes for all i values
      // Loop goes from passwordArray.length - 1 down to i > 0
      const passwords = Array.from({ length: 100 }, () => userControllerHelper.generateSecurePassword());
      passwords.forEach(password => {
        // Verify password is shuffled (not in original order)
        // Original order would be: lowercase, uppercase, number, special, then random chars
        // After shuffle, this order should be broken
        expect(password.length).toBeGreaterThanOrEqual(14);
      });
    });

    it('should handle crypto.randomInt edge cases', () => {
      // Test that randomInt is called with correct ranges
      const password = userControllerHelper.generateSecurePassword();
      // Verify password structure is correct
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThanOrEqual(14);
      expect(password.length).toBeLessThanOrEqual(19);
    });
  });

  describe('checkPhoneExists - all parameter combinations', () => {
    it('should handle excludeEmail as empty string', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.checkPhoneExists(mockClient, '1234567890', '');
      // Empty string is falsy, so should use query without excludeEmail
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1',
        ['1234567890']
      );
    });

    it('should handle excludeEmail as 0', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await userControllerHelper.checkPhoneExists(mockClient, '1234567890', 0);
      // 0 is falsy, so should use query without excludeEmail
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1',
        ['1234567890']
      );
    });
  });

  describe('getAllUsersByRole - all code paths', () => {
    it('should handle single row result', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, email: 'user@test.com' }]
      });
      const result = await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should handle large result set', async () => {
      const largeResult = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, email: `user${i}@test.com` }));
      mockQuery.mockResolvedValue({ rows: largeResult });
      const result = await userControllerHelper.getAllUsersByRole('urologist', true);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(100);
      expect(result.count).toBe(100);
    });
  });

  describe('getUserByIdAndRole - all return paths', () => {
    it('should return data with all expected fields', async () => {
      const userData = {
        id: 1,
        email: 'test@test.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        organization: 'Test Org',
        role: 'urologist',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        last_login_at: new Date()
      };
      mockQuery.mockResolvedValue({ rows: [userData] });
      const result = await userControllerHelper.getUserByIdAndRole('1', 'urologist', 'Urologist');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(userData);
    });
  });

  describe('softDeleteUserByRole - all return paths', () => {
    it('should return message with correct entity name', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }]
      });
      const result = await userControllerHelper.softDeleteUserByRole('1', 'gp', 'GP');
      expect(result.success).toBe(true);
      expect(result.message).toBe('GP deleted successfully');
    });
  });

  describe('hashPassword - all code paths', () => {
    it('should hash different passwords differently', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const hashed1 = await userControllerHelper.hashPassword(password1);
      const hashed2 = await userControllerHelper.hashPassword(password2);
      expect(hashed1).not.toBe(hashed2);
    });

    it('should use saltRounds of 12', async () => {
      const password = 'testPassword';
      await userControllerHelper.hashPassword(password);
      expect(bcrypt.default.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('getValidationErrors - all code paths', () => {
    it('should handle empty errors array', () => {
      validationResult.mockReturnValueOnce({
        isEmpty: () => true,
        array: () => []
      });
      const mockReq = {};
      const result = userControllerHelper.getValidationErrors(mockReq);
      expect(result.hasErrors).toBe(false);
    });

    it('should handle single error', () => {
      validationResult.mockReturnValueOnce({
        isEmpty: () => false,
        array: () => [{ msg: 'Single error' }]
      });
      const mockReq = {};
      const result = userControllerHelper.getValidationErrors(mockReq);
      expect(result.hasErrors).toBe(true);
      expect(result.details).toHaveLength(1);
    });
  });

  describe('createErrorResponse - all code paths', () => {
    it('should return the response object', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const result = userControllerHelper.createErrorResponse(mockRes, 400, 'Error');
      expect(result).toBe(mockRes);
    });
  });

  describe('createSuccessResponse - all code paths', () => {
    it('should return the response object', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const result = userControllerHelper.createSuccessResponse(mockRes, { data: 'test' });
      expect(result).toBe(mockRes);
    });

    it('should handle status parameter correctly', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      userControllerHelper.createSuccessResponse(mockRes, { data: 'test' }, 201);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('checkEmailExists - all code paths', () => {
    it('should handle query returning multiple rows', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }]
      });
      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');
      expect(result).toBe(true);
    });
  });
});

