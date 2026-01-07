/**
 * Execution-only test for dbHelper.js
 * This test imports the source file to allow Jest to instrument it
 */
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

describe('dbHelper - Execution Coverage', () => {
  let dbHelper;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import to execute and instrument
    dbHelper = await import('../utils/dbHelper.js');
  });

  it('should export withDatabaseClient function', () => {
    expect(dbHelper.withDatabaseClient).toBeDefined();
    expect(typeof dbHelper.withDatabaseClient).toBe('function');
  });

  it('should execute withDatabaseClient successfully', async () => {
    const mockOperation = jest.fn(async (client) => {
      expect(client).toBe(mockClient);
      return { success: true };
    });

    const result = await dbHelper.withDatabaseClient(mockOperation);

    expect(mockPool.connect).toHaveBeenCalled();
    expect(mockOperation).toHaveBeenCalledWith(mockClient);
    expect(mockClient.release).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});

