import apiClient from '../config/axios.js';

/**
 * Guideline Service
 * Handles API calls for clinical guidelines
 */
export const guidelineService = {
  // Get applicable guidelines for a patient
  getPatientGuidelines: async (patientId) => {
    try {
      const response = await apiClient.get(`/guidelines/patient/${patientId}`);
      return {
        success: true,
        data: response.data.data.guidelines || []
      };
    } catch (error) {
      console.error('Error fetching patient guidelines:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch guidelines',
        data: []
      };
    }
  },

  // Get guidelines by category
  getGuidelinesByCategory: async (category) => {
    try {
      const response = await apiClient.get(`/guidelines/category/${category}`);
      return {
        success: true,
        data: response.data.data.guidelines || []
      };
    } catch (error) {
      console.error('Error fetching guidelines by category:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch guidelines',
        data: []
      };
    }
  },

  // Validate pathway transition
  validatePathway: async (patientId, fromPathway, toPathway) => {
    try {
      const response = await apiClient.post('/guidelines/validate-pathway', {
        patientId,
        fromPathway,
        toPathway
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error validating pathway:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to validate pathway',
        data: {
          isValid: true, // Default to valid on error
          errors: [],
          warnings: [],
          requiredActions: []
        }
      };
    }
  },

  // Check pathway compliance
  checkPathwayCompliance: async (patientId, fromPathway, toPathway) => {
    try {
      const response = await apiClient.post('/guidelines/check-pathway-compliance', {
        patientId,
        fromPathway,
        toPathway
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error checking pathway compliance:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check compliance',
        data: {
          isCompliant: true,
          errors: [],
          warnings: [],
          requiredActions: []
        }
      };
    }
  },

  // Check investigation compliance
  checkInvestigationCompliance: async (patientId, investigationType, investigationName) => {
    try {
      const response = await apiClient.post('/guidelines/check-investigation-compliance', {
        patientId,
        investigationType,
        investigationName
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error checking investigation compliance:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to check compliance',
        data: {
          isCompliant: true,
          errors: [],
          warnings: [],
          recommendations: []
        }
      };
    }
  }
};






