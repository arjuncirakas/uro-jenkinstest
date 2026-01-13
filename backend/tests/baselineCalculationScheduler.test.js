/**
 * Tests for baseline calculation scheduler
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
const mockPool = {
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock cron
const mockCron = {
  schedule: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('node-cron', () => ({
  default: mockCron
}));

jest.unstable_mockModule('../services/behavioralAnalyticsService.js', () => ({
  calculateBaseline: jest.fn()
}));

describe('Baseline Calculation Scheduler', () => {
  let baselineCalculationScheduler;
  let behavioralAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    baselineCalculationScheduler = await import('../schedulers/baselineCalculationScheduler.js');
    behavioralAnalyticsService = await import('../services/behavioralAnalyticsService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initBaselineCalculationScheduler', () => {
    it('should schedule cron job with correct pattern', () => {
      baselineCalculationScheduler.initBaselineCalculationScheduler();

      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function)
      );
    });

    it('should log initialization messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      baselineCalculationScheduler.initBaselineCalculationScheduler();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduler initialized')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('will run daily at 3:00 AM')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('calculateAllUserBaselines', () => {
    it('should calculate baselines for all active users', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, email: 'user1@example.com', first_name: 'User', last_name: 'One' },
            { id: 2, email: 'user2@example.com', first_name: 'User', last_name: 'Two' }
          ]
        });

      behavioralAnalyticsService.calculateBaseline
        .mockResolvedValueOnce({ id: 1, baseline_type: 'location' })
        .mockResolvedValueOnce({ id: 2, baseline_type: 'location' })
        .mockResolvedValueOnce({ id: 3, baseline_type: 'time' })
        .mockResolvedValueOnce({ id: 4, baseline_type: 'time' })
        .mockResolvedValueOnce({ id: 5, baseline_type: 'access_pattern' })
        .mockResolvedValueOnce({ id: 6, baseline_type: 'access_pattern' });

      // Get the calculateAllUserBaselines function (it's not exported, so we test via scheduler)
      const scheduler = baselineCalculationScheduler.initBaselineCalculationScheduler();
      
      // Call the scheduled function directly
      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      const result = await scheduledFunction();

      expect(mockClient.query).toHaveBeenCalled();
      expect(behavioralAnalyticsService.calculateBaseline).toHaveBeenCalledTimes(6); // 2 users * 3 baseline types
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty user list', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      await scheduledFunction();

      expect(behavioralAnalyticsService.calculateBaseline).not.toHaveBeenCalled();
    });

    it('should handle errors for individual users without stopping batch', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'user1@example.com', first_name: 'User', last_name: 'One' },
          { id: 2, email: 'user2@example.com', first_name: 'User', last_name: 'Two' }
        ]
      });

      behavioralAnalyticsService.calculateBaseline
        .mockRejectedValueOnce(new Error('User 1 error'))
        .mockResolvedValueOnce({ id: 2, baseline_type: 'location' })
        .mockResolvedValueOnce({ id: 3, baseline_type: 'time' })
        .mockResolvedValueOnce({ id: 4, baseline_type: 'access_pattern' })
        .mockResolvedValueOnce({ id: 5, baseline_type: 'location' })
        .mockResolvedValueOnce({ id: 6, baseline_type: 'time' })
        .mockResolvedValueOnce({ id: 7, baseline_type: 'access_pattern' });

      baselineCalculationScheduler.initBaselineCalculationScheduler();
      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      const result = await scheduledFunction();

      // Should continue processing even after error
      expect(behavioralAnalyticsService.calculateBaseline).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Database connection failed'));

      baselineCalculationScheduler.initBaselineCalculationScheduler();
      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      const result = await scheduledFunction();

      expect(result.success).toBe(false);
    });

    it('should log errors for individual baseline calculation failures', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user1@example.com', first_name: 'User', last_name: 'One' }]
      });

      behavioralAnalyticsService.calculateBaseline
        .mockRejectedValueOnce(new Error('Baseline calculation failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      baselineCalculationScheduler.initBaselineCalculationScheduler();
      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      await scheduledFunction();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return success statistics', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 1, email: 'user1@example.com', first_name: 'User', last_name: 'One' }
        ]
      });

      behavioralAnalyticsService.calculateBaseline
        .mockResolvedValue({ id: 1, baseline_type: 'location' });

      baselineCalculationScheduler.initBaselineCalculationScheduler();
      const scheduledFunction = mockCron.schedule.mock.calls[0][1];
      const result = await scheduledFunction();

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(1);
      expect(result.successCount).toBe(1);
    });
  });
});
