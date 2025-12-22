import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { validatePatientForBooking } from '../controllers/bookingController.js';

describe('Booking Controller Integration Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
  });

  describe('validatePatientForBooking integration scenarios', () => {
    it('should handle appointment booking validation flow', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 123,
          first_name: 'John',
          last_name: 'Doe',
          status: 'Active'
        }]
      });

      const result = await validatePatientForBooking(mockClient, 123, 'appointment');
      
      expect(result.isValid).toBe(true);
      expect(result.patient.status).toBe('Active');
    });

    it('should handle investigation booking validation flow', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 456,
          first_name: 'Jane',
          last_name: 'Smith',
          status: 'Active'
        }]
      });

      const result = await validatePatientForBooking(mockClient, 456, 'investigation');
      
      expect(result.isValid).toBe(true);
      expect(result.patient.status).toBe('Active');
    });

    it('should handle expired patient for appointment', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 789,
          first_name: 'Bob',
          last_name: 'Wilson',
          status: 'Expired'
        }]
      });

      const result = await validatePatientForBooking(mockClient, 789, 'appointment');
      
      expect(result.isValid).toBe(false);
      expect(result.error.message).toBe('Cannot book appointment for an expired patient');
    });

    it('should handle expired patient for investigation', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 101,
          first_name: 'Alice',
          last_name: 'Brown',
          status: 'Expired'
        }]
      });

      const result = await validatePatientForBooking(mockClient, 101, 'investigation');
      
      expect(result.isValid).toBe(false);
      expect(result.error.message).toBe('Cannot book investigation for an expired patient');
    });

    it('should handle patient not found scenario', async () => {
      mockClient.query.mockResolvedValue({
        rows: []
      });

      const result = await validatePatientForBooking(mockClient, 999, 'appointment');
      
      expect(result.isValid).toBe(false);
      expect(result.error.status).toBe(404);
      expect(result.error.message).toBe('Patient not found');
    });
  });
});

