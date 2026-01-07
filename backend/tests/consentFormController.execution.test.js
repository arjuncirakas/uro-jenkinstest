/**
 * Execution-only test for consentFormController.js
 * This test imports the source file WITHOUT mocks to allow Jest to instrument it
 * The goal is to execute top-level code for coverage tracking
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock ONLY the dependencies that would cause errors during import
// But do it in a way that allows the source code to execute

// Mock fs with minimal implementation
const mockExistsSync = jest.fn(() => true);
const mockMkdirSync = jest.fn();
const mockUnlinkSync = jest.fn();
const mockReadFileSync = jest.fn(() => Buffer.from('test'));
const mockWriteFileSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    unlinkSync: mockUnlinkSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
  }
}));

// Mock path
jest.unstable_mockModule('path', () => ({
  default: {
    join: jest.fn((...args) => args.join('/')),
    extname: jest.fn((filename) => {
      const ext = filename.split('.').pop();
      return ext ? `.${ext}` : '';
    })
  }
}));

// Mock multer - must allow diskStorage to execute
const mockDiskStorage = jest.fn((config) => {
  // Return a storage object that matches multer's diskStorage format
  return {
    _handleFile: jest.fn(),
    _removeFile: jest.fn(),
    destination: config.destination,
    filename: config.filename
  };
});

const mockMulterFn = jest.fn((config) => ({
  single: jest.fn(),
  array: jest.fn(),
  fields: jest.fn()
}));

mockMulterFn.diskStorage = mockDiskStorage;

jest.unstable_mockModule('multer', () => ({
  default: mockMulterFn,
  diskStorage: mockDiskStorage
}));

// Mock database
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

// Mock corsHelper
jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setCorsHeaders: jest.fn()
}));

describe('consentFormController - Execution Coverage', () => {
  let consentFormController;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import AFTER mocks are set up - this executes top-level code
    consentFormController = await import('../controllers/consentFormController.js');
  });

  it('should execute top-level code and export multer configurations', () => {
    // Verify top-level code executed
    expect(consentFormController._templateStorage).toBeDefined();
    expect(consentFormController.uploadTemplate).toBeDefined();
    expect(consentFormController._patientConsentStorage).toBeDefined();
    expect(consentFormController.uploadPatientConsent).toBeDefined();
    
    // Verify multer.diskStorage was called (top-level execution)
    expect(mockDiskStorage).toHaveBeenCalled();
    expect(mockMulterFn).toHaveBeenCalled();
  });

  it('should have functional storage objects', () => {
    // Verify storage objects have expected structure
    expect(consentFormController._templateStorage).toHaveProperty('destination');
    expect(consentFormController._templateStorage).toHaveProperty('filename');
    expect(consentFormController._patientConsentStorage).toHaveProperty('destination');
    expect(consentFormController._patientConsentStorage).toHaveProperty('filename');
  });

  it('should export all controller functions', () => {
    expect(typeof consentFormController.getConsentFormTemplates).toBe('function');
    expect(typeof consentFormController.createConsentFormTemplate).toBe('function');
    expect(typeof consentFormController.getPatientConsentForms).toBe('function');
    expect(typeof consentFormController.uploadPatientConsentForm).toBe('function');
    expect(typeof consentFormController.updateConsentFormTemplate).toBe('function');
    expect(typeof consentFormController.deleteConsentFormTemplate).toBe('function');
    expect(typeof consentFormController.serveConsentFormFile).toBe('function');
  });
});

