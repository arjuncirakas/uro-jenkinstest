import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database pool
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient))
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock bcryptjs
const mockHash = jest.fn();
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: mockHash
  }
}));

// Mock express-validator
const mockValidationResult = jest.fn();
jest.unstable_mockModule('express-validator', () => ({
  validationResult: mockValidationResult
}));

describe('userControllerHelper', () => {
  let userControllerHelper;

  beforeEach(async () => {
    jest.clearAllMocks();
    userControllerHelper = await import('../controllers/userControllerHelper.js');
  });

  describe('Module exports', () => {
    it('should export all helper functions', () => {
      expect(typeof userControllerHelper.getAllUsersByRole).toBe('function');
      expect(typeof userControllerHelper.getUserByIdAndRole).toBe('function');
      expect(typeof userControllerHelper.checkEmailExists).toBe('function');
      expect(typeof userControllerHelper.checkPhoneExists).toBe('function');
      expect(typeof userControllerHelper.generateSecurePassword).toBe('function');
      expect(typeof userControllerHelper.hashPassword).toBe('function');
      expect(typeof userControllerHelper.softDeleteUserByRole).toBe('function');
      expect(typeof userControllerHelper.getValidationErrors).toBe('function');
      expect(typeof userControllerHelper.handleUniqueConstraintError).toBe('function');
      expect(typeof userControllerHelper.createErrorResponse).toBe('function');
      expect(typeof userControllerHelper.createSuccessResponse).toBe('function');
    });
  });

  describe('getAllUsersByRole', () => {
    it('should fetch all users by role successfully', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', role: 'nurse' },
        { id: 2, email: 'user2@test.com', role: 'nurse' }
      ];
      mockClient.query.mockResolvedValue({ rows: mockUsers });

      const result = await userControllerHelper.getAllUsersByRole('nurse', true);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUsers);
      expect(result.count).toBe(2);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      const result = await userControllerHelper.getAllUsersByRole('nurse', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch nurses');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should filter by is_active correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await userControllerHelper.getAllUsersByRole('nurse', false);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE role = $1 AND is_active = $2'),
        ['nurse', false]
      );
    });
  });

  describe('getUserByIdAndRole', () => {
    it('should fetch user by ID and role successfully', async () => {
      const mockUser = { id: 1, email: 'user@test.com', role: 'nurse' };
      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userControllerHelper.getUserByIdAndRole(1, 'nurse', 'Nurse');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return not found when user does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.getUserByIdAndRole(999, 'nurse', 'Nurse');

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
      expect(result.error).toBe('Nurse not found');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      const result = await userControllerHelper.getUserByIdAndRole(1, 'nurse', 'Nurse');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch Nurse');
    });
  });

  describe('checkEmailExists', () => {
    it('should return true when email exists', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return false when email does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.checkEmailExists(mockClient, 'test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('checkPhoneExists', () => {
    it('should return false when phone is not provided', async () => {
      const result = await userControllerHelper.checkPhoneExists(mockClient, null);
      expect(result).toBe(false);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should return true when phone exists', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await userControllerHelper.checkPhoneExists(mockClient, '1234567890');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1',
        ['1234567890']
      );
    });

    it('should exclude email when provided', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await userControllerHelper.checkPhoneExists(mockClient, '1234567890', 'test@example.com');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE phone = $1 AND email != $2',
        ['1234567890', 'test@example.com']
      );
    });

    it('should return false when phone does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.checkPhoneExists(mockClient, '1234567890');

      expect(result).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate a secure password', () => {
      const password = userControllerHelper.generateSecurePassword();

      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThanOrEqual(14);
      expect(password.length).toBeLessThanOrEqual(20);
    });

    it('should generate different passwords on each call', () => {
      const password1 = userControllerHelper.generateSecurePassword();
      const password2 = userControllerHelper.generateSecurePassword();

      // Very unlikely to be the same
      expect(password1).not.toBe(password2);
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const hashedPassword = '$2a$12$hashed';
      mockHash.mockResolvedValue(hashedPassword);

      const result = await userControllerHelper.hashPassword('plainPassword');

      expect(result).toBe(hashedPassword);
      expect(mockHash).toHaveBeenCalledWith('plainPassword', 12);
    });
  });

  describe('softDeleteUserByRole', () => {
    it('should soft delete user successfully', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }]
      });

      const result = await userControllerHelper.softDeleteUserByRole(1, 'nurse', 'Nurse');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Nurse deleted successfully');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1, 'nurse']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return not found when user does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userControllerHelper.softDeleteUserByRole(999, 'nurse', 'Nurse');

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
      expect(result.error).toBe('Nurse not found');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      const result = await userControllerHelper.softDeleteUserByRole(1, 'nurse', 'Nurse');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete Nurse');
    });
  });

  describe('getValidationErrors', () => {
    it('should return hasErrors false when no errors', () => {
      mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });

      const req = {};
      const result = userControllerHelper.getValidationErrors(req);

      expect(result.hasErrors).toBe(false);
    });

    it('should return hasErrors true when errors exist', () => {
      const errors = [{ field: 'email', msg: 'Invalid email' }];
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => errors
      });

      const req = {};
      const result = userControllerHelper.getValidationErrors(req);

      expect(result.hasErrors).toBe(true);
      expect(result.details).toEqual(errors);
    });
  });

  describe('handleUniqueConstraintError', () => {
    it('should handle unique constraint violation', () => {
      const error = { code: '23505' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');

      expect(result.status).toBe(409);
      expect(result.error).toBe('Nurse with this email or phone already exists');
    });

    it('should handle other errors', () => {
      const error = { code: 'OTHER' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');

      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process Nurse');
    });

    it('should handle null error', () => {
      const result = userControllerHelper.handleUniqueConstraintError(null, 'Nurse');

      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process Nurse');
    });

    it('should handle error without code property', () => {
      const error = { message: 'Some error' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');

      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process Nurse');
    });

    it('should handle error with different code', () => {
      const error = { code: '23503', message: 'Foreign key violation' };
      const result = userControllerHelper.handleUniqueConstraintError(error, 'Nurse');

      expect(result.status).toBe(500);
      expect(result.error).toBe('Failed to process Nurse');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      userControllerHelper.createErrorResponse(mockRes, 400, 'Error message');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error message'
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with default status', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      userControllerHelper.createSuccessResponse(mockRes, { message: 'Success' });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success'
      });
    });

    it('should create success response with custom status', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      userControllerHelper.createSuccessResponse(mockRes, { message: 'Created' }, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created'
      });
    });
  });
});
