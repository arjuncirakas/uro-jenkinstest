import { jest, describe, it, expect } from '@jest/globals';
import { validatePatientForBooking } from '../controllers/bookingController.js';

describe('Booking Controller Helper Functions', () => {
  describe('validatePatientForBooking', () => {
    it('should return isValid: false when patient not found', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };

      const result = await validatePatientForBooking(client, 123);

      expect(result).toEqual({
        isValid: false,
        error: {
          status: 404,
          message: 'Patient not found'
        }
      });
      expect(client.query).toHaveBeenCalledWith(
        'SELECT id, first_name, last_name, status FROM patients WHERE id = $1',
        [123]
      );
    });

    it('should return isValid: false when patient is expired (appointment context)', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Expired'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123, 'appointment');

      expect(result).toEqual({
        isValid: false,
        error: {
          status: 400,
          message: 'Cannot book appointment for an expired patient'
        }
      });
    });

    it('should return isValid: false when patient is expired (investigation context)', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Expired'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123, 'investigation');

      expect(result).toEqual({
        isValid: false,
        error: {
          status: 400,
          message: 'Cannot book investigation for an expired patient'
        }
      });
    });

    it('should return isValid: true when patient exists and is active', async () => {
      const patientData = {
        id: 123,
        first_name: 'John',
        last_name: 'Doe',
        status: 'Active'
      };
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [patientData]
        })
      };

      const result = await validatePatientForBooking(client, 123);

      expect(result).toEqual({
        isValid: true,
        patient: patientData
      });
    });

    it('should use default errorContext when not provided', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Expired'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123);

      // Default 'booking' context falls through to investigation message
      expect(result.isValid).toBe(false);
      expect(result.error.status).toBe(400);
      expect(result.error.message).toBe('Cannot book investigation for an expired patient');
    });

    it('should handle empty string email', async () => {
      const client = {
        query: jest.fn()
      };

      const { checkExistingEmail } = await import('../controllers/patientController.js');
      const result = await checkExistingEmail(client, '');

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should handle empty string phone', async () => {
      const client = {
        query: jest.fn()
      };

      const { checkExistingPhone } = await import('../controllers/patientController.js');
      const result = await checkExistingPhone(client, '');

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('should handle Active status patient', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Active'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123);
      expect(result.isValid).toBe(true);
      expect(result.patient.status).toBe('Active');
    });

    it('should handle Inactive status patient', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Inactive'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123);
      expect(result.isValid).toBe(true);
      expect(result.patient.status).toBe('Inactive');
    });

    it('should handle Discharged status patient', async () => {
      const client = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: 123,
            first_name: 'John',
            last_name: 'Doe',
            status: 'Discharged'
          }]
        })
      };

      const result = await validatePatientForBooking(client, 123);
      expect(result.isValid).toBe(true);
      expect(result.patient.status).toBe('Discharged');
    });
  });
});

