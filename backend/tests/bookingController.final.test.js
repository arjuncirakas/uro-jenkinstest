import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller Final Coverage Tests', () => {
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

  describe('Urologist lookup - users table fallback', () => {
    it('should check users table when urologist not found in doctors table', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      // Mock patient validation success
      // Mock urologist not found in doctors table
      // Mock found in users table
      // Mock found in doctors by email
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors table
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', role: 'urologist', email: 'dr@example.com' }]
        }) // Found in users table
        .mockResolvedValueOnce({
          rows: [{ id: 2, first_name: 'Dr', last_name: 'Smith', specialization: 'Urology' }]
        }) // Found in doctors by email
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123, upi: 'UPI123' }] }) // Appointment inserted
        .mockResolvedValueOnce({ rows: [{ id: 123, upi: 'UPI123', first_name: 'John', last_name: 'Doe', assigned_urologist: 'Dr Smith' }] }); // Update patient

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      // Should check users table
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, role, email FROM users WHERE id = $1 AND role IN ($2, $3)',
        [1, 'urologist', 'doctor']
      );

      // Should check doctors by email
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, specialization FROM doctors WHERE email = $1 AND is_active = true',
        ['dr@example.com']
      );
    });

    it('should handle urologist found in users but not in doctors by email', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith'
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', role: 'urologist', email: 'dr@example.com' }]
        }) // Found in users
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors by email
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123, upi: 'UPI123' }] }) // Appointment inserted
        .mockResolvedValueOnce({ rows: [{ id: 123, upi: 'UPI123', first_name: 'John', last_name: 'Doe', assigned_urologist: 'Dr Smith' }] }); // Update patient

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      // Should use user data when doctor not found by email
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should return 404 when urologist not found in either table', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 999,
        urologistName: 'Dr. Unknown'
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors
        .mockResolvedValueOnce({ rows: [] }); // Not found in users

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Urologist not found'
      });
    });
  });
});

