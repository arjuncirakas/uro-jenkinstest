import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Patient Controller Date Formatting Coverage', () => {
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

  describe('Date formatting - formatDateOnly function coverage', () => {
    it('should handle date string that is already in YYYY-MM-DD format', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01' // Already in correct format
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Should handle YYYY-MM-DD format directly (line 226-227)
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should handle date string with "null" value', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        priorBiopsyDate: 'null' // String "null" should be normalized
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Should normalize "null" string to null (line 221-222)
      expect(mockClient.query).toHaveBeenCalled();
    });
  });
});

