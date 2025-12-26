import apiClient from '../config/axios.js';

export const consentFormService = {
  // Get all consent form templates
  getConsentFormTemplates: async () => {
    try {
      const response = await apiClient.get('/consent-forms/templates');
      return {
        success: true,
        data: response.data.data?.templates || []
      };
    } catch (error) {
      console.error('Error fetching consent form templates:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch consent form templates',
        data: []
      };
    }
  },

  // Create a new consent form template
  createConsentFormTemplate: async (formData) => {
    try {
      const data = new FormData();
      data.append('procedure_name', formData.procedure_name || '');
      data.append('test_name', formData.test_name || '');
      data.append('is_auto_generated', formData.is_auto_generated ? 'true' : 'false');

      if (formData.template_file) {
        data.append('template_file', formData.template_file);
      }

      const response = await apiClient.post('/consent-forms/templates', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return {
        success: true,
        data: response.data.data?.template || response.data.data
      };
    } catch (error) {
      console.error('Error creating consent form template:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create consent form template'
      };
    }
  },

  // Update a consent form template
  updateConsentFormTemplate: async (templateId, formData) => {
    try {
      const data = new FormData();
      data.append('procedure_name', formData.procedure_name || '');
      data.append('test_name', formData.test_name || '');
      data.append('is_auto_generated', formData.is_auto_generated ? 'true' : 'false');

      if (formData.template_file) {
        data.append('template_file', formData.template_file);
      }

      const response = await apiClient.put(`/consent-forms/templates/${templateId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return {
        success: true,
        data: response.data.data?.template || response.data.data
      };
    } catch (error) {
      console.error('Error updating consent form template:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update consent form template'
      };
    }
  },

  // Delete a consent form template
  deleteConsentFormTemplate: async (templateId) => {
    try {
      const response = await apiClient.delete(`/consent-forms/templates/${templateId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error deleting consent form template:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete consent form template'
      };
    }
  },

  // Get patient consent forms
  getPatientConsentForms: async (patientId) => {
    try {
      const response = await apiClient.get(`/consent-forms/patients/${patientId}`);
      return {
        success: true,
        data: response.data.data?.consentForms || []
      };
    } catch (error) {
      console.error('Error fetching patient consent forms:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch patient consent forms',
        data: []
      };
    }
  },

  // Upload patient consent form
  uploadConsentForm: async (patientId, templateId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consentFormId', templateId);

      const response = await apiClient.post(`/consent-forms/patients/${patientId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
  },

  // Get consent form file (for viewing)
  getConsentFormFile: async (filePath) => {
    try {
      // The route uses :filePath(*) which captures the entire path
      // We need to encode each path segment separately to preserve slashes
      // For example: "consent-forms/templates/file.pdf" -> "consent-forms%2Ftemplates%2Ffile.pdf"
      // But Express will decode it, so we encode the whole path
      const encodedPath = encodeURIComponent(filePath);
      
      console.log('Fetching consent form file:', { originalPath: filePath, encodedPath });
      
      const response = await apiClient.get(`/consent-forms/files/${encodedPath}`, {
        responseType: 'blob' // Important: fetch as blob
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching consent form file:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        filePath
      });
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch consent form file'
      };
    }
  }
};
