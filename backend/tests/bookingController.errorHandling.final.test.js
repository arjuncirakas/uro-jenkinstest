import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller - Final Error Handling Coverage (100%)', () => {
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

  describe('bookInvestigation - catch block error handling (lines 405-410)', () => {
    it('should handle database errors in bookInvestigation catch block', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock patient validation success, then throw error during investigation insert
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
          rows: []
        })
        .mockRejectedValueOnce(new Error('Database connection error')); // Error during investigation insert

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should catch error and return 500 (lines 406-410)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Book investigation error:',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });

      consoleErrorSpy.mockRestore();
    });
  });
});

