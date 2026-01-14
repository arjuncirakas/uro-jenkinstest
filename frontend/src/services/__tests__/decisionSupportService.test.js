import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decisionSupportService } from '../decisionSupportService';
import apiClient from '../../config/axios';

// Mock axios
vi.mock('../../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('decisionSupportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should fetch recommendations successfully', async () => {
      const mockRecommendations = {
        recommendations: [
          { id: 1, type: 'screening', text: 'Recommend PSA test' }
        ],
        riskScore: 0.75
      };

      apiClient.get.mockResolvedValue({
        data: {
          data: mockRecommendations
        }
      });

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecommendations);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/recommendations/123');
    });

    it('should return empty recommendations when data is missing', async () => {
      apiClient.get.mockResolvedValue({
        data: {}
      });

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        recommendations: [],
        riskScore: null
      });
    });

    it('should return empty recommendations when data.data is null', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: null
        }
      });

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        recommendations: [],
        riskScore: null
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      apiClient.get.mockRejectedValue({
        response: {
          data: {
            message: 'Patient not found'
          }
        }
      });

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(result.data).toEqual({
        recommendations: [],
        riskScore: null
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch recommendations');
      expect(result.data).toEqual({
        recommendations: [],
        riskScore: null
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      apiClient.get.mockRejectedValue({
        message: 'Request failed'
      });

      const result = await decisionSupportService.getRecommendations(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch recommendations');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle null patientId', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: {
            recommendations: [],
            riskScore: null
          }
        }
      });

      const result = await decisionSupportService.getRecommendations(null);

      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/recommendations/null');
    });

    it('should handle undefined patientId', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: {
            recommendations: [],
            riskScore: null
          }
        }
      });

      const result = await decisionSupportService.getRecommendations(undefined);

      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/recommendations/undefined');
    });

    it('should handle empty string patientId', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: {
            recommendations: [],
            riskScore: null
          }
        }
      });

      const result = await decisionSupportService.getRecommendations('');

      expect(result.success).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/recommendations/');
    });
  });
});
