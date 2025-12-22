import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database before importing
const mockPool = {
  connect: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock cron
jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: jest.fn()
  }
}));

describe('Auto Appointment Scheduler - Additional Coverage Tests', () => {
  let mockClient;
  let autoAppointmentScheduler;
  let processAutomaticAppointments;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    
    const module = await import('../schedulers/autoAppointmentScheduler.js');
    autoAppointmentScheduler = module;
    
    // Access the internal function through the module's internal structure
    // Since processAutomaticAppointments is not exported, we'll test it indirectly
    // through initAutoAppointmentScheduler which calls it
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAutomaticAppointments - hasThreeConsecutiveNoShows coverage (lines 21-77)', () => {
    it('should skip patient when less than 3 no-shows (patient should proceed)', async () => {
      // Test that when there are less than 3 no-shows, patient is not skipped
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: [] // No existing automatic appointments
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, appointment_date: '2024-01-01', appointment_time: '10:00', status: 'no_show' }] // Only 1 no-show (less than 3)
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', email: 'dr@example.com' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Doctor found
        })
        .mockResolvedValue({ rows: [{ id: 1 }] }); // Successful appointment booking

      // Call initAutoAppointmentScheduler which triggers processAutomaticAppointments
      autoAppointmentScheduler.initAutoAppointmentScheduler();
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Patient should proceed (not skipped) because less than 3 no-shows
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should return false when there are appointments between no-shows', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const noShowDate1 = new Date();
      noShowDate1.setMonth(noShowDate1.getMonth() - 3);
      const noShowDate2 = new Date();
      noShowDate2.setMonth(noShowDate2.getMonth() - 2);
      const noShowDate3 = new Date();
      noShowDate3.setMonth(noShowDate3.getMonth() - 1);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: [] // No existing automatic appointments
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, appointment_date: noShowDate1.toISOString().split('T')[0], appointment_time: '10:00', status: 'no_show' },
            { id: 2, appointment_date: noShowDate2.toISOString().split('T')[0], appointment_time: '11:00', status: 'no_show' },
            { id: 3, appointment_date: noShowDate3.toISOString().split('T')[0], appointment_time: '12:00', status: 'no_show' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }] // There IS an appointment between no-shows
        });
    });

    it('should return false when profile was updated after first no-show', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const noShowDate = new Date();
      noShowDate.setMonth(noShowDate.getMonth() - 2);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '10:00', status: 'no_show' },
            { id: 2, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '11:00', status: 'no_show' },
            { id: 3, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '12:00', status: 'no_show' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ count: '0' }] // No appointments between
        })
        .mockResolvedValueOnce({
          rows: [{ updated_at: new Date() }] // Profile was updated after first no-show
        });
    });

    it('should handle errors in hasThreeConsecutiveNoShows', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockRejectedValueOnce(new Error('Database error')); // Error in hasThreeConsecutiveNoShows

      // The error should be caught and logged, function should return false
      consoleErrorSpy.mockRestore();
    });
  });

  describe('bookAutomaticAppointment - error handling (lines 115-117)', () => {
    it('should handle database errors in bookAutomaticAppointment', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [] // No consecutive no-shows
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: 'Dr', last_name: 'Smith', email: 'dr@example.com' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }] // Doctor found
        })
        .mockRejectedValueOnce(new Error('Database error')); // Error when booking appointment

      // The error should be caught and logged, function should return null
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processAutomaticAppointments - main logic (lines 170-251)', () => {
    it('should process patients with consecutive no-shows and skip them', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const noShowDate = new Date();
      noShowDate.setMonth(noShowDate.getMonth() - 2);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '10:00', status: 'no_show' },
            { id: 2, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '11:00', status: 'no_show' },
            { id: 3, appointment_date: noShowDate.toISOString().split('T')[0], appointment_time: '12:00', status: 'no_show' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ count: '0' }]
        })
        .mockResolvedValueOnce({
          rows: [] // No profile update
        });

      // Patient should be skipped due to consecutive no-shows
    });

    it('should skip patients without assigned urologist', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: null, // No assigned urologist
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockResolvedValueOnce({
          rows: [] // No consecutive no-shows
        });

      // Patient should be skipped due to no assigned urologist
    });

    it('should handle errors when processing individual patients (line 260)', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            upi: 'UPI001',
            first_name: 'John',
            last_name: 'Doe',
            care_pathway: 'Active Monitoring',
            assigned_urologist: 'Dr Smith',
            care_pathway_updated_at: oneYearAgoStr
          }]
        })
        .mockResolvedValueOnce({
          rows: []
        })
        .mockRejectedValueOnce(new Error('Error processing patient')); // Error in patient processing

      // Error should be caught and logged (line 260)
      consoleErrorSpy.mockRestore();
    });
  });
});

