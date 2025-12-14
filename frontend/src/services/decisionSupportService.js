import apiClient from '../config/axios.js';

/**
 * Decision Support Service
 * Handles API calls for decision support recommendations
 */
export const decisionSupportService = {
  // Get decision support recommendations for a patient
  getRecommendations: async (patientId) => {
    try {
      const response = await apiClient.get(`/guidelines/recommendations/${patientId}`);
      return {
        success: true,
        data: response.data.data || {
          recommendations: [],
          riskScore: null
        }
      };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch recommendations',
        data: {
          recommendations: [],
          riskScore: null
        }
      };
    }
  }
};






