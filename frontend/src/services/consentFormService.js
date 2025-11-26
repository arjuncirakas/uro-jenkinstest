import apiClient from '../config/axios.js';

// Consent Form API service
export const consentFormService = {
  // Get all available consent forms
  getConsentForms: async () => {
    try {
      const response = await apiClient.get('/consent-forms');
      return {
        success: true,
        data: response.data.data?.consentForms || response.data.data || []
      };
    } catch (error) {
      console.error('Error fetching consent forms:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch consent forms',
        data: []
      };
    }
  },

  // Create a new consent form
  createConsentForm: async (formName) => {
    try {
      const response = await apiClient.post('/consent-forms', { name: formName });
      return {
        success: true,
        data: response.data.data?.consentForm || response.data.data
      };
    } catch (error) {
      console.error('Error creating consent form:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create consent form'
      };
    }
  },

  // Upload consent form file for a patient
  uploadConsentForm: async (patientId, consentFormId, file) => {
    try {
      const formData = new FormData();
      formData.append('consentFormId', consentFormId);
      formData.append('file', file);

      const response = await apiClient.post(`/consent-forms/patients/${patientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error uploading consent form:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to upload consent form'
      };
    }
  }
};

