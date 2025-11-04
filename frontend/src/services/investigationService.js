import apiClient from '../config/axios';

export const investigationService = {
  // Add PSA result
  addPSAResult: async (patientId, psaData) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(psaData).forEach(key => {
        if (key !== 'testFile' && psaData[key] !== null && psaData[key] !== undefined) {
          formData.append(key, psaData[key]);
        }
      });
      
      // Add file if present
      if (psaData.testFile) {
        formData.append('testFile', psaData.testFile);
      }

      const response = await apiClient.post(`/patients/${patientId}/psa-results`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error adding PSA result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Add other test result with file upload
  addOtherTestResult: async (patientId, testData) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(testData).forEach(key => {
        if (key !== 'testFile' && testData[key] !== null && testData[key] !== undefined) {
          formData.append(key, testData[key]);
        }
      });
      
      // Add file if present
      if (testData.testFile) {
        formData.append('testFile', testData.testFile);
      }

      const response = await apiClient.post(`/patients/${patientId}/test-results`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error adding test result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get investigation results for a patient
  getInvestigationResults: async (patientId, testType = null) => {
    try {
      const params = testType ? { testType } : {};
      const response = await apiClient.get(`/patients/${patientId}/investigations`, { params });
      console.log('🔍 investigationService: getInvestigationResults response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching investigation results:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Delete investigation result
  deleteInvestigationResult: async (resultId) => {
    try {
      const response = await apiClient.delete(`/investigations/${resultId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting investigation result:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all investigations
  getAllInvestigations: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.testType) params.append('testType', filters.testType);
      if (filters.status) params.append('status', filters.status);
      
      const response = await apiClient.get(`/investigations?${params.toString()}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching all investigations:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Create investigation request
  createInvestigationRequest: async (patientId, requestData) => {
    try {
      const response = await apiClient.post(`/patients/${patientId}/investigation-requests`, requestData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error creating investigation request:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get investigation requests for a patient
  getInvestigationRequests: async (patientId, status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get(`/patients/${patientId}/investigation-requests`, { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching investigation requests:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // View/download investigation file
  viewFile: async (filePath) => {
    if (filePath) {
      console.log('Attempting to view file:', filePath);
      
      try {
        // Fetch the file with proper authentication and MIME type
        const response = await apiClient.get(`/files/${filePath}`, {
          responseType: 'blob'
        });
        
        console.log('File fetched successfully');
        console.log('Response headers:', response.headers);
        
        // Get the content type from response headers
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        console.log('Content type:', contentType);
        
        // Create blob with proper MIME type
        const blob = new Blob([response.data], { type: contentType });
        
        // Create object URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl);
        
        // Create a temporary link element and click it
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 30000); // Keep it longer for viewing
        
      } catch (error) {
        console.error('Error fetching file:', error);
        
        // Fallback: try static file serving
        try {
          const staticUrl = `/uploads/${filePath}`;
          console.log('Falling back to static URL:', staticUrl);
          window.open(staticUrl, '_blank');
        } catch (staticError) {
          console.error('Error with static URL:', staticError);
        }
      }
    } else {
      console.error('No file path provided');
    }
  }
};
