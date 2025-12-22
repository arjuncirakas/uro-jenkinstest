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

describe('Auto Appointment Scheduler', () => {
  let mockClient;
  let autoAppointmentScheduler;
  let cron;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    
    autoAppointmentScheduler = await import('../schedulers/autoAppointmentScheduler.js');
    cron = await import('node-cron');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initAutoAppointmentScheduler', () => {
    it('should initialize scheduler and run initial check', async () => {
      // Mock eligible patients query
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      autoAppointmentScheduler.initAutoAppointmentScheduler();

      // Should schedule cron job
      expect(cron.default.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function)
      );

      // Should run initial check
      expect(mockPool.connect).toHaveBeenCalled();
    });
  });
});

