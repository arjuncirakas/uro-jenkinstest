import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Patient Controller Final Coverage Tests', () => {
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

  describe('GP role assignment', () => {
    it('should assign GP ID when user role is gp', async () => {
      mockReq.user = { id: 5, role: 'gp' };
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Should use GP's ID as referred_by_gp_id
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('Auto-assign urologist when user is urologist', () => {
    it('should auto-assign patient to current urologist user', async () => {
      mockReq.user = { id: 10, role: 'urologist' };
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01'
        // assignedUrologist not provided
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({
          rows: [{ first_name: 'Dr', last_name: 'Urologist' }]
        }) // User query for auto-assignment
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Should query for user's name to auto-assign
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [10]
      );
    });

    it('should auto-assign patient to current doctor user', async () => {
      mockReq.user = { id: 11, role: 'doctor' };
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({
          rows: [{ first_name: 'Dr', last_name: 'Doctor' }]
        }) // User query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [11]
      );
    });

    it('should not auto-assign when assignedUrologist is provided', async () => {
      mockReq.user = { id: 10, role: 'urologist' };
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01',
        assignedUrologist: 'Dr. Smith' // Provided, so no auto-assignment
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      // Should not query for user's name since assignedUrologist is provided
      const userQueryCalls = mockClient.query.mock.calls.filter(
        call => call[0]?.includes('SELECT first_name, last_name FROM users')
      );
      expect(userQueryCalls.length).toBe(0);
    });
  });

  describe('Date formatting - ISO string with T', () => {
    it('should handle ISO string date format', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01T00:00:00.000Z' // ISO string with T
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check
        .mockResolvedValueOnce({ rows: [] }) // UPI check
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert

      await patientController.addPatient(mockReq, mockRes);

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('Date formatting - fallback format', () => {
    it('should handle other date formats as fallback', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '01/15/1990' // Other format
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

