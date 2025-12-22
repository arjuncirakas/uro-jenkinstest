import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as patientController from '../controllers/patientController.js';

const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Patient Controller - Uncovered Branches and Error Paths', () => {
  let mockClient;
  let mockRes;
  let mockReq;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockReq = {
      body: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phone: '1234567890',
        initialPSA: 5.0,
        gender: 'Male'
      },
      params: {},
      user: { id: 1, role: 'nurse' }
    };

    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('handleUniqueConstraintError - uncovered branches', () => {
    it('should return null when error code is not 23505', () => {
      const error = new Error('Some other error');
      error.code = '23503'; // Different error code
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const result = patientController.handleUniqueConstraintError(error, res);
      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return null when constraint is not in constraintMessages map', () => {
      const error = new Error('Unique constraint violation');
      error.code = '23505';
      error.constraint = 'unknown_constraint';
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const result = patientController.handleUniqueConstraintError(error, res);
      expect(result).toBeNull();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use checkExistingPhone with empty string (should not query)', async () => {
      mockReq.body.phone = ''; // Empty string

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1, upi: 'UPI123' }] }); // Insert patient

      await patientController.addPatient(mockReq, mockRes);

      // checkExistingPhone should return null for empty string, so no query should be made
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'SELECT id FROM patients WHERE phone = $1',
        ['']
      );
    });
  });

  describe('Integration tests for helper functions in addPatient', () => {
    it('should use parseJsonField with null triageSymptoms', async () => {
      mockReq.body.triageSymptoms = null;

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1, upi: 'UPI123' }] }); // Insert patient

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      // parseJsonField should return defaultValue (null) for null input
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO patients'),
        expect.arrayContaining([null]) // triageSymptoms should be null
      );
    });

    it('should use parseJsonField with invalid JSON in comorbidities', async () => {
      mockReq.body.comorbidities = 'invalid json string';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1, upi: 'UPI123' }] }); // Insert patient

      await patientController.addPatient(mockReq, mockRes);

      // parseJsonField should catch the error and return defaultValue
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing JSON field:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(201);

      consoleErrorSpy.mockRestore();
    });

    it('should handle UPI constraint error in addPatient catch block', async () => {
      // Simulate a unique constraint error for UPI
      const error = new Error('Duplicate key value violates unique constraint "patients_upi_key"');
      error.code = '23505';
      error.constraint = 'patients_upi_key';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check (first attempt)
        .mockRejectedValueOnce(error); // Simulate INSERT query failing with UPI constraint

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this UPI already exists'
      });
    });

    it('should handle non-unique-constraint database errors in addPatient', async () => {
      const error = new Error('Database connection lost');
      error.code = '08003'; // Connection exception

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // email check
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockRejectedValueOnce(error); // Simulate INSERT query failing

      await patientController.addPatient(mockReq, mockRes);

      // Should not be handled by handleUniqueConstraintError
      expect(consoleErrorSpy).toHaveBeenCalledWith('Add patient error:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
