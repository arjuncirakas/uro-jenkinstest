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
});

