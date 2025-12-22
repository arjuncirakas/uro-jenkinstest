import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller Error Handling Coverage', () => {
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
    bookingController = await import('../controllers/bookingController.js');
  });

  describe('bookUrologistAppointment error handling - lines 199-200', () => {
    it('should handle database errors in catch block', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      // Mock patient validation success
      // Then throw an error during urologist check
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockRejectedValueOnce(new Error('Database connection error')); // Error during urologist check

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      // Should catch error and return 500 (lines 199-200)
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});

