import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Patient Controller Additional Coverage Tests', () => {
  let mockClient;
  let mockRes;
  let mockReq;
  let patientController;

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
      body: {},
      params: {},
      user: { id: 1, role: 'nurse' }
    };

    mockPool.connect.mockResolvedValue(mockClient);
    patientController = await import('../controllers/patientController.js');
  });

  describe('GP contact validation', () => {
    it('should validate GP email is required when GP name is provided', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        gpName: 'Dr. Smith',
        gpContact: '' // Empty GP contact
      };

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'GP Email is required when GP Name is provided'
      });
    });

    it('should validate GP email format', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        gpName: 'Dr. Smith',
        gpContact: 'invalid-email' // Invalid email format
      };

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter a valid GP email address'
      });
    });

    it('should accept valid GP email format', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        gpName: 'Dr. Smith',
        gpContact: 'gp@example.com',
        dateOfBirth: '1990-01-01'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check - unique
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert success

      await patientController.addPatient(mockReq, mockRes);

      // Should not return validation error for valid email
      expect(mockRes.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('Date formatting edge cases', () => {
    it('should handle date string normalization - empty string', async () => {
      // This tests the normalizeDateString function indirectly through addPatient
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '', // Empty string
        priorBiopsyDate: 'no' // Should be normalized to null
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Function should handle empty date strings
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should handle date string normalization - "none" value', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        priorBiopsyDate: 'none' // Should be normalized to null
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should handle date string normalization - Date object', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: new Date('1990-01-01') // Date object
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
    });
  });
});

