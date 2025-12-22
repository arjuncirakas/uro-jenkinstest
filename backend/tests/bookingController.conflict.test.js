import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller Conflict Check Coverage', () => {
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

  describe('bookInvestigation conflict check', () => {
    it('should handle conflicting investigation bookings', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      // Mock patient validation success
      // Mock conflict found
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            investigation_name: 'PSA Test',
            first_name: 'Jane',
            last_name: 'Smith'
          }]
        }); // Conflict found

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should return 409 conflict error (lines 255-256)
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('already booked')
      });
    });
  });
});

