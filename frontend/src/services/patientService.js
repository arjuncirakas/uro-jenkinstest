import apiClient from '../config/axios.js';

// Patient API service
export const patientService = {
  // Add new patient
  addPatient: async (patientData) => {
    try {
      const response = await apiClient.post('/patients', patientData);
      return {
        success: true,
        data: response.data.data.patient,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error adding patient:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add patient',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get patients assigned to current doctor with optional category
  getAssignedPatients: async (category = 'all', params = {}) => {
    try {
      const response = await apiClient.get('/patients/assigned', { params: { category, ...params } });
      return {
        success: true,
        data: response.data.data.patients,
        count: response.data.data.count
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch assigned patients'
      };
    }
  },

  // Update patient care pathway
  updatePatientPathway: async (patientId, payload) => {
    try {
      const response = await apiClient.put(`/patients/${patientId}/pathway`, payload);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update patient pathway'
      };
    }
  },

  // Get all patients
  getPatients: async (params = {}) => {
    console.log('🔍 patientService: getPatients called with params:', params);
    try {
      const response = await apiClient.get('/patients/list', { params });
      console.log('🔍 patientService: getPatients response:', response);
      console.log('🔍 patientService: response.data:', response.data);
      console.log('🔍 patientService: response.data.data:', response.data.data);
      return {
        success: true,
        data: response.data.data.patients, // Access the patients array from the nested structure
        pagination: response.data.data.pagination, // Include pagination info
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ patientService: Error fetching patients:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch patients',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get new patients
  getNewPatients: async (params = {}) => {
    try {
      const response = await apiClient.get('/patients/new', { params });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching new patients:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch new patients',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get patient by ID
  getPatientById: async (patientId) => {
    try {
      const response = await apiClient.get(`/patients/${patientId}`);
      return {
        success: true,
        data: response.data.data.patient,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching patient:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch patient',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Update patient
  updatePatient: async (patientId, updateData) => {
    try {
      const response = await apiClient.put(`/patients/${patientId}`, updateData);
      return {
        success: true,
        data: response.data.data.patient,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating patient:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update patient',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Delete patient (soft delete)
  deletePatient: async (patientId) => {
    try {
      const response = await apiClient.delete(`/patients/${patientId}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting patient:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete patient',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get all patients without search parameters
  getAllPatients: async () => {
    console.log('🔍 patientService: getAllPatients called');
    try {
      const response = await apiClient.get('/patients/list');
      console.log('🔍 patientService: getAllPatients response:', response);
      console.log('🔍 patientService: response.data:', response.data);
      console.log('🔍 patientService: response.data.data:', response.data.data);
      return {
        success: true,
        data: response.data.data.patients, // Access the patients array from the nested structure
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ patientService: Error fetching all patients:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch all patients',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get API info
  getApiInfo: async () => {
    try {
      const response = await apiClient.get('/patients');
      return {
        success: true,
        data: response.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching API info:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch API info',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get patients due for review (7-14 days window)
  getPatientsDueForReview: async () => {
    console.log('🔍 patientService: getPatientsDueForReview called');
    try {
      const response = await apiClient.get('/patients/due-for-review');
      console.log('🔍 patientService: getPatientsDueForReview response:', response);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ patientService: Error fetching patients due for review:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch patients due for review',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Search patients (autocomplete)
  searchPatients: async (query, limit = 10) => {
    if (!query || query.trim().length < 1) {
      return {
        success: true,
        data: [],
        message: 'Query too short'
      };
    }

    try {
      const response = await apiClient.get('/patients/search', {
        params: { query: query.trim(), limit }
      });
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('Error searching patients:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search patients',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get MDT meetings for a patient
  getPatientMDTMeetings: async (patientId) => {
    try {
      const response = await apiClient.get(`/patients/${patientId}/mdt`);
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching MDT meetings:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch MDT meetings',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Get discharge summary for a patient
  getDischargeSummary: async (patientId) => {
    try {
      const response = await apiClient.get(`/patients/${patientId}/discharge-summary`);
      return {
        success: true,
        data: response.data.data || null,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching discharge summary:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch discharge summary',
        details: error.response?.data?.errors || null
      };
    }
  },

  // Create discharge summary for a patient
  createDischargeSummary: async (patientId, dischargeSummaryData) => {
    try {
      const response = await apiClient.post(`/patients/${patientId}/discharge-summary`, dischargeSummaryData);
      return {
        success: true,
        data: response.data.data || null,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating discharge summary:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create discharge summary',
        details: error.response?.data?.errors || null
      };
    }
  }
};

export default patientService;
