import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Patient Controller Methods - Coverage Tests', () => {
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
    
    // Import controller after mocking
    patientController = await import('../controllers/patientController.js');
  });

  describe('addPatient validation paths', () => {
    it('should use sendErrorResponse for missing required fields', async () => {
      mockReq.body = {
        firstName: '',
        lastName: 'Doe'
      };

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'First name, last name, date of birth (or age), phone, and initial PSA are required'
      });
    });

    it('should use sendErrorResponse for invalid priority', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        priority: 'InvalidPriority'
      };

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Priority must be Low, Normal, High, or Urgent'
      });
    });

    it('should use sendErrorResponse when email exists', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        email: 'existing@example.com'
      };

      // Mock email check returning exists
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // email check
        .mockResolvedValueOnce({ rows: [] }); // phone check

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this email already exists'
      });
    });

    it('should use sendErrorResponse when phone exists', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0
      };

      // Mock phone check returning exists - checkExistingPhone is called first
      // Since no email is provided, checkExistingEmail returns null immediately
      // Then checkExistingPhone is called and returns exists: true
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // phone check - exists

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this phone number already exists'
      });
    });

    it('should use sendErrorResponse when UPI generation fails', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0
      };

      // Mock checks passing, but UPI generation failing after max attempts
      // The function tries up to 10 times to generate a unique UPI
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check - doesn't exist
        .mockResolvedValue({ rows: [{ id: 1 }] }); // All UPI checks return existing (simulating failure)

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unable to generate unique patient ID. Please try again.'
      });
    });
  });

  describe('getPatientById error paths', () => {
    it('should use sendErrorResponse when patient not found', async () => {
      mockReq.params = { id: 999 };

      mockClient.query.mockResolvedValue({ rows: [] });

      await patientController.getPatientById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient not found'
      });
    });
  });

  describe('handleUniqueConstraintError in catch blocks', () => {
    it('should handle email constraint error in addPatient catch block', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01'
      };

      // Simulate database error with email constraint during insert
      const dbError = {
        code: '23505',
        constraint: 'patients_email_key'
      };

      // Mock all queries up to the insert, then fail on insert
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check - doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // First UPI check - unique
        .mockRejectedValueOnce(dbError); // Insert fails with constraint error

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this email already exists'
      });
    });

    it('should handle phone constraint error in addPatient catch block', async () => {
      mockReq.body = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '1234567890',
        initialPSA: 5.0,
        dateOfBirth: '1990-01-01'
      };

      const dbError = {
        code: '23505',
        constraint: 'patients_phone_key'
      };

      // Mock all queries up to the insert, then fail on insert
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // phone check - doesn't exist
        .mockResolvedValueOnce({ rows: [] }) // First UPI check - unique
        .mockRejectedValueOnce(dbError); // Insert fails

      await patientController.addPatient(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient with this phone number already exists'
      });
    });
  });
});

