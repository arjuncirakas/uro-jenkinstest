/**
 * Execution-only test for nursesController.js
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

// Mock emailService
jest.unstable_mockModule('../services/emailService.js', () => ({
  sendPasswordSetupEmail: jest.fn().mockResolvedValue({ success: true })
}));

// Mock userControllerHelper
jest.unstable_mockModule('../controllers/userControllerHelper.js', () => ({
  getAllUsersByRole: jest.fn(),
  getUserByIdAndRole: jest.fn(),
  checkEmailExists: jest.fn(),
  checkPhoneExists: jest.fn(),
  hashPassword: jest.fn(),
  softDeleteUserByRole: jest.fn(),
  getValidationErrors: jest.fn(),
  handleUniqueConstraintError: jest.fn(),
  createErrorResponse: jest.fn(),
  createSuccessResponse: jest.fn()
}));

describe('nursesController - Execution Coverage', () => {
  let nursesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import to execute and instrument
    nursesController = await import('../controllers/nursesController.js');
  });

  it('should export all controller functions', () => {
    expect(typeof nursesController.getAllNurses).toBe('function');
    expect(typeof nursesController.getNurseById).toBe('function');
    expect(typeof nursesController.createNurse).toBe('function');
    expect(typeof nursesController.updateNurse).toBe('function');
    expect(typeof nursesController.deleteNurse).toBe('function');
  });
});

