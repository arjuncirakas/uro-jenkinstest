import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing controllers
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Booking Controller - Consent Forms Coverage (100%)', () => {
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

  describe('bookInvestigation - consent form attachment (lines 298-348)', () => {
    it('should attach auto-generated consent form for MRI', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'MRI',
        investigationName: 'MRI Scan',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
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
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            test_name: 'MRI',
            procedure_name: null,
            is_auto_generated: true,
            template_file_path: null
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should have queried for consent form template (line 290-296)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('consent_forms'),
        ['MRI']
      );
      // Should have checked for existing consent (line 302-306)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('patient_consent_forms'),
        expect.arrayContaining([123])
      );
      // Should have inserted auto-generated consent (line 315-326)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO patient_consent_forms'),
        expect.any(Array)
      );
    });

    it('should attach template consent form for TRUS', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'TRUS',
        investigationName: 'TRUS Biopsy',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
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
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            test_name: null,
            procedure_name: 'TRUS',
            is_auto_generated: false,
            template_file_path: '/path/to/template.pdf'
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should have inserted template consent form (line 328-341)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO patient_consent_forms'),
        expect.arrayContaining([123, 1, '/path/to/template.pdf'])
      );
    });

    it('should skip if patient already has consent form (line 344-346)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'Biopsy',
        investigationName: 'Biopsy',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
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
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            test_name: 'Biopsy',
            procedure_name: null,
            is_auto_generated: true,
            template_file_path: null
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Patient already has this consent form
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should not insert duplicate consent form
      const insertCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && call[0].includes('INSERT INTO patient_consent_forms')
      );
      expect(insertCalls.length).toBe(0); // No insert for existing consent
    });

    it('should log when no consent form template found (line 347-349)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'MRI',
        investigationName: 'MRI Scan',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

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
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [] // No template found
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should log that no template was found (line 348)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No consent form template found')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle consent form attachment errors gracefully (line 351-353)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'MRI',
        investigationName: 'MRI Scan',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockRejectedValueOnce(new Error('Database error')); // Error in consent form query

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should log error but not fail the booking (line 352)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to attach consent forms'),
        expect.any(String)
      );
      // Should still return success
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('bookInvestigation - patient assignment (lines 360-386)', () => {
    it('should assign patient to investigation doctor when not already assigned (lines 370-377)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'Dr. Smith',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
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
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ assigned_urologist: null }] // Not assigned yet
        })
        .mockResolvedValueOnce({
          rows: [{ id: 123 }]
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should update patient assignment (line 373-376)
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE patients SET assigned_urologist = $1 WHERE id = $2',
        ['Dr. Smith', 123]
      );
    });

    it('should skip assignment if patient already has assigned urologist (lines 378-380)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'Dr. Smith',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

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
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [{ assigned_urologist: 'Dr. Jones' }] // Already assigned
        });

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should log that patient is already assigned (line 379)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Patient already assigned')
      );
      // Should not update assignment
      const updateCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && call[0].includes('UPDATE patients SET assigned_urologist')
      );
      expect(updateCalls.length).toBe(0);

      consoleLogSpy.mockRestore();
    });

    it('should handle assignment errors gracefully (line 383-386)', async () => {
      mockReq.params = { patientId: 123 };
      mockReq.body = {
        investigationType: 'PSA',
        investigationName: 'Dr. Smith',
        scheduledDate: '2024-01-01',
        scheduledTime: '10:00'
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockRejectedValueOnce(new Error('Database error')); // Error in assignment query

      await bookingController.bookInvestigation(mockReq, mockRes);

      // Should log error but not fail the booking (line 384)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to assign patient'),
        expect.any(String)
      );
      // Should still return success
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

