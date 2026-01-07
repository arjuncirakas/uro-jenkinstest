import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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

describe('dbHelper', () => {
  let dbHelper;

  beforeEach(async () => {
    jest.clearAllMocks();
    dbHelper = await import('../utils/dbHelper.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export withDatabaseClient function', () => {
      expect(dbHelper.withDatabaseClient).toBeDefined();
      expect(typeof dbHelper.withDatabaseClient).toBe('function');
    });
  });

  describe('withDatabaseClient', () => {
    it('should execute operation with database client', async () => {
      const mockOperation = jest.fn(async (client) => {
        expect(client).toBe(mockClient);
        return { success: true };
      });

      const result = await dbHelper.withDatabaseClient(mockOperation);

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockOperation).toHaveBeenCalledWith(mockClient);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('should release client even if operation throws error', async () => {
      const mockOperation = jest.fn(async () => {
        throw new Error('Operation failed');
      });

      await expect(dbHelper.withDatabaseClient(mockOperation)).rejects.toThrow('Operation failed');

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValueOnce(connectionError);

      const mockOperation = jest.fn();

      await expect(dbHelper.withDatabaseClient(mockOperation)).rejects.toThrow('Connection failed');

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockOperation).not.toHaveBeenCalled();
      expect(mockClient.release).not.toHaveBeenCalled();
    });

    it('should handle operation that returns null', async () => {
      const mockOperation = jest.fn(async () => null);

      const result = await dbHelper.withDatabaseClient(mockOperation);

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('should handle operation that returns undefined', async () => {
      const mockOperation = jest.fn(async () => undefined);

      const result = await dbHelper.withDatabaseClient(mockOperation);

      expect(result).toBeUndefined();
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
