import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller Methods - Coverage Tests', () => {
  let mockClient;
  let mockRes;
  let mockReq;
  let bookingController;

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
    bookingController = await import('../controllers/bookingController.js');
  });

  describe('bookUrologistAppointment validation paths', () => {
    it('should handle patient validation failure - not found', async () => {
      mockReq.params = { patientId: 999 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      // Mock patient validation - patient not found
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient not found'
      });
    });

    it('should handle patient validation failure - expired', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      // Mock patient validation - expired patient
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 123,
          first_name: 'John',
          last_name: 'Doe',
          status: 'Expired'
        }]
      });

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot book appointment for an expired patient'
      });
    });
  });

  describe('bookInvestigation validation paths', () => {
    it('should handle patient validation failure - not found', async () => {
      mockReq.params = { patientId: 999 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01'
      };

      // Mock patient validation - patient not found
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await bookingController.bookInvestigation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Patient not found'
      });
    });

    it('should handle patient validation failure - expired', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01'
      };

      // Mock patient validation - expired patient
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 123,
          first_name: 'John',
          last_name: 'Doe',
          status: 'Expired'
        }]
      });

      await bookingController.bookInvestigation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot book investigation for an expired patient'
      });
    });
  });
});

