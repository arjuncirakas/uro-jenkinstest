import { describe, it, expect, vi, beforeEach } from 'vitest';
import behavioralAnalyticsService from '../behavioralAnalyticsService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('behavioralAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBaselines', () => {
    it('should fetch baselines successfully with userId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, user_id: 1, baseline_type: 'location', baseline_data: {} }
          ]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.getBaselines(1);

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/behavioral-analytics/baselines?userId=1');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fetch baselines successfully with email', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, user_id: 1, baseline_type: 'time', baseline_data: {} }
          ]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.getBaselines('user@example.com');

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/behavioral-analytics/baselines?email=user%40example.com');
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch baselines'
          }
        },
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.getBaselines(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch baselines');
      expect(result.data).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const mockError = { message: 'Network error' };
      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.getBaselines(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch baselines');
      consoleSpy.mockRestore();
    });
  });

  describe('getAnomalies', () => {
    it('should fetch anomalies successfully with default filters', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 1, anomaly_type: 'unusual_location', severity: 'medium' }
          ],
          pagination: { total: 1, limit: 50, offset: 0 }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.getAnomalies();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/behavioral-analytics/anomalies?');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [],
          pagination: { total: 0, limit: 10, offset: 0 }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.getAnomalies({
        status: 'new',
        severity: 'high',
        limit: 10,
        offset: 0
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=new')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('severity=high')
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch anomalies'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.getAnomalies();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch anomalies');
      consoleSpy.mockRestore();
    });
  });

  describe('updateAnomalyStatus', () => {
    it('should update anomaly status successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, status: 'reviewed', reviewed_by: 1 }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.updateAnomalyStatus(1, 'reviewed', 1);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/superadmin/behavioral-analytics/anomalies/1',
        { status: 'reviewed', reviewedBy: 1 }
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to update anomaly status'
          }
        }
      };

      apiClient.put.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.updateAnomalyStatus(1, 'reviewed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update anomaly status');
      consoleSpy.mockRestore();
    });
  });

  describe('calculateBaseline', () => {
    it('should calculate baseline successfully with userId', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 1, user_id: 1, baseline_type: 'time', baseline_data: {} },
          message: 'Baseline calculated successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.calculateBaseline(1, 'time');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/superadmin/behavioral-analytics/baselines/calculate',
        { userId: 1, baselineType: 'time' }
      );
      expect(result.success).toBe(true);
    });

    it('should calculate baseline successfully with email', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: 2, user_id: 1, baseline_type: 'location', baseline_data: {} }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.calculateBaseline('user@example.com', 'location');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/superadmin/behavioral-analytics/baselines/calculate',
        { email: 'user@example.com', baselineType: 'location' }
      );
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to calculate baseline'
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.calculateBaseline(1, 'time');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to calculate baseline');
      consoleSpy.mockRestore();
    });
  });

  describe('getStatistics', () => {
    it('should fetch statistics successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            total: 100,
            byStatus: { new: 50, reviewed: 30, dismissed: 20 },
            bySeverity: { high: 10, medium: 40, low: 50 },
            byType: { unusual_location: 60, unusual_time: 30, unusual_access: 10 },
            recent: 15
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await behavioralAnalyticsService.getStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/behavioral-analytics/statistics');
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(100);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch statistics'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await behavioralAnalyticsService.getStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch statistics');
      consoleSpy.mockRestore();
    });
  });
});
