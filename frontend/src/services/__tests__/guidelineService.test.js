import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guidelineService } from '../guidelineService';
import apiClient from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('guidelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getPatientGuidelines', () => {
    it('should fetch patient guidelines successfully', async () => {
      const mockGuidelines = [
        { id: 1, name: 'PSA Screening', category: 'screening' }
      ];
      apiClient.get.mockResolvedValue({
        data: {
          data: {
            guidelines: mockGuidelines
          }
        }
      });

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGuidelines);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/patient/123');
    });

    it('should return empty array when guidelines are missing', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: {}
        }
      });

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty array when data.data is null', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: null
        }
      });

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      apiClient.get.mockRejectedValue({
        response: {
          data: {
            message: 'Patient not found'
          }
        }
      });

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(result.data).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch guidelines');
      expect(result.data).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle errors without response data', async () => {
      apiClient.get.mockRejectedValue({
        message: 'Request failed'
      });

      const result = await guidelineService.getPatientGuidelines(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch guidelines');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getGuidelinesByCategory', () => {
    it('should fetch guidelines by category successfully', async () => {
      const mockGuidelines = [
        { id: 1, name: 'PSA Screening', category: 'screening' }
      ];
      apiClient.get.mockResolvedValue({
        data: {
          data: {
            guidelines: mockGuidelines
          }
        }
      });

      const result = await guidelineService.getGuidelinesByCategory('screening');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGuidelines);
      expect(apiClient.get).toHaveBeenCalledWith('/guidelines/category/screening');
    });

    it('should return empty array when guidelines are missing', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          data: {}
        }
      });

      const result = await guidelineService.getGuidelinesByCategory('screening');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      apiClient.get.mockRejectedValue({
        response: {
          data: {
            message: 'Category not found'
          }
        }
      });

      const result = await guidelineService.getGuidelinesByCategory('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Category not found');
      expect(result.data).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      apiClient.get.mockRejectedValue(new Error('Network error'));

      const result = await guidelineService.getGuidelinesByCategory('screening');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch guidelines');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validatePathway', () => {
    it('should validate pathway transition successfully', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        requiredActions: []
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockValidation
        }
      });

      const result = await guidelineService.validatePathway(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockValidation);
      expect(apiClient.post).toHaveBeenCalledWith('/guidelines/validate-pathway', {
        patientId: 123,
        fromPathway: 'Active Monitoring',
        toPathway: 'Surgery'
      });
    });

    it('should handle validation errors', async () => {
      const mockValidation = {
        isValid: false,
        errors: ['Missing required tests'],
        warnings: [],
        requiredActions: ['Complete PSA test']
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockValidation
        }
      });

      const result = await guidelineService.validatePathway(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors).toContain('Missing required tests');
    });

    it('should handle API errors gracefully', async () => {
      apiClient.post.mockRejectedValue({
        response: {
          data: {
            message: 'Patient not found'
          }
        }
      });

      const result = await guidelineService.validatePathway(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(result.data.isValid).toBe(true); // Default to valid on error
      expect(result.data.errors).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      apiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await guidelineService.validatePathway(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to validate pathway');
      expect(result.data.isValid).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle null/undefined parameters', async () => {
      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        requiredActions: []
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockValidation
        }
      });

      await guidelineService.validatePathway(null, null, null);

      expect(apiClient.post).toHaveBeenCalledWith('/guidelines/validate-pathway', {
        patientId: null,
        fromPathway: null,
        toPathway: null
      });
    });
  });

  describe('checkPathwayCompliance', () => {
    it('should check pathway compliance successfully', async () => {
      const mockCompliance = {
        isCompliant: true,
        errors: [],
        warnings: [],
        requiredActions: []
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockCompliance
        }
      });

      const result = await guidelineService.checkPathwayCompliance(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompliance);
      expect(apiClient.post).toHaveBeenCalledWith('/guidelines/check-pathway-compliance', {
        patientId: 123,
        fromPathway: 'Active Monitoring',
        toPathway: 'Surgery'
      });
    });

    it('should handle non-compliant pathways', async () => {
      const mockCompliance = {
        isCompliant: false,
        errors: ['Missing required documentation'],
        warnings: ['Consider additional tests'],
        requiredActions: ['Complete documentation']
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockCompliance
        }
      });

      const result = await guidelineService.checkPathwayCompliance(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(true);
      expect(result.data.isCompliant).toBe(false);
      expect(result.data.errors).toContain('Missing required documentation');
    });

    it('should handle API errors gracefully', async () => {
      apiClient.post.mockRejectedValue({
        response: {
          data: {
            message: 'Patient not found'
          }
        }
      });

      const result = await guidelineService.checkPathwayCompliance(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(result.data.isCompliant).toBe(true); // Default to compliant on error
      expect(result.data.errors).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      apiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await guidelineService.checkPathwayCompliance(123, 'Active Monitoring', 'Surgery');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check compliance');
      expect(result.data.isCompliant).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('checkInvestigationCompliance', () => {
    it('should check investigation compliance successfully', async () => {
      const mockCompliance = {
        isCompliant: true,
        errors: [],
        warnings: [],
        recommendations: []
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockCompliance
        }
      });

      const result = await guidelineService.checkInvestigationCompliance(123, 'PSA', 'PSA Test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCompliance);
      expect(apiClient.post).toHaveBeenCalledWith('/guidelines/check-investigation-compliance', {
        patientId: 123,
        investigationType: 'PSA',
        investigationName: 'PSA Test'
      });
    });

    it('should handle non-compliant investigations', async () => {
      const mockCompliance = {
        isCompliant: false,
        errors: ['Test not recommended'],
        warnings: ['Consider alternative test'],
        recommendations: ['Use different investigation']
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockCompliance
        }
      });

      const result = await guidelineService.checkInvestigationCompliance(123, 'PSA', 'PSA Test');

      expect(result.success).toBe(true);
      expect(result.data.isCompliant).toBe(false);
      expect(result.data.errors).toContain('Test not recommended');
    });

    it('should handle API errors gracefully', async () => {
      apiClient.post.mockRejectedValue({
        response: {
          data: {
            message: 'Investigation not found'
          }
        }
      });

      const result = await guidelineService.checkInvestigationCompliance(123, 'PSA', 'PSA Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Investigation not found');
      expect(result.data.isCompliant).toBe(true); // Default to compliant on error
      expect(result.data.errors).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      apiClient.post.mockRejectedValue(new Error('Network error'));

      const result = await guidelineService.checkInvestigationCompliance(123, 'PSA', 'PSA Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check compliance');
      expect(result.data.isCompliant).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle null/undefined parameters', async () => {
      const mockCompliance = {
        isCompliant: true,
        errors: [],
        warnings: [],
        recommendations: []
      };
      apiClient.post.mockResolvedValue({
        data: {
          data: mockCompliance
        }
      });

      await guidelineService.checkInvestigationCompliance(null, null, null);

      expect(apiClient.post).toHaveBeenCalledWith('/guidelines/check-investigation-compliance', {
        patientId: null,
        investigationType: null,
        investigationName: null
      });
    });
  });
});
