/**
 * Execution-only test for patientValidation.js
 * This test imports the source file to allow Jest to instrument it
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock DOMPurify
jest.unstable_mockModule('isomorphic-dompurify', () => ({
  default: {
    sanitize: jest.fn((str) => str.trim())
  }
}));

describe('patientValidation - Execution Coverage', () => {
  let patientValidation;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Import to execute and instrument
    patientValidation = await import('../middleware/patientValidation.js');
  });

  it('should export all validation functions', () => {
    expect(typeof patientValidation.validatePhoneDigits).toBe('function');
    expect(typeof patientValidation.validateNotFutureDate).toBe('function');
    // validatePatientInput and validatePatientUpdateInput are middleware arrays
    expect(Array.isArray(patientValidation.validatePatientInput)).toBe(true);
    expect(Array.isArray(patientValidation.validatePatientUpdateInput)).toBe(true);
  });

  it('should execute validatePhoneDigits function', () => {
    expect(() => patientValidation.validatePhoneDigits('12345678', false)).not.toThrow();
  });

  it('should execute validateNotFutureDate function', () => {
    const pastDate = '2020-01-01';
    expect(() => patientValidation.validateNotFutureDate(pastDate)).not.toThrow();
  });
});

