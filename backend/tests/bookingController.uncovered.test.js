import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import * as bookingController from '../controllers/bookingController.js';

const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller - Uncovered Branches and Error Paths', () => {
  let mockClient;
  let mockRes;
  let mockReq;

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
  });

  describe('validatePatientForBooking - default errorContext', () => {
    it('should use default errorContext "booking" when not provided', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 123, first_name: 'John', last_name: 'Doe', status: 'Expired' }]
      });

      const result = await bookingController.validatePatientForBooking(mockClient, 123);
      // When errorContext is not provided, it defaults to 'booking'
      // The code checks if errorContext === 'appointment', so 'booking' will use the else branch
      expect(result.isValid).toBe(false);
      expect(result.error.message).toBe('Cannot book investigation for an expired patient');
    });

    it('should return valid patient when status is not Expired', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 123, first_name: 'John', last_name: 'Doe', status: 'Active' }]
      });

      const result = await bookingController.validatePatientForBooking(mockClient, 123);
      expect(result.isValid).toBe(true);
      expect(result.patient).toEqual({ id: 123, first_name: 'John', last_name: 'Doe', status: 'Active' });
    });
  });

  describe('bookUrologistAppointment - conflict check', () => {
    it('should return 409 when urologist has conflicting appointment', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith',
        appointmentType: 'consultation'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', specialization: 'Urology' }] }) // Urologist found
        .mockResolvedValueOnce({ rows: [{ id: 999 }] }); // Conflict found

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Urologist already has an appointment at this time'
      });
    });

    it('should handle urologist found in users but not in doctors by email', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        appointmentDate: '2024-01-01',
        appointmentTime: '10:00',
        urologistId: 1,
        urologistName: 'Dr. Smith',
        appointmentType: 'consultation'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', role: 'urologist', email: 'dr@example.com' }] }) // Found in users
        .mockResolvedValueOnce({ rows: [] }) // Not found in doctors by email (line 112-114)
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123, upi: 'UPI123' }] }) // Appointment inserted
        .mockResolvedValueOnce({ rows: [{ id: 123, upi: 'UPI123', first_name: 'John', last_name: 'Doe', assigned_urologist: 'Dr Smith' }] }); // Update patient

      await bookingController.bookUrologistAppointment(mockReq, mockRes);

      // Should use userCheck data when doctor not found by email
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, specialization FROM doctors WHERE email = $1 AND is_active = true',
        ['dr@example.com']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('bookInvestigation - error handling', () => {
    it('should handle database errors in catch block', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA Test',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockRejectedValueOnce(new Error('Database connection error')); // Simulate DB error

      await bookingController.bookInvestigation(mockReq, mockRes);

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

    it('should handle investigation booking without scheduledTime (no conflict check)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA Test',
        investigationName: 'PSA Test',
        scheduledDate: '2024-01-01'
        // No scheduledTime - should skip conflict check
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Consent form lookup (no template found)
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }); // Investigation booking inserted

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should not call conflict check query when scheduledTime is not provided
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('SELECT ib.id, ib.investigation_name'),
        expect.arrayContaining(['2024-01-01', expect.anything()])
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle consent form attachment for MRI investigation', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'MRI',
        investigationName: 'Prostate MRI',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }) // Investigation booking inserted
        .mockResolvedValueOnce({ rows: [{ id: 10, test_name: 'MRI', is_auto_generated: true, template_file_path: null }] }) // Template found
        .mockResolvedValueOnce({ rows: [] }) // No existing consent
        .mockResolvedValueOnce({ rows: [{ id: 20 }] }); // Consent form attached

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should attach consent form for MRI
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, test_name, procedure_name'),
        ['MRI']
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle consent form already exists scenario', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'TRUS',
        investigationName: 'TRUS Biopsy',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }) // Investigation booking inserted
        .mockResolvedValueOnce({ rows: [{ id: 10, test_name: 'TRUS', is_auto_generated: false, template_file_path: '/path/to/template.pdf' }] }) // Template found
        .mockResolvedValueOnce({ rows: [{ id: 30 }] }); // Existing consent found

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should not insert duplicate consent form
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM patient_consent_forms'),
        [123, 10]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle patient assignment when no assigned urologist', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA Test',
        investigationName: 'Dr. Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }) // Investigation booking inserted
        .mockResolvedValueOnce({ rows: [] }) // Consent form lookup (no template)
        .mockResolvedValueOnce({ rows: [{ assigned_urologist: null }] }); // Patient has no assigned urologist

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should assign patient to investigation doctor
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
        ['Dr. Test', 123]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should skip patient assignment when already assigned', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA Test',
        investigationName: 'Dr. Test',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }) // Investigation booking inserted
        .mockResolvedValueOnce({ rows: [] }) // Consent form lookup
        .mockResolvedValueOnce({ rows: [{ assigned_urologist: 'Dr. Existing' }] }); // Patient already assigned

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should not update assigned_urologist
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
        ['Dr. Test', 123]
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle consent form attachment error gracefully', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'Biopsy',
        investigationName: 'Prostate Biopsy',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 123, status: 'Active' }] }) // Patient validation
        .mockResolvedValueOnce({ rows: [] }) // Conflict check
        .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 123 }] }) // Investigation booking inserted
        .mockResolvedValueOnce({ rows: [{ id: 10, test_name: 'Biopsy' }] }) // Template found
        .mockRejectedValueOnce(new Error('Database error')); // Error attaching consent

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should log error but not fail the booking
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[bookInvestigation] Failed to attach consent forms (non-fatal):',
        expect.any(String)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);

      consoleErrorSpy.mockRestore();
    });
  });
});
