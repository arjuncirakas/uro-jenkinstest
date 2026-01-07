/**
 * Comprehensive tests for database.js - covering missing paths
 * Tests all edge cases and code paths to achieve 100% coverage
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

const mockPoolConstructor = jest.fn(() => mockPool);

jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: mockPoolConstructor
  }
}));

// Mock auditLogger
const mockInitializeAuditLogsTable = jest.fn();
jest.unstable_mockModule('../services/auditLogger.js', () => ({
  initializeAuditLogsTable: mockInitializeAuditLogsTable
}));

describe('database.js - Complete Coverage for Missing Paths', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('testConnection - success path', () => {
    it('should successfully connect to database', async () => {
      const dbModule = await import('../config/database.js');
      
      mockPool.connect.mockResolvedValueOnce(mockClient);
      
      const result = await dbModule.testConnection();
      
      expect(result).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Database connected successfully');
    });
  });

  describe('testConnection - password masking', () => {
    it('should mask password when password is set', async () => {
      process.env.DB_PASSWORD = 'secret123';
      jest.resetModules();
      
      const dbModule = await import('../config/database.js');
      
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await dbModule.testConnection();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔌 Database config:',
        expect.objectContaining({
          password: '***'
        })
      );
    });

    it('should show "(not set)" when password is not set', async () => {
      delete process.env.DB_PASSWORD;
      
      // Need to re-import to get new config
      jest.resetModules();
      const dbModule = await import('../config/database.js');
      
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await dbModule.testConnection();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔌 Database config:',
        expect.objectContaining({
          password: '(not set)'
        })
      );
    });

    it('should show "(not set)" when password is empty string', async () => {
      process.env.DB_PASSWORD = '';
      
      jest.resetModules();
      const dbModule = await import('../config/database.js');
      
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await dbModule.testConnection();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔌 Database config:',
        expect.objectContaining({
          password: '(not set)'
        })
      );
    });
  });

  describe('testConnection - error handling edge cases', () => {
    it('should handle error without stack trace', async () => {
      const dbModule = await import('../config/database.js');
      
      const error = new Error('Connection failed');
      delete error.stack;
      error.code = 'UNKNOWN';
      error.name = 'Error';
      
      mockPool.connect.mockRejectedValueOnce(error);
      
      await dbModule.testConnection();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Database connection failed:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   Error message:', 'Connection failed');
      // Should not log stack trace
    });

    it('should handle error with stack trace', async () => {
      const dbModule = await import('../config/database.js');
      
      const error = new Error('Connection failed');
      error.stack = 'Error: Connection failed\n    at testConnection';
      error.code = 'UNKNOWN';
      error.name = 'Error';
      
      mockPool.connect.mockRejectedValueOnce(error);
      
      await dbModule.testConnection();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('   Stack trace:', error.stack);
    });

    it('should handle error with message containing "database" and "does not exist"', async () => {
      const dbModule = await import('../config/database.js');
      
      const error = new Error('database mydb does not exist');
      error.code = 'OTHER';
      
      mockPool.connect.mockRejectedValueOnce(error);
      
      await dbModule.testConnection();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💡 Solution: Database does not exist. Create it or check DB_NAME in .env file'
      );
    });

    it('should handle password authentication error via message', async () => {
      const dbModule = await import('../config/database.js');
      
      const error = new Error('password authentication failed for user');
      error.code = 'OTHER';
      
      mockPool.connect.mockRejectedValueOnce(error);
      
      await dbModule.testConnection();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '💡 Solution: Invalid database credentials. Check DB_USER and DB_PASSWORD in .env file'
      );
    });
  });

  describe('Pool error handler', () => {
    it('should handle pool error with stack', async () => {
      await import('../config/database.js');
      
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();
      
      const error = new Error('Pool error');
      error.stack = 'Error stack trace';
      
      errorHandler(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [Database Pool] Unexpected error on idle client:',
        'Pool error'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [Database Pool] Error stack:',
        'Error stack trace'
      );
    });

    it('should handle pool error without stack', async () => {
      await import('../config/database.js');
      
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error')?.[1];
      
      const error = new Error('Pool error');
      delete error.stack;
      
      errorHandler(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ [Database Pool] Unexpected error on idle client:',
        'Pool error'
      );
      // Should not log stack if it doesn't exist
    });
  });

  describe('Pool status logging', () => {
    it('should log pool status in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      await import('../config/database.js');
      
      // Advance timers to trigger interval
      jest.advanceTimersByTime(30000);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📊 [Database Pool] Status')
      );
    });

    it('should not log pool status in non-development mode', async () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      await import('../config/database.js');
      
      // Advance timers
      jest.advanceTimersByTime(30000);
      
      // Should not log pool status
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('📊 [Database Pool] Status')
      );
    });

    it('should log pool status multiple times', async () => {
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      await import('../config/database.js');
      
      // Advance timers multiple times
      jest.advanceTimersByTime(30000);
      jest.advanceTimersByTime(30000);
      jest.advanceTimersByTime(30000);
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Default export', () => {
    it('should export pool as default', async () => {
      const dbModule = await import('../config/database.js');
      
      expect(dbModule.default).toBe(mockPool);
    });
  });
});


