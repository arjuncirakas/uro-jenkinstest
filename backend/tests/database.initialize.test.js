/**
 * Tests for initializeDatabase function to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock pg module
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient)),
  on: jest.fn(),
  totalCount: 5,
  idleCount: 2,
  waitingCount: 0
};

jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => mockPool)
  }
}));

// Mock auditLogger
jest.unstable_mockModule('../services/auditLogger.js', () => ({
  initializeAuditLogsTable: jest.fn().mockResolvedValue(undefined)
}));

describe('database.js - initializeDatabase Coverage', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('initializeDatabase - users table exists path', () => {
    it('should handle existing users table and add new columns', async () => {
      const dbModule = await import('../config/database.js');
      
      // Mock table exists
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
        .mockResolvedValueOnce({}) // ALTER TABLE for phone
        .mockResolvedValueOnce({}) // ALTER TABLE for organization
        .mockResolvedValueOnce({}) // ALTER TABLE for is_active
        .mockResolvedValueOnce({}) // ALTER TABLE for is_verified
        .mockResolvedValueOnce({}) // ALTER TABLE for email_verified_at
        .mockResolvedValueOnce({}) // ALTER TABLE for phone_verified_at
        .mockResolvedValueOnce({}) // ALTER TABLE for last_login_at
        .mockResolvedValueOnce({}) // ALTER TABLE for failed_login_attempts
        .mockResolvedValueOnce({}) // ALTER TABLE for locked_until
        .mockResolvedValueOnce({}) // DROP CONSTRAINT
        .mockResolvedValueOnce({}) // ADD CONSTRAINT
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // refresh_tokens doesn't exist
        .mockResolvedValueOnce({}) // CREATE refresh_tokens
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // otp_verifications doesn't exist
        .mockResolvedValueOnce({}) // CREATE otp_verifications
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // password_setup_tokens doesn't exist
        .mockResolvedValueOnce({}) // CREATE password_setup_tokens
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // password_reset_tokens doesn't exist
        .mockResolvedValueOnce({}); // CREATE password_reset_tokens
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle column addition errors gracefully', async () => {
      const dbModule = await import('../config/database.js');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
        .mockRejectedValueOnce(new Error('Column already exists')) // ALTER TABLE fails
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }); // password_reset_tokens exists
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Column phone might already exist')
      );
    });

    it('should handle role constraint update errors', async () => {
      const dbModule = await import('../config/database.js');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // users table exists
        .mockResolvedValueOnce({}) // phone column
        .mockResolvedValueOnce({}) // organization column
        .mockResolvedValueOnce({}) // is_active column
        .mockResolvedValueOnce({}) // is_verified column
        .mockResolvedValueOnce({}) // email_verified_at column
        .mockResolvedValueOnce({}) // phone_verified_at column
        .mockResolvedValueOnce({}) // last_login_at column
        .mockResolvedValueOnce({}) // failed_login_attempts column
        .mockResolvedValueOnce({}) // locked_until column
        .mockRejectedValueOnce(new Error('Constraint error')) // DROP CONSTRAINT fails
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // refresh_tokens exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // otp_verifications exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // password_setup_tokens exists
        .mockResolvedValueOnce({ rows: [{ exists: true }] }); // password_reset_tokens exists
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Role constraint update')
      );
    });
  });

  describe('initializeDatabase - users table does not exist path', () => {
    it('should create users table when it does not exist', async () => {
      const dbModule = await import('../config/database.js');
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // users table doesn't exist
        .mockResolvedValueOnce({}) // CREATE users table
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // refresh_tokens doesn't exist
        .mockResolvedValueOnce({}) // CREATE refresh_tokens
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // otp_verifications doesn't exist
        .mockResolvedValueOnce({}) // CREATE otp_verifications
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // password_setup_tokens doesn't exist
        .mockResolvedValueOnce({}) // CREATE password_setup_tokens
        .mockResolvedValueOnce({ rows: [{ exists: false }] }) // password_reset_tokens doesn't exist
        .mockResolvedValueOnce({}); // CREATE password_reset_tokens
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Users table created successfully');
    });
  });

  describe('initializeDatabase - error handling', () => {
    it('should handle database connection errors', async () => {
      const dbModule = await import('../config/database.js');
      
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      const dbModule = await import('../config/database.js');
      
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));
      
      const result = await dbModule.initializeDatabase();
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});















