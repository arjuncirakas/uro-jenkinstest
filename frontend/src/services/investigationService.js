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

  // Delete investigation request
  deleteInvestigationRequest: async (requestId) => {
    try {
      const response = await apiClient.delete(`/investigation-requests/${requestId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting investigation request:', error);
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
      
      // Construct the full URL for debugging
      const baseURL = import.meta.env.VITE_API_URL || 'https://uroprep.ahimsa.global/api';
      const fullURL = `${baseURL}/investigations/files/${filePath}`;
      console.log('🔍 Full file URL:', fullURL);
      console.log('🔍 You can test this URL directly in your browser (with authentication)');
      
      try {
        // Check if token exists before making request
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('❌ No access token found in localStorage');
          alert('You must be logged in to view files. Please log in and try again.');
          return;
        }
        console.log('✅ Access token found, length:', token.length);
        
        // Fetch the file with proper authentication and MIME type
        // Note: The route is /api/investigations/files/:filePath(*) which handles paths with slashes
        // The filePath from database is like "uploads/investigations/testFile-xxx.png"
        // We need to pass it to the correct endpoint
        console.log('📤 Making request to:', `/investigations/files/${filePath}`);
        const response = await apiClient.get(`/investigations/files/${filePath}`, {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${token}` // Explicitly set header
          }
        });
        
        console.log('File fetched successfully');
        console.log('Response headers:', response.headers);
        
        // Get the content type from response headers (try multiple ways to access it)
        let contentType = response.headers['content-type'] || 
                         response.headers['Content-Type'] || 
                         response.headers.contentType || 
                         'application/octet-stream';
        console.log('Content type:', contentType);
        
        // Get file name from path
        const fileName = filePath.split('/').pop() || 'file';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        // Fallback: determine content type from file extension if header is missing or generic
        if (!contentType || contentType === 'application/octet-stream') {
          const extensionMimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          };
          contentType = extensionMimeTypes[fileExtension] || contentType;
          console.log('Content type from extension:', contentType);
        }
        
        // Normalize content type (remove any charset or other parameters)
        contentType = contentType.split(';')[0].trim();
        console.log('Normalized content type:', contentType);
        
        // Check file extension to determine if it's an image (fallback if content-type is wrong)
        const isImageByExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension);
        const isImageByContentType = contentType.startsWith('image/');
        const isImage = isImageByContentType || isImageByExtension;
        
        console.log('File extension:', fileExtension);
        console.log('Is image by extension:', isImageByExtension);
        console.log('Is image by content type:', isImageByContentType);
        console.log('Is image:', isImage);
        
        // If content type is wrong but file extension suggests it's an image, fix the content type
        if (isImageByExtension && !isImageByContentType) {
          console.log('⚠️ Content type is wrong, but file extension suggests image. Fixing content type...');
          const extensionMimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp'
          };
          contentType = extensionMimeTypes[fileExtension] || contentType;
          console.log('Fixed content type:', contentType);
        }
        
        // Create blob with proper MIME type
        const blob = new Blob([response.data], { type: contentType });
        
        // Create object URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl);
        
        // Determine how to display based on content type or file extension
        if (isImage) {
          console.log('✅ Detected as image, opening in modal...');
          // For images, convert blob to data URL and trigger modal display
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const dataUrl = reader.result;
              console.log('✅ Image converted to data URL, dispatching viewImage event');
              
              // Dispatch custom event to open image in modal
              // Components listening to this event will show the ImageViewerModal
              const imageViewEvent = new CustomEvent('viewImage', {
                detail: {
                  imageUrl: dataUrl,
                  fileName: fileName,
                  blobUrl: blobUrl // Keep blob URL as fallback
                },
                bubbles: true
              });
              window.dispatchEvent(imageViewEvent);
              console.log('✅ viewImage event dispatched');
              
              // Clean up blob URL after a delay (keep it for modal display)
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 300000); // 5 minutes - enough time for modal viewing
            } catch (error) {
              console.error('❌ Error creating image viewer:', error);
              alert('Error displaying image. Please try again.');
            }
          };
          reader.onerror = (error) => {
            console.error('❌ Error reading image file:', error);
            alert('Error reading image file. Please try again.');
          };
          reader.readAsDataURL(blob);
          return; // IMPORTANT: Return early to prevent opening new window
        } else if (contentType === 'application/pdf') {
          // For PDFs, create an HTML page with embedded PDF viewer
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${fileName}</title>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  height: 100vh;
                  overflow: hidden;
                }
                iframe {
                  width: 100%;
                  height: 100vh;
                  border: none;
                }
              </style>
            </head>
            <body>
              <iframe src="${blobUrl}" type="application/pdf"></iframe>
            </body>
            </html>
          `;
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const htmlBlobUrl = URL.createObjectURL(htmlBlob);
          window.open(htmlBlobUrl, '_blank');
          
          // Clean up HTML blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(htmlBlobUrl);
          }, 1000);
        } else {
          // For other file types (DOC, DOCX, etc.), open blob URL directly or download
          const newWindow = window.open(blobUrl, '_blank');
          
          // Check if popup was blocked
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // Fallback: create a download link if popup was blocked
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
        
        // Clean up the blob URL after a delay (longer for viewing)
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 120000); // Keep it longer for viewing (2 minutes)
        
      } catch (error) {
        console.error('Error fetching file:', error);
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          url: fullURL
        });
        
        // Check if it's an authentication error
        if (error.response?.status === 401) {
          console.error('❌ Authentication error: Token may be expired or missing');
          console.error('Please ensure you are logged in and try again');
          
          // Show user-friendly error message
          alert('Unable to view file: Authentication required. Please ensure you are logged in and try again.');
          return;
        }
        
        // Check if it's a 404 error
        if (error.response?.status === 404) {
          console.error('❌ File not found:', fullURL);
          alert('File not found. The file may have been deleted or moved.');
          return;
        }
        
        // Check if it's a CORS error
        if (error.message?.includes('CORS') || error.code === 'ERR_NETWORK') {
          console.error('❌ CORS or network error');
          alert('Unable to load file due to network error. Please check your connection and try again.');
          return;
        }
        
        // Generic error
        alert(`Unable to open file: ${error.response?.data?.message || error.message}`);
        console.error('Unable to open file:', error.message);
      }
    } else {
      console.error('No file path provided');
    }
  }
};
