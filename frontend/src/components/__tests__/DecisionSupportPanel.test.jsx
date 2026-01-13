import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import DecisionSupportPanel from '../DecisionSupportPanel';
import { decisionSupportService } from '../../services/decisionSupportService';

// Mock the decision support service
vi.mock('../../services/decisionSupportService', () => ({
  decisionSupportService: {
    getRecommendations: vi.fn()
  }
}));

describe('DecisionSupportPanel', () => {
  const mockGetRecommendations = decisionSupportService.getRecommendations;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGetRecommendations.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<DecisionSupportPanel patientId="123" />);
      
      expect(screen.getByText('Loading recommendations...')).toBeInTheDocument();
    });

    it('should not show loading when patientId is not provided', () => {
      render(<DecisionSupportPanel patientId={null} />);
      
      expect(screen.queryByText('Loading recommendations...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: false,
        error: 'Failed to load recommendations'
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to Load')).toBeInTheDocument();
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
      });
    });

    it('should display error message when exception is thrown', async () => {
      mockGetRecommendations.mockRejectedValue(new Error('Network error'));

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to Load')).toBeInTheDocument();
        expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Loading', () => {
    it('should display recommendations when loaded successfully', async () => {
      const mockRecommendations = [
        {
          id: 1,
          text: 'Test recommendation 1',
          priority: 'high',
          evidenceLevel: 'A',
          type: 'investigation',
          action: 'Schedule MRI',
          guidelineReference: 'NICE Guidelines 2023'
        },
        {
          id: 2,
          text: 'Test recommendation 2',
          priority: 'medium',
          evidenceLevel: 'B',
          type: 'treatment'
        }
      ];

      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: mockRecommendations,
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Test recommendation 1')).toBeInTheDocument();
        expect(screen.getByText('Test recommendation 2')).toBeInTheDocument();
      });
    });

    it('should display risk score when provided', async () => {
      const mockRiskScore = {
        score: 5,
        category: 'Medium Risk'
      };

      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: mockRiskScore
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
        expect(screen.getByText('Medium Risk')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display empty state when no recommendations', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('No recommendations')).toBeInTheDocument();
        expect(screen.getByText('All clinical indicators are within normal range')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Styling', () => {
    it('should apply high priority styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'High priority recommendation',
            priority: 'high'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        const badge = screen.getByText(/High Priority/i);
        expect(badge).toBeInTheDocument();
      });
    });

    it('should apply medium priority styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Medium priority recommendation',
            priority: 'medium'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        const badge = screen.getByText(/Medium Priority/i);
        expect(badge).toBeInTheDocument();
      });
    });

    it('should apply low priority styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Low priority recommendation',
            priority: 'low'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        const badge = screen.getByText(/Low Priority/i);
        expect(badge).toBeInTheDocument();
      });
    });

    it('should apply default styling for unknown priority', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Unknown priority recommendation',
            priority: 'unknown'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        const badge = screen.getByText(/Unknown Priority/i);
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Evidence Level Styling', () => {
    it('should apply level A styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Level A recommendation',
            evidenceLevel: 'A'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Level A')).toBeInTheDocument();
      });
    });

    it('should apply level B styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Level B recommendation',
            evidenceLevel: 'B'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Level B')).toBeInTheDocument();
      });
    });

    it('should apply level C styling', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Level C recommendation',
            evidenceLevel: 'C'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Level C')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Score Display', () => {
    it('should display low risk score (score <= 3)', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: { score: 3, category: 'Low Risk' }
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should display medium risk score (score <= 6)', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: { score: 6, category: 'Medium Risk' }
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
      });
    });

    it('should display high risk score (score > 6)', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: { score: 8, category: 'High Risk' }
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });
  });

  describe('Recommendation Details', () => {
    it('should display recommendation text', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Recommendation text',
            recommendation_text: 'Alternative text'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Recommendation text')).toBeInTheDocument();
      });
    });

    it('should display recommendation_text if text is not available', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            recommendation_text: 'Alternative text format'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Alternative text format')).toBeInTheDocument();
      });
    });

    it('should display action when provided', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Test recommendation',
            action: 'Schedule follow-up'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Action: Schedule follow-up/i)).toBeInTheDocument();
      });
    });

    it('should display guideline reference when provided', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Test recommendation',
            guidelineReference: 'NICE Guidelines 2023'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('NICE Guidelines 2023')).toBeInTheDocument();
      });
    });

    it('should display type when provided', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            id: 1,
            text: 'Test recommendation',
            type: 'investigation'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('investigation')).toBeInTheDocument();
      });
    });
  });

  describe('Recommendation Count', () => {
    it('should display recommendation count badge', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [
            { id: 1, text: 'Rec 1' },
            { id: 2, text: 'Rec 2' },
            { id: 3, text: 'Rec 3' }
          ],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing patientId gracefully', () => {
      render(<DecisionSupportPanel patientId={null} />);
      
      expect(mockGetRecommendations).not.toHaveBeenCalled();
    });

    it('should handle empty recommendations array', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('No recommendations')).toBeInTheDocument();
      });
    });

    it('should handle recommendations without id', async () => {
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: {
          recommendations: [{
            text: 'Recommendation without id'
          }],
          riskScore: null
        }
      });

      render(<DecisionSupportPanel patientId="123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Recommendation without id')).toBeInTheDocument();
      });
    });
  });

  describe('useEffect Dependencies', () => {
    it('should refetch when patientId changes', async () => {
      const { rerender } = render(<DecisionSupportPanel patientId="123" />);
      
      mockGetRecommendations.mockResolvedValue({
        success: true,
        data: { recommendations: [], riskScore: null }
      });

      await waitFor(() => {
        expect(mockGetRecommendations).toHaveBeenCalledWith('123');
      });

      vi.clearAllMocks();

      rerender(<DecisionSupportPanel patientId="456" />);
      
      await waitFor(() => {
        expect(mockGetRecommendations).toHaveBeenCalledWith('456');
      });
    });
  });
});


















