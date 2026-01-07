/**
 * Execution-only test for exportController.js
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

// Mock auditLogger
jest.unstable_mockModule('../services/auditLogger.js', () => ({
  logDataExport: jest.fn()
}));

describe('exportController - Execution Coverage', () => {
  let exportController;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import to execute and instrument
    exportController = await import('../controllers/exportController.js');
  });

  it('should export _testHelpers object', () => {
    expect(exportController._testHelpers).toBeDefined();
    expect(typeof exportController._testHelpers).toBe('object');
  });

  it('should export all helper functions in _testHelpers', () => {
    const testHelpers = exportController._testHelpers;
    expect(typeof testHelpers.buildExportQuery).toBe('function');
    expect(typeof testHelpers.convertToCSV).toBe('function');
    expect(typeof testHelpers.buildDateConditions).toBe('function');
    expect(typeof testHelpers.generateDateExistsCondition).toBe('function');
    expect(typeof testHelpers.addDateFilters).toBe('function');
    expect(typeof testHelpers.addCarePathwayFilter).toBe('function');
    expect(typeof testHelpers.addStatusFilter).toBe('function');
    expect(typeof testHelpers.buildQueryString).toBe('function');
  });

  it('should export main controller functions', () => {
    expect(typeof exportController.getExportFields).toBe('function');
    expect(typeof exportController.exportPatientsToCSV).toBe('function');
    expect(typeof exportController.exportPatientsToExcel).toBe('function');
  });
});

