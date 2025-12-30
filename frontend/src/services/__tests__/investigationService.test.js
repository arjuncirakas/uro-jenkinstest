/**
 * Tests for investigationService.js
 * Ensures basic service functionality and coverage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { investigationService } from '../investigationService';
import apiClient from '../../config/axios';

// Mock apiClient
vi.mock('../../config/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('investigationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addPSAResult', () => {
    it('should add PSA result successfully', async () => {
      const patientId = 1;
      const psaData = {
        result: '3.5',
        testDate: '2024-01-01'
      };

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: patientId, ...psaData }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await investigationService.addPSAResult(patientId, psaData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/patients/${patientId}/psa-results`,
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors when adding PSA result', async () => {
      const patientId = 1;
      const psaData = { result: '3.5' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to add PSA result'
          }
        },
        message: 'Network error'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await investigationService.addPSAResult(patientId, psaData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add PSA result');
    });
  });

  describe('addOtherTestResult', () => {
    it('should add other test result successfully', async () => {
      const patientId = 1;
      const testData = {
        testName: 'MRI',
        testDate: '2024-01-01',
        result: 'Normal'
      };

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: patientId, ...testData }
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await investigationService.addOtherTestResult(patientId, testData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/patients/${patientId}/test-results`,
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors when adding other test result', async () => {
      const patientId = 1;
      const testData = { testName: 'MRI' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to add test result'
          }
        },
        message: 'Network error'
      };

      apiClient.post.mockRejectedValue(mockError);

      const result = await investigationService.addOtherTestResult(patientId, testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add test result');
    });
  });

  describe('getInvestigationResults', () => {
    it('should fetch investigation results successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: [{ id: 1, testName: 'PSA', result: '3.5' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await investigationService.getInvestigationResults(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/patients/${patientId}/investigations`,
        { params: {} }
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors when fetching investigation results', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch results'
          }
        },
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await investigationService.getInvestigationResults(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch results');
    });
  });
});
