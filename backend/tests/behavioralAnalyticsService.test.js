/**
 * Tests for behavioral analytics service
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

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

describe('Behavioral Analytics Service', () => {
  let behavioralAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    
    behavioralAnalyticsService = await import('../services/behavioralAnalyticsService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateBaseline', () => {
    it('should throw error when userId is missing', async () => {
      await expect(behavioralAnalyticsService.calculateBaseline(null, 'location')).rejects.toThrow('userId and baselineType are required');
    });

    it('should throw error when baselineType is missing', async () => {
      await expect(behavioralAnalyticsService.calculateBaseline(1, null)).rejects.toThrow('userId and baselineType are required');
    });

    it('should throw error when baselineType is invalid', async () => {
      await expect(behavioralAnalyticsService.calculateBaseline(1, 'invalid')).rejects.toThrow('Invalid baselineType');
    });

    it('should calculate location baseline successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { ip_address: '192.168.1.1', count: '10' },
            { ip_address: '192.168.1.2', count: '5' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, baseline_type: 'location', baseline_data: '{}', calculated_at: new Date(), last_updated: new Date() }]
        });

      const result = await behavioralAnalyticsService.calculateBaseline(1, 'location');

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should calculate time baseline successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { hour: 9, count: '20' },
            { hour: 10, count: '15' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, baseline_type: 'time', baseline_data: '{}', calculated_at: new Date(), last_updated: new Date() }]
        });

      const result = await behavioralAnalyticsService.calculateBaseline(1, 'time');

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should calculate access_pattern baseline successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { action: 'login', count: '50' },
            { action: 'view', count: '30' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, baseline_type: 'access_pattern', baseline_data: '{}', calculated_at: new Date(), last_updated: new Date() }]
        });

      const result = await behavioralAnalyticsService.calculateBaseline(1, 'access_pattern');

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(behavioralAnalyticsService.calculateBaseline(1, 'location')).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('detectAnomalies', () => {
    it('should return null when userId is missing', async () => {
      const result = await behavioralAnalyticsService.detectAnomalies(null, {});
      expect(result).toBeNull();
    });

    it('should return null when eventData is missing', async () => {
      const result = await behavioralAnalyticsService.detectAnomalies(1, null);
      expect(result).toBeNull();
    });

    it('should return null when no baseline exists', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.detectAnomalies(1, { ipAddress: '192.168.1.1' });

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should detect location anomaly', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            baseline_type: 'location',
            baseline_data: JSON.stringify({
              commonLocations: [{ ip: '192.168.1.1', frequency: 10 }],
              totalLogins: 15
            })
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, anomaly_type: 'unusual_location', severity: 'medium', details: '{}', detected_at: new Date(), status: 'new' }]
        });

      const result = await behavioralAnalyticsService.detectAnomalies(1, {
        ipAddress: '192.168.1.99',
        timestamp: new Date()
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect time anomaly', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            baseline_type: 'time',
            baseline_data: JSON.stringify({
              commonHours: [9, 10, 11],
              averageHour: 10,
              totalLogins: 20
            })
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, anomaly_type: 'unusual_time', severity: 'low', details: '{}', detected_at: new Date(), status: 'new' }]
        });

      const eventDate = new Date();
      eventDate.setHours(3); // 3 AM - unusual time

      const result = await behavioralAnalyticsService.detectAnomalies(1, {
        timestamp: eventDate
      });

      expect(result).toBeDefined();
    });

    it('should detect access pattern anomaly', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            baseline_type: 'access_pattern',
            baseline_data: JSON.stringify({
              commonActions: [{ action: 'login', frequency: 50 }],
              totalActions: 100
            })
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, anomaly_type: 'unusual_access', severity: 'low', details: '{}', detected_at: new Date(), status: 'new' }]
        });

      const result = await behavioralAnalyticsService.detectAnomalies(1, {
        eventType: 'delete'
      });

      expect(result).toBeDefined();
    });

    it('should handle errors gracefully and return null', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await behavioralAnalyticsService.detectAnomalies(1, { ipAddress: '192.168.1.1' });

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should not flag location anomaly if user has insufficient login history', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          baseline_type: 'location',
          baseline_data: JSON.stringify({
            commonLocations: [{ ip: '192.168.1.1', frequency: 2 }],
            totalLogins: 3
          })
        }]
      });

      const result = await behavioralAnalyticsService.detectAnomalies(1, {
        ipAddress: '192.168.1.99',
        timestamp: new Date()
      });

      expect(result).toBeNull();
    });
  });

  describe('getUserBaselines', () => {
    it('should throw error when userId is missing', async () => {
      await expect(behavioralAnalyticsService.getUserBaselines(null)).rejects.toThrow('userId is required');
    });

    it('should return baselines successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: 1, user_id: 1, baseline_type: 'location', baseline_data: '{}', calculated_at: new Date(), last_updated: new Date() },
          { id: 2, user_id: 1, baseline_type: 'time', baseline_data: '{}', calculated_at: new Date(), last_updated: new Date() }
        ]
      });

      const result = await behavioralAnalyticsService.getUserBaselines(1);

      expect(result).toHaveLength(2);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(behavioralAnalyticsService.getUserBaselines(1)).rejects.toThrow('Database error');
    });
  });

  describe('getAnomalies', () => {
    it('should return anomalies with default filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, user_id: 1, anomaly_type: 'unusual_location', severity: 'medium', details: '{}', detected_at: new Date(), status: 'new' }
          ]
        });

      const result = await behavioralAnalyticsService.getAnomalies();

      expect(result.anomalies).toBeDefined();
      expect(result.total).toBe(10);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.getAnomalies({ status: 'new' });

      expect(result.total).toBe(5);
    });

    it('should apply severity filter', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.getAnomalies({ severity: 'high' });

      expect(result.total).toBe(3);
    });

    it('should apply userId filter', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.getAnomalies({ userId: 1 });

      expect(result.total).toBe(2);
    });

    it('should apply date range filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.getAnomalies({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      });

      expect(result.total).toBe(1);
    });

    it('should handle pagination', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await behavioralAnalyticsService.getAnomalies({ limit: 10, offset: 20 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(behavioralAnalyticsService.getAnomalies()).rejects.toThrow('Database error');
    });
  });

  describe('updateAnomalyStatus', () => {
    it('should throw error when anomalyId is missing', async () => {
      await expect(behavioralAnalyticsService.updateAnomalyStatus(null, 'reviewed')).rejects.toThrow('anomalyId and status are required');
    });

    it('should throw error when status is missing', async () => {
      await expect(behavioralAnalyticsService.updateAnomalyStatus(1, null)).rejects.toThrow('anomalyId and status are required');
    });

    it('should throw error when status is invalid', async () => {
      await expect(behavioralAnalyticsService.updateAnomalyStatus(1, 'invalid')).rejects.toThrow('Invalid status');
    });

    it('should update status successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, anomaly_type: 'unusual_location', severity: 'medium', status: 'reviewed', reviewed_by: 2, reviewed_at: new Date() }]
      });

      const result = await behavioralAnalyticsService.updateAnomalyStatus(1, 'reviewed', 2);

      expect(result.status).toBe('reviewed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when anomaly not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(behavioralAnalyticsService.updateAnomalyStatus(999, 'reviewed')).rejects.toThrow('Anomaly not found');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(behavioralAnalyticsService.updateAnomalyStatus(1, 'reviewed')).rejects.toThrow('Database error');
    });
  });

  describe('getAnomalyStatistics', () => {
    it('should return statistics successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({
          rows: [
            { status: 'new', count: '50' },
            { status: 'reviewed', count: '30' },
            { status: 'dismissed', count: '20' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { severity: 'high', count: '10' },
            { severity: 'medium', count: '40' },
            { severity: 'low', count: '50' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { anomaly_type: 'unusual_location', count: '60' },
            { anomaly_type: 'unusual_time', count: '30' },
            { anomaly_type: 'unusual_access', count: '10' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] });

      const result = await behavioralAnalyticsService.getAnomalyStatistics();

      expect(result.total).toBe(100);
      expect(result.byStatus.new).toBe(50);
      expect(result.bySeverity.high).toBe(10);
      expect(result.byType.unusual_location).toBe(60);
      expect(result.recent).toBe(15);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty statistics', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await behavioralAnalyticsService.getAnomalyStatistics();

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.bySeverity).toEqual({});
      expect(result.byType).toEqual({});
      expect(result.recent).toBe(0);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(behavioralAnalyticsService.getAnomalyStatistics()).rejects.toThrow('Database error');
    });
  });
});
