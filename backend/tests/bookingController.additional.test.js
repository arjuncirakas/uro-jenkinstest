import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller Additional Coverage Tests', () => {
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

  describe('bookUrologistAppointment validation', () => {
    it('should validate required fields for appointment', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        // Missing required fields
        appointmentDate: '',
        appointmentTime: '10:00'
      };

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Appointment date, time, urologist ID, and urologist name are required'
      });
    });

    it('should validate surgery type is required for surgery appointments', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith',
        appointmentType: 'surgery'
        // Missing surgeryType
      };

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Surgery type is required for surgery appointments'
      });
    });

    it('should check urologist exists in doctors table', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      // Mock patient validation success
      // Mock urologist found in doctors table
      // Mock appointment insertion
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
          rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', specialization: 'Urology' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        }); // Appointment inserted

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      // Should check doctors table
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, specialization FROM doctors WHERE id = $1 AND is_active = true',
        [1]
      );
    });
  });

  describe('bookInvestigation validation', () => {
    it('should validate required fields for investigation', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        // Missing required fields
        investigationType: '',
        investigationName: 'PSA Test'
      };

      await bookingController.bookInvestigation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Investigation type, name, and scheduled date are required'
      });
    });

    it('should check for conflicting investigation bookings when time is provided', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      // Mock patient validation success
      // Mock no conflicts
      // Mock investigation booking insertion
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // No conflicts
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Investigation booking inserted

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should check for conflicts when scheduledTime is provided
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ib.id, ib.investigation_name'),
        expect.any(Array)
      );
    });
  });
});

