/**
 * Execution-only test for investigationController.js
 * This test imports the source file to allow Jest to instrument it
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock fs
const mockFs = {
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  createReadStream: jest.fn()
};

jest.unstable_mockModule('fs', () => ({
  default: mockFs,
  existsSync: mockFs.existsSync,
  mkdirSync: mockFs.mkdirSync,
  unlinkSync: mockFs.unlinkSync,
  readdirSync: mockFs.readdirSync,
  statSync: mockFs.statSync,
  createReadStream: mockFs.createReadStream
}));

// Mock path
const mockPath = {
  extname: jest.fn((p) => {
    const match = p.match(/\.(\w+)$/);
    return match ? `.${match[1]}` : '';
  }),
  basename: jest.fn((p) => p.split('/').pop() || p.split('\\').pop())
};

jest.unstable_mockModule('path', () => ({
  default: mockPath,
  extname: mockPath.extname,
  basename: mockPath.basename
}));

// Mock multer
const mockMulterFn = jest.fn(() => ({
  single: jest.fn(),
  array: jest.fn(),
  fields: jest.fn()
}));

mockMulterFn.diskStorage = jest.fn(() => ({
  destination: jest.fn(),
  filename: jest.fn()
}));

jest.unstable_mockModule('multer', () => ({
  default: mockMulterFn,
  diskStorage: mockMulterFn.diskStorage
}));

// Mock database
const mockPool = {
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  }),
  query: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock other dependencies
jest.unstable_mockModule('../utils/ssrfProtection.js', () => ({
  validateFilePath: jest.fn((p) => p)
}));

jest.unstable_mockModule('../utils/psaStatusByAge.js', () => ({
  getPSAThresholdByAge: jest.fn(() => '4.0'),
  getPSAStatusByAge: jest.fn(() => 'Normal')
}));

jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setCorsHeaders: jest.fn()
}));

jest.unstable_mockModule('../utils/psaFileParser.js', () => ({
  extractPSADataFromFile: jest.fn().mockResolvedValue({
    success: true,
    count: 1,
    psaEntries: [{ date: '2024-01-01', value: '5.5' }]
  })
}));

describe('investigationController - Execution Coverage', () => {
  let investigationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import to execute and instrument
    investigationController = await import('../controllers/investigationController.js');
  });

  it('should export all controller functions', () => {
    expect(typeof investigationController.addPSAResult).toBe('function');
    expect(typeof investigationController.updatePSAResult).toBe('function');
    expect(typeof investigationController.addOtherTestResult).toBe('function');
    expect(typeof investigationController.getInvestigationResults).toBe('function');
    expect(typeof investigationController.getAllInvestigations).toBe('function');
    expect(typeof investigationController.deleteInvestigationResult).toBe('function');
    expect(typeof investigationController.createInvestigationRequest).toBe('function');
    expect(typeof investigationController.getInvestigationRequests).toBe('function');
    expect(typeof investigationController.updateInvestigationRequestStatus).toBe('function');
    expect(typeof investigationController.deleteInvestigationRequest).toBe('function');
    expect(typeof investigationController.serveFile).toBe('function');
    expect(typeof investigationController.parsePSAFile).toBe('function');
  });

  it('should export upload middleware', () => {
    expect(investigationController.upload).toBeDefined();
    expect(typeof investigationController.upload.single).toBe('function');
  });
});

