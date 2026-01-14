import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GuidelineRecommendations from '../GuidelineRecommendations';
import { guidelineService } from '../../services/guidelineService';

// Mock dependencies
vi.mock('../../services/guidelineService', () => ({
  guidelineService: {
    getPatientGuidelines: vi.fn()
  }
}));

describe('GuidelineRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guidelineService.getPatientGuidelines.mockResolvedValue({
      success: true,
      data: []
    });
  });

  describe('Rendering', () => {
    it('should render guidelines component', () => {
      render(<GuidelineRecommendations patientId={1} />);
      expect(screen.getByText(/applicable guidelines/i)).toBeInTheDocument();
    });

    it('should not fetch when patientId is null', () => {
      render(<GuidelineRecommendations patientId={null} />);
      expect(guidelineService.getPatientGuidelines).not.toHaveBeenCalled();
    });

    it('should not fetch when patientId is undefined', () => {
      render(<GuidelineRecommendations patientId={undefined} />);
      expect(guidelineService.getPatientGuidelines).not.toHaveBeenCalled();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch guidelines when patientId is provided', async () => {
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(guidelineService.getPatientGuidelines).toHaveBeenCalledWith(1);
      });
    });

    it('should display guidelines', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'PSA Testing Guidelines',
          version: '2024',
          category: 'Screening',
          evidenceLevel: 'A',
          recommendations: ['Test annually', 'Follow-up if elevated']
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('PSA Testing Guidelines')).toBeInTheDocument();
        expect(screen.getByText('Test annually')).toBeInTheDocument();
      });
    });

    it('should display guideline count', async () => {
      const mockGuidelines = [
        { id: 1, name: 'Guideline 1' },
        { id: 2, name: 'Guideline 2' }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      guidelineService.getPatientGuidelines.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load guidelines/i)).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no guidelines', async () => {
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no applicable guidelines/i)).toBeInTheDocument();
      });
    });
  });

  describe('Guideline Display', () => {
    it('should display guideline version', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'Test Guideline',
          version: '2024'
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/version 2024/i)).toBeInTheDocument();
      });
    });

    it('should display evidence level', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'Test Guideline',
          evidenceLevel: 'A'
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/level a/i)).toBeInTheDocument();
      });
    });

    it('should display category', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'Test Guideline',
          category: 'Screening'
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('Screening')).toBeInTheDocument();
      });
    });

    it('should display recommendations as array', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'Test Guideline',
          recommendations: ['Recommendation 1', 'Recommendation 2']
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText('Recommendation 1')).toBeInTheDocument();
        expect(screen.getByText('Recommendation 2')).toBeInTheDocument();
      });
    });

    it('should handle recommendations as object', async () => {
      const mockGuidelines = [
        {
          id: 1,
          name: 'Test Guideline',
          recommendations: { key: 'value' }
        }
      ];
      
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: mockGuidelines
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', async () => {
      guidelineService.getPatientGuidelines.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100)));
      
      render(<GuidelineRecommendations patientId={1} />);
      
      // Should show loading spinner
      expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty guidelines array', async () => {
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no applicable guidelines/i)).toBeInTheDocument();
      });
    });

    it('should handle null guidelines data', async () => {
      guidelineService.getPatientGuidelines.mockResolvedValue({
        success: true,
        data: null
      });
      
      render(<GuidelineRecommendations patientId={1} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no applicable guidelines/i)).toBeInTheDocument();
      });
    });
  });
});
