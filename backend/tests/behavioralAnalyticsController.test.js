/**
 * Tests for behavioral analytics controller
 * 100% coverage required
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock services
const mockBehavioralAnalyticsService = {
  getUserBaselines: jest.fn(),
  getAnomalies: jest.fn(),
  updateAnomalyStatus: jest.fn(),
  calculateBaseline: jest.fn(),
  getAnomalyStatistics: jest.fn()
};

jest.unstable_mockModule('../services/behavioralAnalyticsService.js', () => ({
  getUserBaselines: mockBehavioralAnalyticsService.getUserBaselines,
  getAnomalies: mockBehavioralAnalyticsService.getAnomalies,
  updateAnomalyStatus: mockBehavioralAnalyticsService.updateAnomalyStatus,
  calculateBaseline: mockBehavioralAnalyticsService.calculateBaseline,
  getAnomalyStatistics: mockBehavioralAnalyticsService.getAnomalyStatistics
}));

describe('Behavioral Analytics Controller', () => {
  let behavioralAnalyticsController;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    behavioralAnalyticsController = await import('../controllers/behavioralAnalyticsController.js');
    
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 1, email: 'admin@example.com', role: 'superadmin' }
    };
    
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBaselines', () => {
    it('should return 400 when userId is missing', async () => {
      mockReq.query = {};

      await behavioralAnalyticsController.getBaselines(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'userId query parameter is required'
      });
    });

    it('should return baselines successfully', async () => {
      mockReq.query = { userId: '1' };
      mockBehavioralAnalyticsService.getUserBaselines.mockResolvedValueOnce([
        { id: 1, user_id: 1, baseline_type: 'location', baseline_data: {} }
      ]);

      await behavioralAnalyticsController.getBaselines(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, user_id: 1, baseline_type: 'location', baseline_data: {} }]
      });
    });

    it('should handle service errors', async () => {
      mockReq.query = { userId: '1' };
      mockBehavioralAnalyticsService.getUserBaselines.mockRejectedValueOnce(new Error('Service error'));

      await behavioralAnalyticsController.getBaselines(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed to retrieve baselines'
        })
      );
    });
  });

  describe('getAnomaliesController', () => {
    it('should return anomalies with default filters', async () => {
      mockBehavioralAnalyticsService.getAnomalies.mockResolvedValueOnce({
        anomalies: [{ id: 1, anomaly_type: 'unusual_location', severity: 'medium' }],
        total: 1,
        limit: 50,
        offset: 0
      });

      await behavioralAnalyticsController.getAnomaliesController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, anomaly_type: 'unusual_location', severity: 'medium' }],
        pagination: { total: 1, limit: 50, offset: 0 }
      });
    });

    it('should apply filters from query', async () => {
      mockReq.query = { status: 'new', severity: 'high', limit: '10', offset: '0' };
      mockBehavioralAnalyticsService.getAnomalies.mockResolvedValueOnce({
        anomalies: [],
        total: 0,
        limit: 10,
        offset: 0
      });

      await behavioralAnalyticsController.getAnomaliesController(mockReq, mockRes);

      expect(mockBehavioralAnalyticsService.getAnomalies).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
          severity: 'high',
          limit: 10,
          offset: 0
        })
      );
    });

    it('should handle date filters', async () => {
      mockReq.query = { startDate: '2024-01-01', endDate: '2024-01-31' };
      mockBehavioralAnalyticsService.getAnomalies.mockResolvedValueOnce({
        anomalies: [],
        total: 0,
        limit: 50,
        offset: 0
      });

      await behavioralAnalyticsController.getAnomaliesController(mockReq, mockRes);

      expect(mockBehavioralAnalyticsService.getAnomalies).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });

    it('should handle service errors', async () => {
      mockBehavioralAnalyticsService.getAnomalies.mockRejectedValueOnce(new Error('Service error'));

      await behavioralAnalyticsController.getAnomaliesController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateAnomalyStatusController', () => {
    it('should return 400 when status is missing', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {};

      await behavioralAnalyticsController.updateAnomalyStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'status is required'
      });
    });

    it('should update status successfully', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'reviewed', reviewedBy: 1 };
      mockBehavioralAnalyticsService.updateAnomalyStatus.mockResolvedValueOnce({
        id: 1,
        status: 'reviewed',
        reviewed_by: 1
      });

      await behavioralAnalyticsController.updateAnomalyStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, status: 'reviewed', reviewed_by: 1 }
      });
    });

    it('should return 404 when anomaly not found', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'reviewed' };
      mockBehavioralAnalyticsService.updateAnomalyStatus.mockRejectedValueOnce(
        new Error('Anomaly not found')
      );

      await behavioralAnalyticsController.updateAnomalyStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle service errors', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { status: 'reviewed' };
      mockBehavioralAnalyticsService.updateAnomalyStatus.mockRejectedValueOnce(new Error('Service error'));

      await behavioralAnalyticsController.updateAnomalyStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('calculateBaselineController', () => {
    it('should return 400 when userId is missing', async () => {
      mockReq.body = { baselineType: 'time' };

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'userId or email, and baselineType are required'
      });
    });

    it('should return 400 when baselineType is missing', async () => {
      mockReq.body = { userId: 1 };

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when baselineType is invalid', async () => {
      mockReq.body = { userId: 1, baselineType: 'invalid' };

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid baselineType. Must be: location, time, or access_pattern'
      });
    });

    it('should calculate baseline successfully with userId', async () => {
      mockReq.body = { userId: 1, baselineType: 'time' };
      mockBehavioralAnalyticsService.calculateBaseline.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        baseline_type: 'time',
        baseline_data: {}
      });

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, user_id: 1, baseline_type: 'time', baseline_data: {} },
        message: 'Baseline calculated successfully'
      });
    });

    it('should calculate baseline successfully with email', async () => {
      mockReq.body = { email: 'user@example.com', baselineType: 'location' };
      mockBehavioralAnalyticsService.calculateBaseline.mockResolvedValueOnce({
        id: 2,
        user_id: 1,
        baseline_type: 'location',
        baseline_data: {}
      });

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockBehavioralAnalyticsService.calculateBaseline).toHaveBeenCalledWith(
        'user@example.com',
        'location'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 2, user_id: 1, baseline_type: 'location', baseline_data: {} },
        message: 'Baseline calculated successfully'
      });
    });

    it('should handle service errors', async () => {
      mockReq.body = { userId: 1, baselineType: 'time' };
      mockBehavioralAnalyticsService.calculateBaseline.mockRejectedValueOnce(new Error('Service error'));

      await behavioralAnalyticsController.calculateBaselineController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics successfully', async () => {
      mockBehavioralAnalyticsService.getAnomalyStatistics.mockResolvedValueOnce({
        total: 100,
        byStatus: { new: 50, reviewed: 30, dismissed: 20 },
        bySeverity: { high: 10, medium: 40, low: 50 },
        byType: { unusual_location: 60, unusual_time: 30, unusual_access: 10 },
        recent: 15
      });

      await behavioralAnalyticsController.getStatistics(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 100,
          byStatus: { new: 50, reviewed: 30, dismissed: 20 },
          bySeverity: { high: 10, medium: 40, low: 50 },
          byType: { unusual_location: 60, unusual_time: 30, unusual_access: 10 },
          recent: 15
        }
      });
    });

    it('should handle service errors', async () => {
      mockBehavioralAnalyticsService.getAnomalyStatistics.mockRejectedValueOnce(new Error('Service error'));

      await behavioralAnalyticsController.getStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
